import { brokerApiClient, toBrokerApiError } from '@api/brokerApiClient';

/**
 * Real Angel One account funds — GET /api/broker/ANGEL_ONE/funds routes
 * through the existing brokerController -> BrokerManagerService -> the
 * shared AngelOneService singleton (the same authenticated session every
 * other Angel One call in this app already uses). No new login flow, no
 * mock data: a genuine SmartAPI getRMS() call every time this is invoked.
 */
export interface AccountFunds {
  availableCash: number;
  availableMargin: number;
  utilisedMargin: number;
  collateral: number;
  payin: number;
  payout: number;
  /** Angel One's own "Net" figure — net available balance (cash + today's realized/unrealized M2M). */
  net: number;
  /** Derived from real fields (availableCash minus today's M2M P&L), not a distinct broker field — Angel One's RMS API has no separate "opening balance" concept. */
  openingBalance: number;
}

export async function getAngelOneFunds(): Promise<AccountFunds> {
  try {
    const { data } = await brokerApiClient.get<{ success: true; data: AccountFunds }>('/broker/ANGEL_ONE/funds');
    return data.data;
  } catch (err) {
    throw new Error(toBrokerApiError(err).message);
  }
}
