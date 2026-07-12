import type { Request, Response } from 'express';
import { niftyOptionChainService } from '../market/niftyOptionChain.service';
import { getOrCreateAngelOneSession } from '../brokers/angelOne/angelOneSessionRegistry';
import { angelOneWebSocketService } from '../market/angelOneWebSocket.service';
import { AngelOneApiError } from '../brokers/angelOne/angelOneHttp';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { isMarketOpen } from '../utils/marketHours';
import type { PlaceOrderRequest, AngelOneOrderType, AngelOneProductType, AngelOnePosition } from '../brokers/angelOne/angelOne.types';

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
 * Per-user lock covering both placeOrder and exitOrder — the frontend's own
 * in-flight guards (optionTrade.store.ts's openInFlight/exitInFlight) only
 * protect against races within a single browser tab; they share nothing
 * across two open tabs or two devices logged into the same account. This
 * backend lock is the actual authority: two concurrent requests for the
 * same user (any combination of place/exit) — a double-click, a retry, or
 * a second tab — have the second one rejected outright instead of both
 * reaching the broker, which previously could place a duplicate entry order
 * or oversell into a naked short (see exitOrder's held-quantity comment).
 */
const orderLockByUser = new Set<string>();

/**
 * HTTP glue for the real, live NIFTY Option Chain (requirements 2-8) — all
 * real logic (instrument resolution, live ticks, order placement) lives in
 * niftyOptionChainService / AngelOneService. Scoped ONLY to NIFTY options.
 * Every handler resolves the requesting user's own broker session via
 * getOrCreateAngelOneSession(req.userId) — never a shared/global instance.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof AngelOneApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected NIFTY option chain error.';
  // Every sibling controller (auth, admin, subscription, kotakNeo) logs its
  // caught errors server-side — this one didn't, so a genuine failure here
  // (e.g. the instrument-master download) was previously invisible in
  // production logs, surfacing to the client only as an empty-message 500.
  // eslint-disable-next-line no-console
  console.error('[NiftyOptionChain API] error:', err);
  sendError(res, message || 'Something went wrong. Please try again.', 500);
}

export const niftyOptionChainController = {
  /** Real, live positions from the connected Angel One account — scoped to NIFTY options only (never BANKNIFTY/FINNIFTY/equity). */
  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions = await getOrCreateAngelOneSession(req.userId!).getPositions();
      const niftyOptionPositions = positions.filter(
        (p) => p.exchange === 'NFO' && p.tradingSymbol.startsWith('NIFTY') && !p.tradingSymbol.startsWith('NIFTYNXT'),
      );
      sendSuccess(res, niftyOptionPositions);
    } catch (err) {
      handleError(res, err);
    }
  },

  /**
   * Server-Sent Events stream of live NIFTY option positions — same
   * REST payload getPositions() returns, kept fresh in real time by
   * subscribing every open position's symbol token to the existing Angel
   * One WebSocket tick stream (angelOneWebSocketService), recomputing
   * LTP/MTM the instant a subscribed token ticks instead of waiting on a
   * manual refresh. Reconnects automatically — angelOneWebSocketService
   * already reconnects its socket on its own (RECONNECT_DELAY_MS) and
   * re-subscribes every previously requested token once it's back up.
   */
  async streamPositions(req: Request, res: Response): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Resolved once for this connection's lifetime — the user doesn't
    // change mid-SSE-stream, so no need to re-resolve on every tick.
    const angelOne = getOrCreateAngelOneSession(req.userId!);
    let closed = false;
    let subscribedTokens: string[] = [];
    // token -> the REST position(s) it belongs to (NIFTY strangles rarely
    // repeat a token, but this stays correct even if they did).
    let latestPositions: Array<AngelOnePosition & { token: string }> = [];

    const recompute = (): Array<Record<string, unknown>> =>
      latestPositions.map((p) => {
        const tick = p.token ? angelOneWebSocketService.getTick(p.token) : undefined;
        const ltp = tick?.ltp ?? p.ltp;
        return {
          tradingSymbol: p.tradingSymbol,
          exchange: p.exchange,
          productType: p.productType,
          quantity: p.quantity,
          averagePrice: p.averagePrice,
          ltp,
          pnl: +((p.quantity * (ltp - p.averagePrice)).toFixed(2)),
          side: p.side,
        };
      });

    const push = (payload: Array<Record<string, unknown>>) => {
      if (!closed) res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Refetches the REST position list (catches new/closed positions) and
    // (re-)subscribes every open position's token to the WebSocket.
    const refreshPositions = async () => {
      if (closed) return;
      try {
        const positions = await angelOne.getPositions();
        latestPositions = positions.filter(
          (p) => p.exchange === 'NFO' && p.tradingSymbol.startsWith('NIFTY') && !p.tradingSymbol.startsWith('NIFTYNXT'),
        );
        const tokens = latestPositions.map((p) => p.token).filter(Boolean);
        if (tokens.length > 0) {
          angelOneWebSocketService.ensureSubscribed(tokens, []);
        }
        subscribedTokens = tokens;
        push(recompute());
      } catch (err) {
        if (!closed) {
          const message = err instanceof Error ? err.message : 'Live positions stream error.';
          res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        }
      }
    };

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const onTick = (token: string) => {
      if (!subscribedTokens.includes(token)) return; // not one of our open positions — ignore
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        push(recompute());
      }, STREAM_THROTTLE_MS);
    };

    angelOneWebSocketService.on('tick', onTick);
    // Safety net: catches positions opened/closed elsewhere (or a token that
    // never ticks) without relying solely on WebSocket activity.
    const pollInterval = setInterval(() => { void refreshPositions(); }, 10_000);
    const keepAlive = setInterval(() => {
      if (!closed) res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
      closed = true;
      angelOneWebSocketService.off('tick', onTick);
      clearInterval(pollInterval);
      clearInterval(keepAlive);
      if (throttleTimer) clearTimeout(throttleTimer);
    });

    await refreshPositions(); // initial snapshot + subscription immediately on connect
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

    // Purely tick-driven: every SnapQuote frame -> angelOneWebSocketService
    // emits 'tick' -> onTick (throttled) -> sendSnapshot() -> SSE push. No
    // independent timer drives this stream. Fault recovery for a stalled
    // upstream WebSocket lives in angelOneWebSocket.service.ts's own
    // staleness watchdog (forces a reconnect+resubscribe if no real tick
    // arrives for too long) — that's the correct layer to self-heal at,
    // since only it can actually restart the dead connection; a timer here
    // could only ever re-serve the same stale cached tick.
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

  /**
   * Places a real SELL order to close an existing NIFTY option LONG
   * position — the only way this app ever sends transactionType: 'SELL'.
   * Safety: the exit quantity is capped at whatever Angel One actually
   * reports as currently held for this exact contract (never the caller's
   * number blindly), and the request is rejected outright if no matching
   * open long position exists — this can never be used to open a naked
   * short. This is the counterpart the SL/Target/trailing-stop/manual-exit/
   * auto-square-off paths were missing: previously they only updated this
   * app's own local state and never told the broker to actually close the
   * position, so a "closed" trade in this app could still be live and
   * unprotected in the real Angel One account.
   */
  async exitOrder(req: Request, res: Response): Promise<void> {
    const requestedAt = Date.now();
    const userId = req.userId!;
    const angelOne = getOrCreateAngelOneSession(userId);
    const body = req.body as {
      strike: number; side: 'CE' | 'PE'; expiryRaw: string; quantity: number;
      productType?: keyof typeof PRODUCT_TYPE_MAP;
    };
    const { strike, side, expiryRaw, quantity } = body;
    const productTypeKey = body.productType ?? 'INTRADAY';

    // eslint-disable-next-line no-console
    console.log('[Exit Order] Requested', { strike, side, expiryRaw, quantity, productType: productTypeKey });

    if (orderLockByUser.has(userId)) {
      sendError(res, 'Another order request for your account is still being processed. Please wait.', 409);
      return;
    }
    orderLockByUser.add(userId);

    try {
      if (!strike || !side || !expiryRaw || !quantity) {
        sendError(res, 'strike, side, expiryRaw, and quantity are all required.', 400);
        return;
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        sendError(res, 'Invalid quantity — must be a positive whole number.', 400);
        return;
      }
      const productType = PRODUCT_TYPE_MAP[productTypeKey];
      if (!productType) {
        sendError(res, `Unsupported product type "${productTypeKey}". Use INTRADAY or CARRYFORWARD.`, 400);
        return;
      }

      // ── Market hours — same window placeOrder() enforces; a real broker
      // SELL is just as invalid outside session hours as a BUY. ──────────
      if (!isMarketOpen()) {
        sendError(res, 'NSE is closed (market hours are 9:15 AM - 3:30 PM IST, Mon-Fri). Order rejected.', 400);
        return;
      }

      const contract = await niftyOptionChainService.resolveContract(expiryRaw, strike, side);

      // ── The only guard that matters here: never sell more than is actually
      // held, and never sell anything if nothing is actually held. ──
      const positions: AngelOnePosition[] = await angelOne.getPositions();
      const held = positions.find((p) => p.exchange === 'NFO' && p.tradingSymbol === contract.symbol);
      const heldQty = held?.quantity ?? 0;
      if (heldQty <= 0) {
        sendError(res, `No open long position found for ${contract.symbol} on Angel One — nothing to exit.`, 400);
        return;
      }
      const exitQty = Math.min(quantity, heldQty);

      const orderRequest: PlaceOrderRequest = {
        tradingSymbol: contract.symbol,
        symbolToken: contract.token,
        exchange: 'NFO',
        transactionType: 'SELL',
        orderType: 'MARKET',
        productType,
        variety: 'NORMAL',
        quantity: exitQty,
      };

      // eslint-disable-next-line no-console
      console.log('[Exit Order] Sent to broker', { tradingSymbol: contract.symbol, symbolToken: contract.token, orderRequest });
      const sentAt = Date.now();
      const result = await angelOne.placeOrder(orderRequest);
      const latencyMs = Date.now() - sentAt;

      // eslint-disable-next-line no-console
      console.log('[Exit Order] Broker Response', { orderId: result.orderId, status: result.status, latencyMs, totalLatencyMs: Date.now() - requestedAt });

      sendSuccess(res, { ...result, tradingSymbol: contract.symbol, quantity: exitQty }, 201);
    } catch (err) {
      const apiErr = err instanceof AngelOneApiError ? err : null;
      // eslint-disable-next-line no-console
      console.warn('[Exit Order] Rejected', {
        strike, side, expiryRaw, quantity,
        message: apiErr?.message ?? (err instanceof Error ? err.message : 'Unknown error'),
        statusCode: apiErr?.statusCode ?? 500,
        totalLatencyMs: Date.now() - requestedAt,
      });
      handleError(res, err);
    } finally {
      orderLockByUser.delete(userId);
    }
  },

  async placeOrder(req: Request, res: Response): Promise<void> {
    const requestedAt = Date.now();
    const userId = req.userId!;
    const angelOne = getOrCreateAngelOneSession(userId);
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

    if (orderLockByUser.has(userId)) {
      sendError(res, 'Another order request for your account is still being processed. Please wait.', 409);
      return;
    }
    orderLockByUser.add(userId);

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
      // expiryInfo.date is IST midnight at the *start* of the expiry date
      // (see parseExpiryDate in instrumentMaster.service.ts) — the contract
      // is still live and tradable for the entirety of that calendar day
      // (isMarketOpen() above already confines this to 9:15 AM-3:30 PM IST),
      // so "expired" only means the day has fully passed, i.e. one day later.
      const expiryInfo = (await niftyOptionChainService.getExpiries()).find((e) => e.raw === expiryRaw);
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (expiryInfo && expiryInfo.date + ONE_DAY_MS <= Date.now()) {
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
          const funds = await angelOne.getFunds();
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
      const result = await angelOne.placeOrder(orderRequest);
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
    } finally {
      orderLockByUser.delete(userId);
    }
  },
};
