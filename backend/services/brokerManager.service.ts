import type { IBrokerService } from '../brokers/IBrokerService';
import { ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';
import { getOrCreateAngelOneSession } from '../brokers/angelOne/angelOneSessionRegistry';

/**
 * Broker ids currently registered. Add to this union (and the registry
 * below) as each new broker's brokers/<name> module is implemented —
 * nothing in controllers/routes/middleware needs to change (Open/Closed).
 */
export type SupportedBrokerId = typeof ANGEL_ONE_BROKER_ID; // | 'ZERODHA' | 'UPSTOX' | 'SHOONYA' once implemented

const SUPPORTED_BROKER_IDS: SupportedBrokerId[] = [ANGEL_ONE_BROKER_ID];

/**
 * Central registry resolving a broker id to its service implementation —
 * scoped to a specific app user (userId), never a shared/global instance,
 * so one user's broker session can never be visible to another. Consumers
 * (controllers) depend only on the IBrokerService abstraction returned
 * here, never on a concrete class (Dependency Inversion).
 */
export class BrokerManagerService {
  isSupported(brokerId: string): brokerId is SupportedBrokerId {
    return SUPPORTED_BROKER_IDS.includes(brokerId as SupportedBrokerId);
  }

  getBroker(brokerId: SupportedBrokerId, userId: string): IBrokerService {
    if (brokerId === ANGEL_ONE_BROKER_ID) {
      return getOrCreateAngelOneSession(userId);
    }
    throw new Error(`Unsupported broker: ${brokerId}`);
  }

  getSupportedBrokers(): SupportedBrokerId[] {
    return [...SUPPORTED_BROKER_IDS];
  }
}

export const brokerManagerService = new BrokerManagerService();
