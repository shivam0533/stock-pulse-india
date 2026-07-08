import type { BrokerId } from '@services/broker/broker.types';

/**
 * Display metadata for brokers shown on the Broker Integration page.
 * Adding a new broker later means: add an adapter under services/broker,
 * register it in brokerExecution.service.ts's ADAPTERS map, and add one
 * entry here — no other file needs to change.
 */
export interface BrokerMeta {
  id: BrokerId;
  name: string;
  tagline: string;
  initials: string;
  gradient: string; // tailwind "from-x to-y" classes for the logo badge
}

export const BROKERS: BrokerMeta[] = [
  { id: 'ANGEL_ONE', name: 'Angel One', tagline: 'SmartAPI', initials: 'AO', gradient: 'from-orange-400 to-red-500' },
  { id: 'ZERODHA',   name: 'Zerodha',   tagline: 'Kite Connect', initials: 'Z', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'UPSTOX',    name: 'Upstox',    tagline: 'Upstox API', initials: 'U', gradient: 'from-purple-500 to-pink-600' },
  { id: 'SHOONYA',   name: 'Shoonya',  tagline: 'Finvasia', initials: 'S', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'KOTAK_NEO', name: 'Kotak Neo', tagline: 'Kotak Securities API', initials: 'KN', gradient: 'from-[#E53935] to-[#B71C1C]' },
];
