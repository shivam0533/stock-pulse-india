import type { Request, Response } from 'express';
import { kotakNeoTradingService } from '../services/KotakNeoTradingService';
import { getOrCreateKotakNeoSession } from '../services/kotakNeoSessionRegistry';
import { KotakNeoApiError } from '../services/kotakNeoHttp';
import { sendSuccess, sendError } from '../utils/apiResponse';
import type {
  KotakNeoPlaceOrderRequest,
  KotakNeoModifyOrderRequest,
  KotakNeoCancelOrderRequest,
  KotakNeoLimitsRequest,
} from '../services/kotakNeoTrading.types';

/**
 * HTTP glue only — all real logic (session integration, HTTP calls to
 * Kotak, retries, error extraction) lives in KotakNeoTradingService. Every
 * handler resolves *this specific app user's* own Kotak Neo session via
 * getOrCreateKotakNeoSession(req.userId) — never a shared/global instance,
 * so one user's session can never be read or traded against by another.
 * Each handler maps a thrown KotakNeoApiError to its real statusCode (401
 * when not connected / session expired, Kotak's own upstream status
 * otherwise) instead of the shared error middleware's blanket 500.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof KotakNeoApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected Kotak Neo trading error.';
  sendError(res, message, 500);
}

export const kotakNeoTradingController = {
  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const result = await kotakNeoTradingService.placeOrder(kotakNeo, req.body as KotakNeoPlaceOrderRequest);
      sendSuccess(res, result, 201);
    } catch (err) {
      handleError(res, err);
    }
  },

  async modifyOrder(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const result = await kotakNeoTradingService.modifyOrder(kotakNeo, req.body as KotakNeoModifyOrderRequest);
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const result = await kotakNeoTradingService.cancelOrder(kotakNeo, req.body as KotakNeoCancelOrderRequest);
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getOrderBook(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const orders = await kotakNeoTradingService.getOrderBook(kotakNeo);
      sendSuccess(res, orders);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getTradeBook(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const trades = await kotakNeoTradingService.getTradeBook(kotakNeo);
      sendSuccess(res, trades);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const positions = await kotakNeoTradingService.getPositions(kotakNeo);
      sendSuccess(res, positions);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getHoldings(req: Request, res: Response): Promise<void> {
    try {
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const holdings = await kotakNeoTradingService.getHoldings(kotakNeo);
      sendSuccess(res, holdings);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getFunds(req: Request, res: Response): Promise<void> {
    try {
      const { segment, exchange, product } = req.query;
      const filters: KotakNeoLimitsRequest = {
        segment: typeof segment === 'string' ? (segment as KotakNeoLimitsRequest['segment']) : undefined,
        exchange: typeof exchange === 'string' ? (exchange as KotakNeoLimitsRequest['exchange']) : undefined,
        product: typeof product === 'string' ? (product as KotakNeoLimitsRequest['product']) : undefined,
      };
      const kotakNeo = getOrCreateKotakNeoSession(req.userId!);
      const funds = await kotakNeoTradingService.getFunds(kotakNeo, filters);
      sendSuccess(res, funds);
    } catch (err) {
      handleError(res, err);
    }
  },
};
