/**
 * Generic, broker-agnostic contract every broker integration must implement.
 * Angel One is the first implementation (see brokers/angelOne); Zerodha,
 * Upstox, and Shoonya will each get their own brokers/<name> module that
 * implements this same interface — nothing outside brokers/<name> needs to
 * know which concrete broker it's talking to (Dependency Inversion).
 *
 * Type parameters let each broker describe its own request/response shapes
 * (e.g. Angel One's login needs clientCode/pin/totp, another broker might
 * need an api_key/request_token exchange) while still exposing one uniform
 * set of method names to the rest of the backend (Interface Segregation —
 * only trading-related operations are exposed here, nothing else).
 */
export interface IBrokerService<
  TLoginRequest = unknown,
  TSession = unknown,
  TProfile = unknown,
  TFunds = unknown,
  TPosition = unknown,
  THolding = unknown,
  TPlaceOrderRequest = unknown,
  TOrderResult = unknown,
  TModifyOrderRequest = unknown,
  TOrderBookEntry = unknown,
  TTradeBookEntry = unknown,
  TMarketFeedSubscription = unknown,
  TMarketFeedConnection = unknown,
> {
  login(credentials: TLoginRequest): Promise<TSession>;
  logout(): Promise<{ success: boolean }>;
  refreshSession(): Promise<TSession>;
  /** True only if this specific instance currently holds a live, unexpired session — used to gate requests per-user instead of assuming a global "connected" state. */
  hasSession(): boolean;

  getProfile(): Promise<TProfile>;
  getFunds(): Promise<TFunds>;
  getPositions(): Promise<TPosition[]>;
  getHoldings(): Promise<THolding[]>;

  placeOrder(order: TPlaceOrderRequest): Promise<TOrderResult>;
  modifyOrder(orderId: string, updates: TModifyOrderRequest): Promise<TOrderResult>;
  cancelOrder(orderId: string): Promise<TOrderResult>;
  getOrderBook(): Promise<TOrderBookEntry[]>;
  getTradeBook(): Promise<TTradeBookEntry[]>;

  connectMarketFeed(subscription: TMarketFeedSubscription): Promise<TMarketFeedConnection>;
  disconnectMarketFeed(): Promise<{ success: boolean }>;
}
