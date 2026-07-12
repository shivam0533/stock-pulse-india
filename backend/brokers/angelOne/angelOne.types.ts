/** Domain types for the Angel One (SmartAPI) broker integration. */

export interface AngelOneLoginRequest {
  clientCode: string;
  pin: string;
  totp: string;
  /**
   * The end-user's OWN SmartAPI app key — Angel One's 2026 SEBI-compliance
   * update ties full trading-data access (funds/positions/orders) to the
   * specific account that created the app the key belongs to, so a single
   * shared key can no longer serve every user's account. Each user creates
   * their own app on the SmartAPI developer portal and enters that app's key
   * here, same way they already provide their own clientCode/pin/totp.
   */
  apiKey: string;
}

export interface AngelOneSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  clientCode: string;
  name: string;
  broker: 'ANGEL_ONE';
  loginTime: string;
  /** Seconds until this session expires, from `loginTime`. */
  expiresIn: number;
}

export interface AngelOneProfile {
  clientCode: string;
  name: string;
  email: string;
  mobile: string;
  exchanges: string[];
  products: string[];
  broker: 'ANGEL_ONE';
}

export interface AngelOneFunds {
  availableCash: number;
  availableMargin: number;
  utilisedMargin: number;
  collateral: number;
  payin: number;
  payout: number;
  /** Angel One's own "Net" figure from getRMS — net available balance (cash + today's realized/unrealized M2M). */
  net: number;
  /** Derived, not a distinct broker field: availableCash minus today's M2M P&L (m2mrealized + m2munrealized) — i.e. cash before today's trading activity. */
  openingBalance: number;
}

export type AngelOneTransactionType = 'BUY' | 'SELL';

export interface AngelOnePosition {
  tradingSymbol: string;
  exchange: string;
  productType: string;
  quantity: number;
  averagePrice: number;
  ltp: number;
  pnl: number;
  side: AngelOneTransactionType;
  /** Instrument-master symbol token — used to subscribe this position to the live WebSocket tick stream for real-time LTP/MTM updates. */
  token: string;
}

export interface AngelOneHolding {
  tradingSymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  ltp: number;
  pnl: number;
}

export type AngelOneOrderType = 'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT' | 'STOPLOSS_MARKET';
export type AngelOneProductType = 'INTRADAY' | 'DELIVERY' | 'MARGIN' | 'CARRYFORWARD';
export type AngelOneOrderVariety = 'NORMAL' | 'STOPLOSS' | 'AMO' | 'ROBO';
export type AngelOneOrderStatus = 'PENDING' | 'OPEN' | 'COMPLETE' | 'CANCELLED' | 'REJECTED';

export interface PlaceOrderRequest {
  tradingSymbol: string;
  symbolToken: string;
  exchange: string;
  transactionType: AngelOneTransactionType;
  orderType: AngelOneOrderType;
  productType: AngelOneProductType;
  variety: AngelOneOrderVariety;
  quantity: number;
  price?: number;
  triggerPrice?: number;
}

export interface ModifyOrderRequest {
  variety: AngelOneOrderVariety;
  tradingSymbol: string;
  symbolToken: string;
  exchange: string;
  productType: AngelOneProductType;
  duration?: 'DAY' | 'IOC';
  quantity?: number;
  price?: number;
  triggerPrice?: number;
  orderType?: AngelOneOrderType;
}

export interface OrderResult {
  orderId: string;
  /** The exchange's own order id (NSE/BSE), distinct from Angel One's internal order id — populated once the order book reflects it. */
  exchangeOrderId?: string;
  uniqueOrderId: string;
  status: AngelOneOrderStatus;
}

export interface OrderBookEntry {
  orderId: string;
  /** The exchange's own order id (NSE/BSE) — real field `exchorderid` from SmartAPI's order book. */
  exchangeOrderId?: string;
  tradingSymbol: string;
  transactionType: AngelOneTransactionType;
  quantity: number;
  price: number;
  status: AngelOneOrderStatus;
  orderTime: string;
}

export interface TradeBookEntry {
  tradeId: string;
  orderId: string;
  tradingSymbol: string;
  transactionType: AngelOneTransactionType;
  quantity: number;
  price: number;
  tradeTime: string;
}

export type MarketFeedMode = 'LTP' | 'QUOTE' | 'FULL';

export interface MarketFeedSubscription {
  tokens: string[];
  mode: MarketFeedMode;
}

export interface MarketFeedConnection {
  connectionId: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  subscribedTokens: string[];
}
