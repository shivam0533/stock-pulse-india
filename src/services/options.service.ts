import { generateOptionChain, OPTION_EXPIRIES } from '@api/optionsMockData';
import type { OptionChainData, OptionExpiry } from '@/types';

function delay<T>(v: T, ms = 250): Promise<T> {
  return new Promise((res) => setTimeout(() => res(v), ms));
}

export const optionsService = {
  getExpiries(): Promise<OptionExpiry[]> {
    return delay(OPTION_EXPIRIES);
  },

  getChain(expiryIndex: number): Promise<OptionChainData> {
    return delay(generateOptionChain(expiryIndex), 300);
  },
};
