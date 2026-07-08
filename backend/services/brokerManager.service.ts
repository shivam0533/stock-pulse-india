import type { IBrokerService } from '../brokers/IBrokerService';
import { angelOneService, ANGEL_ONE_BROKER_ID } from '../brokers/angelOne';

/**
 * Broker ids currently registered. Add to this union (and the registry
 * below) as each new broker's brokers/<name> module is implemented —
 * nothing in controllers/routes/middleware needs to change (Open/Closed).
 */
export type SupportedBrokerId = typeof ANGEL_ONE_BROKER_ID; // | 'ZERODHA' | 'UPSTOX' | 'SHOONYA' once implemented

const SUPPORTED_BROKER_IDS: SupportedBrokerId[] = [ANGEL_ONE_BROKER_ID];

/**
 * Central registry resolving a broker id to its service implementation.
 * Consumers (controllers) depend only on the IBrokerService abstraction
 * returned here, never on a concrete class (Dependency Inversion).
 */
export class BrokerManagerService {
  private readonly registry: Record<SupportedBrokerId, IBrokerService>;

  constructor() {
    this.registry = {
      [ANGEL_ONE_BROKER_ID]: angelOneService,
    };
  }

  isSupported(brokerId: string): brokerId is SupportedBrokerId {
    return SUPPORTED_BROKER_IDS.includes(brokerId as SupportedBrokerId);
  }

  getBroker(brokerId: SupportedBrokerId): IBrokerService {
    const broker = this.registry[brokerId];
    if (!broker) {
      throw new Error(`Unsupported broker: ${brokerId}`);
    }
    return broker;
  }

  getSupportedBrokers(): SupportedBrokerId[] {
    return [...SUPPORTED_BROKER_IDS];
  }
}

export const brokerManagerService = new BrokerManagerService();
