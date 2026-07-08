import type { IBrokerService } from '../IBrokerService';
import type {
  AngelOneLoginRequest,
  AngelOneSession,
  AngelOneProfile,
  AngelOneFunds,
  AngelOnePosition,
  AngelOneHolding,
  PlaceOrderRequest,
  OrderResult,
  ModifyOrderRequest,
  OrderBookEntry,
  TradeBookEntry,
  MarketFeedSubscription,
  MarketFeedConnection,
} from './angelOne.types';

/** Angel One's concrete binding of the generic broker contract. */
export interface IAngelOneService
  extends IBrokerService<
    AngelOneLoginRequest,
    AngelOneSession,
    AngelOneProfile,
    AngelOneFunds,
    AngelOnePosition,
    AngelOneHolding,
    PlaceOrderRequest,
    OrderResult,
    ModifyOrderRequest,
    OrderBookEntry,
    TradeBookEntry,
    MarketFeedSubscription,
    MarketFeedConnection
  > {}
