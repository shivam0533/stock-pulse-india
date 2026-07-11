export class SubscriptionApiError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'SubscriptionApiError';
  }
}
