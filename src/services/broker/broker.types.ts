export type BrokerId = 'PAPER' | 'ZERODHA' | 'ANGEL_ONE' | 'UPSTOX' | 'SHOONYA' | 'KOTAK_NEO';

/** User-facing order type, mirrors every broker's own real order-type enum. SL/SL-M are BUY-side stop orders (e.g. breakout entries) — this app never sells. */
export type OptionOrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

/** INTRADAY auto-squares-off at 3:20 PM IST same as today; CARRYFORWARD (NRML-equivalent for F&O) is held overnight and carries real overnight gap risk. */
export type OptionProductType = 'INTRADAY' | 'CARRYFORWARD';

export interface BrokerOrderRequest {
  strike: number;
  side: 'CE' | 'PE';
  expiry: string;
  /** Angel One instrument-master expiry key (e.g. "07JUL2026") — present only for a live chain; a real adapter needs this to resolve the correct symbolToken automatically. */
  expiryRaw?: string;
  price: number;
  /** Real quantity (lotSize × lots) — a real broker order must specify this upfront, unlike the paper fill which only needed a price. */
  quantity: number;
  orderType: OptionOrderType;
  productType: OptionProductType;
  /** Required for SL / SL-M orders — the price at which the order activates. */
  triggerPrice?: number;
}

export interface BrokerOrderResult {
  filledPrice: number;
  brokerOrderId: string;
}

export interface BrokerExitRequest {
  strike: number;
  side: 'CE' | 'PE';
  expiryRaw?: string;
  /** Quantity to close — a real adapter caps this at whatever the broker actually reports as held, never blindly trusting this number. */
  quantity: number;
  productType: OptionProductType;
}

export interface BrokerAdapter {
  id: BrokerId;
  label: string;
  isAuthenticated(): boolean;
  /** Async because a real (non-paper) broker adapter makes a genuine network call. */
  placeOrder(req: BrokerOrderRequest): Promise<BrokerOrderResult>;
  /** Closes an existing long position with a real SELL order (never a naked short — real adapters only ever close what's actually held). Every SL/Target/trailing-stop/manual-exit/auto-square-off path must call this for a live trade instead of only updating local state. */
  exitOrder(req: BrokerExitRequest): Promise<BrokerOrderResult>;
}
