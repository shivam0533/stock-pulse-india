/**
 * Domain types for Kotak Neo trading operations. Field names are the
 * friendly, self-describing equivalents of the terse wire-format codes the
 * real API actually uses (e.g. "exchangeSegment" for the real "es") —
 * KotakNeoTradingService.ts maps between the two, exactly the way the
 * official Python SDK itself exposes friendly parameter names that get
 * translated into the same terse body_params dict before the HTTP call.
 * Response fields are verified from the official docs (docs/Place_Order.md,
 * Modify_Order.md, Cancel_Order.md, Order_report.md, Trade_report.md,
 * Positions.md, Holdings.md, Limits.md).
 */

export type KotakNeoExchangeSegment = 'nse_cm' | 'bse_cm' | 'nse_fo' | 'bse_fo' | 'cde_fo' | 'mcx_fo';
export type KotakNeoProduct = 'NRML' | 'CNC' | 'MIS' | 'CO' | 'BO' | 'MTF' | 'INTRADAY';
export type KotakNeoOrderType = 'L' | 'MKT' | 'SL' | 'SL-M';
export type KotakNeoValidity = 'DAY' | 'IOC' | 'GTC' | 'EOS' | 'GTD';
export type KotakNeoTransactionType = 'B' | 'S';

export interface KotakNeoPlaceOrderRequest {
  exchangeSegment: KotakNeoExchangeSegment;
  product: KotakNeoProduct;
  price: string;
  orderType: KotakNeoOrderType;
  quantity: string;
  validity: KotakNeoValidity;
  tradingSymbol: string;
  transactionType: KotakNeoTransactionType;
  amo?: 'YES' | 'NO';
  disclosedQuantity?: string;
  marketProtection?: string;
  pf?: 'Y' | 'N';
  triggerPrice?: string;
  tag?: string;
  scripToken?: string;
  squareOffType?: 'Absolute' | 'Ticks';
  stopLossType?: 'Absolute' | 'Ticks';
  stopLossValue?: string;
  squareOffValue?: string;
  lastTradedPrice?: string;
  trailingStopLoss?: 'Y' | 'N';
  trailingSlValue?: string;
}

export interface KotakNeoModifyOrderRequest {
  orderId: string;
  instrumentToken?: string;
  exchangeSegment?: KotakNeoExchangeSegment;
  product?: KotakNeoProduct;
  price?: string;
  orderType?: KotakNeoOrderType;
  quantity?: string;
  validity?: KotakNeoValidity;
  tradingSymbol?: string;
  transactionType?: KotakNeoTransactionType;
  triggerPrice?: string;
  disclosedQuantity?: string;
  marketProtection?: string;
  filledQuantity?: string;
  amo?: 'YES' | 'NO';
  /** Real wire field "dd" — official docs only specify "Default Value: NA", no further semantics documented. */
  dd?: string;
}

export interface KotakNeoCancelOrderRequest {
  orderId: string;
  amo?: 'YES' | 'NO';
}

/** Shared response shape for place/modify/cancel — verified identical across all three in the official docs. */
export interface KotakNeoOrderActionResult {
  stat: string;
  nOrdNo: string;
  stCode: number;
}

/** One entry from GET quick/user/orders (Order_report.md sample response, verified fields). Kotak returns additional broker-internal fields beyond what's modeled here. */
export interface KotakNeoOrderBookEntry {
  nOrdNo: string;
  trdSym: string;
  sym: string;
  exSeg: string;
  prod: string;
  prcTp: string;
  qty: number;
  prc: string;
  avgPrc: string;
  trnsTp: string;
  ordSt: string;
  rejRsn: string;
  ordDtTm: string;
  fldQty: number;
  trgPrc: string;
  vldt: string;
  series: string;
  rmk: string;
  tok: string;
  [key: string]: unknown;
}

/** One entry from GET quick/user/trades (Trade_report.md sample response, verified fields). */
export interface KotakNeoTradeBookEntry {
  nOrdNo: string;
  trdSym: string;
  sym: string;
  exSeg: string;
  prod: string;
  prcTp: string;
  trnsTp: string;
  avgPrc: string;
  fldQty: number;
  flDt: string;
  flId: string;
  flLeg: number;
  flTm: string;
  exTm: string;
  rptTp: string;
  [key: string]: unknown;
}

/** One entry from GET quick/user/positions (Positions.md sample response, verified fields). */
export interface KotakNeoPositionEntry {
  nOrdNo: string;
  trdSym: string;
  sym: string;
  exSeg: string;
  prod: string;
  trnsTp: string;
  qty: number;
  prc: string;
  multiplier: string;
  genNum: string;
  genDen: string;
  prcNum: string;
  prcDen: string;
  precision: string;
  lotSz: string;
  [key: string]: unknown;
}

/** One entry from GET portfolio/v1/holdings (Holdings.md sample response — verified, complete field set). */
export interface KotakNeoHoldingEntry {
  displaySymbol: string;
  averagePrice: number;
  quantity: number;
  exchangeSegment: string;
  exchangeIdentifier: string;
  holdingCost: number;
  mktValue: number;
  scripId: string;
  instrumentToken: number;
  instrumentType: string;
  isAlternateScrip: boolean;
  closingPrice: number;
  symbol: string;
  sellableQuantity: number;
}

export interface KotakNeoLimitsRequest {
  segment?: 'CASH' | 'CUR' | 'FO' | 'ALL';
  exchange?: 'NSE' | 'BSE' | 'ALL';
  product?: 'CNC' | 'MIS' | 'NRML' | 'ALL';
}

/** GET/POST quick/user/limits response (Limits.md sample response — verified core fields; Kotak returns many more margin-breakdown fields beyond what's modeled here). */
export interface KotakNeoFunds {
  Category: string;
  CollateralValue: string;
  Collateral: string;
  RmsCollateral: string;
  AdhocMargin: string;
  MarginUsed: string;
  Net: string;
  [key: string]: unknown;
}
