import type { Request, Response } from 'express';
import { niftyOptionChainService } from '../market/niftyOptionChain.service';
import { angelOneService } from '../brokers/angelOne/angelOne.service';
import { angelOneWebSocketService } from '../market/angelOneWebSocket.service';
import { AngelOneApiError } from '../brokers/angelOne/angelOneHttp';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { isMarketOpen } from '../utils/marketHours';
import type { PlaceOrderRequest, AngelOneOrderType, AngelOneProductType } from '../brokers/angelOne/angelOne.types';

/** User-facing order type names (matches every broker's UI convention) mapped to SmartAPI's real enum values. */
const ORDER_TYPE_MAP: Record<string, AngelOneOrderType> = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  SL: 'STOPLOSS_LIMIT',
  'SL-M': 'STOPLOSS_MARKET',
};

const PRODUCT_TYPE_MAP: Record<string, AngelOneProductType> = {
  INTRADAY: 'INTRADAY',
  CARRYFORWARD: 'CARRYFORWARD',
};

/** Ticks across many subscribed contracts can arrive within milliseconds of each other — this batches them into one chain recompute instead of one per tick. */
const STREAM_THROTTLE_MS = 300;

/**
 * HTTP glue for the real, live NIFTY Option Chain (requirements 2-8) — all
 * real logic (instrument resolution, live ticks, order placement) lives in
 * niftyOptionChainService / angelOneService. Scoped ONLY to NIFTY options.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof AngelOneApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected NIFTY option chain error.';
  sendError(res, message, 500);
}

export const niftyOptionChainController = {
  /** Real, live positions from the connected Angel One account — scoped to NIFTY options only (never BANKNIFTY/FINNIFTY/equity). */
  async getPositions(_req: Request, res: Response): Promise<void> {
    try {
      const positions = await angelOneService.getPositions();
      const niftyOptionPositions = positions.filter(
        (p) => p.exchange === 'NFO' && p.tradingSymbol.startsWith('NIFTY') && !p.tradingSymbol.startsWith('NIFTYNXT'),
      );
      sendSuccess(res, niftyOptionPositions);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getExpiries(_req: Request, res: Response): Promise<void> {
    try {
      const expiries = await niftyOptionChainService.getExpiries();
      sendSuccess(res, expiries);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getChain(req: Request, res: Response): Promise<void> {
    try {
      const expiryIndex = Number(req.query.expiryIndex ?? 0);
      const chain = await niftyOptionChainService.getChain(Number.isFinite(expiryIndex) ? expiryIndex : 0);
      sendSuccess(res, chain);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const strike = Number(req.query.strike);
      const side = req.query.side as 'CE' | 'PE';
      const expiryRaw = String(req.query.expiryRaw ?? '');
      if (!strike || !side || !expiryRaw) {
        sendError(res, 'strike, side, and expiryRaw are all required.', 400);
        return;
      }
      const quote = await niftyOptionChainService.getLiveQuote(expiryRaw, strike, side);
      sendSuccess(res, quote);
    } catch (err) {
      handleError(res, err);
    }
  },

  /**
   * Server-Sent Events stream of the same chain payload getChain() returns —
   * pushed immediately whenever a subscribed token ticks (angelOneWebSocketService's
   * 'tick' event), instead of waiting for the frontend to poll. Reuses the
   * existing cache/service entirely; no new data source.
   */
  async streamChain(req: Request, res: Response): Promise<void> {
    const expiryIndexRaw = Number(req.query.expiryIndex ?? 0);
    const expiryIndex = Number.isFinite(expiryIndexRaw) ? expiryIndexRaw : 0;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let closed = false;
    let sending = false;
    let resendPending = false;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let diagPushLogCount = 0;

    const sendSnapshot = async () => {
      if (closed) return;
      if (sending) { resendPending = true; return; }
      sending = true;
      try {
        const chain = await niftyOptionChainService.getChain(expiryIndex);
        if (!closed) {
          res.write(`data: ${JSON.stringify(chain)}\n\n`);
          // Stage: backend broadcasting to frontend — bounded, first 20 pushes.
          if (diagPushLogCount < 20) {
            diagPushLogCount += 1;
            const atmRow = chain.rows.find((r) => r.strike === chain.atmStrike);
            // eslint-disable-next-line no-console
            console.log('[Pipeline] Frontend Update (SSE push)', {
              expiryIndex, spotPrice: chain.spotPrice,
              atmCallLtp: atmRow?.call.ltp, updatedAt: new Date(chain.updatedAt).toISOString(),
            });
          }
        }
      } catch (err) {
        if (!closed) {
          const message = err instanceof Error ? err.message : 'Live chain stream error.';
          res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        }
      } finally {
        sending = false;
        if (resendPending) {
          resendPending = false;
          void sendSnapshot();
        }
      }
    };

    const onTick = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        void sendSnapshot();
      }, STREAM_THROTTLE_MS);
    };

    angelOneWebSocketService.on('tick', onTick);
    const keepAlive = setInterval(() => {
      if (!closed) res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      closed = true;
      angelOneWebSocketService.off('tick', onTick);
      clearInterval(keepAlive);
      if (throttleTimer) clearTimeout(throttleTimer);
    });

    await sendSnapshot(); // initial snapshot immediately on connect
  },

  async placeOrder(req: Request, res: Response): Promise<void> {
    const requestedAt = Date.now();
    const body = req.body as {
      strike: number; side: 'CE' | 'PE'; expiryRaw: string; quantity: number;
      orderType?: keyof typeof ORDER_TYPE_MAP; productType?: keyof typeof PRODUCT_TYPE_MAP;
      price?: number; triggerPrice?: number;
    };
    const { strike, side, expiryRaw, quantity, price, triggerPrice } = body;
    const orderTypeKey = body.orderType ?? 'MARKET';
    const productTypeKey = body.productType ?? 'INTRADAY';

    // eslint-disable-next-line no-console
    console.log('[Order] Requested', { strike, side, expiryRaw, quantity, orderType: orderTypeKey, productType: productTypeKey });

    try {
      // ── Basic shape validation ──────────────────────────────────────────
      if (!strike || !side || !expiryRaw || !quantity) {
        sendError(res, 'strike, side, expiryRaw, and quantity are all required.', 400);
        return;
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        sendError(res, 'Invalid quantity — must be a positive whole number.', 400);
        return;
      }
      const orderType = ORDER_TYPE_MAP[orderTypeKey];
      if (!orderType) {
        sendError(res, `Unsupported order type "${orderTypeKey}". Use MARKET, LIMIT, SL, or SL-M.`, 400);
        return;
      }
      const productType = PRODUCT_TYPE_MAP[productTypeKey];
      if (!productType) {
        sendError(res, `Unsupported product type "${productTypeKey}". Use INTRADAY or CARRYFORWARD.`, 400);
        return;
      }
      if ((orderType === 'LIMIT' || orderType === 'STOPLOSS_LIMIT') && !(price && price > 0)) {
        sendError(res, `${orderTypeKey} orders require a valid limit price.`, 400);
        return;
      }
      if ((orderType === 'STOPLOSS_LIMIT' || orderType === 'STOPLOSS_MARKET') && !(triggerPrice && triggerPrice > 0)) {
        sendError(res, `${orderTypeKey} orders require a valid trigger price.`, 400);
        return;
      }

      // ── Market hours ──────────────────────────────────────────────────
      if (!isMarketOpen()) {
        sendError(res, 'NSE is closed (market hours are 9:15 AM - 3:30 PM IST, Mon-Fri). Order rejected.', 400);
        return;
      }

      // Requirement 4/7 — automatic symbolToken resolution, never supplied by the caller.
      const contract = await niftyOptionChainService.resolveContract(expiryRaw, strike, side);

      // ── Option expired ──────────────────────────────────────────────────
      const expiryInfo = (await niftyOptionChainService.getExpiries()).find((e) => e.raw === expiryRaw);
      if (expiryInfo && expiryInfo.date < Date.now()) {
        sendError(res, `This NIFTY ${expiryRaw} contract has already expired.`, 400);
        return;
      }

      // ── Freeze quantity (NSE exchange-mandated cap, not just Angel One's own limit) ──
      if (contract.freezeQty > 0 && quantity > contract.freezeQty) {
        sendError(res, `Quantity ${quantity} exceeds the exchange freeze limit of ${contract.freezeQty} for this contract.`, 400);
        return;
      }

      // ── Margin check — a long option buy only ever requires the premium itself, no leverage ──
      const estimatedCost = (price ?? 0) * quantity;
      if (estimatedCost > 0) {
        try {
          const funds = await angelOneService.getFunds();
          if (funds.availableCash < estimatedCost) {
            sendError(res, `Insufficient margin — need ~₹${estimatedCost.toFixed(2)}, available ₹${funds.availableCash.toFixed(2)}.`, 400);
            return;
          }
        } catch {
          // Funds check is best-effort — a transient failure here must not
          // block a real order the user explicitly confirmed; SmartAPI
          // itself will still reject the order if margin is genuinely short.
        }
      }

      const orderRequest: PlaceOrderRequest = {
        tradingSymbol: contract.symbol,
        symbolToken: contract.token,
        exchange: 'NFO',
        transactionType: 'BUY', // this app is buy-only, unchanged existing rule
        orderType,
        productType,
        variety: orderType === 'STOPLOSS_LIMIT' || orderType === 'STOPLOSS_MARKET' ? 'STOPLOSS' : 'NORMAL',
        quantity,
        price,
        triggerPrice,
      };

      // eslint-disable-next-line no-console
      console.log('[Order] Sent to broker', { tradingSymbol: contract.symbol, symbolToken: contract.token, orderRequest });
      const sentAt = Date.now();
      const result = await angelOneService.placeOrder(orderRequest);
      const latencyMs = Date.now() - sentAt;

      // eslint-disable-next-line no-console
      console.log('[Order] Broker Response', { orderId: result.orderId, status: result.status, latencyMs, totalLatencyMs: Date.now() - requestedAt });

      sendSuccess(res, { ...result, tradingSymbol: contract.symbol, lotSize: contract.lotSize, productType, orderType: orderTypeKey }, 201);
    } catch (err) {
      const apiErr = err instanceof AngelOneApiError ? err : null;
      // eslint-disable-next-line no-console
      console.warn('[Order] Rejected', {
        strike, side, expiryRaw, quantity,
        message: apiErr?.message ?? (err instanceof Error ? err.message : 'Unknown error'),
        statusCode: apiErr?.statusCode ?? 500,
        totalLatencyMs: Date.now() - requestedAt,
      });
      handleError(res, err);
    }
  },
};
