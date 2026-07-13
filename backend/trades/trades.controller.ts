import type { Request, Response } from 'express';
import { tradesService } from './trades.service';
import { TradeApiError } from './trades.errors';
import { sendSuccess, sendError } from '../utils/apiResponse';

function handleError(res: Response, err: unknown): void {
  if (err instanceof TradeApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[Trades API] error:', err);
  sendError(res, 'Something went wrong. Please try again.', 500);
}

export const tradesController = {
  async record(req: Request, res: Response): Promise<void> {
    try {
      await tradesService.recordTrade(req.userId!, req.body ?? {});
      sendSuccess(res, { recorded: true }, 201);
    } catch (err) {
      handleError(res, err);
    }
  },
};
