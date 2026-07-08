import type { Response } from 'express';

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccessBody<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, message: string, statusCode = 500): void {
  const body: ApiErrorBody = { success: false, message };
  res.status(statusCode).json(body);
}
