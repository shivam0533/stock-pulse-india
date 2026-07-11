/** Deliberately curated, safe-to-show validation errors from the admin module (e.g. "you can't demote yourself") — distinct from an unexpected internal error, which admin.controller.ts's handleError sanitizes before it ever reaches the client. */
export class AdminApiError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'AdminApiError';
  }
}
