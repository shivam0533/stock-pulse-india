import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { optionsService, mapNiftyChainResponse, type NiftyChainResponse } from '@services/options.service';

/**
 * useOptionChain(0) is called from six separate places (OptionChain.tsx,
 * useAutoTradingEngine, NotificationEventBridge, AIDashboardSection,
 * AISignalStatusCard, AutoTradingStatusCard) — two of which are mounted
 * globally in AppLayout on every page. This registry shares exactly one real
 * EventSource per expiryIndex across every caller, ref-counted so it's only
 * closed once the last consumer unmounts.
 */
const activeStreams = new Map<number, { source: EventSource; refCount: number; closeTimer: ReturnType<typeof setTimeout> | null }>();

// EventSource has no baseURL concept (unlike brokerApiClient's axios
// instance) — mirrors the same VITE_API_URL resolution so the live stream
// keeps working once the backend is on a different origin (e.g. Railway).
const API_ORIGIN = import.meta.env.VITE_API_URL ?? '';

function subscribeToLiveChain(expiryIndex: number, queryClient: QueryClient): () => void {
  let entry = activeStreams.get(expiryIndex);

  // A close was scheduled by a consumer that just unmounted (see below) —
  // this new subscriber wants the same stream, so cancel it instead of
  // tearing the connection down and immediately rebuilding it.
  if (entry?.closeTimer) {
    clearTimeout(entry.closeTimer);
    entry.closeTimer = null;
  }

  if (!entry) {
    const source = new EventSource(`${API_ORIGIN}/api/nifty/option-chain/stream?expiryIndex=${expiryIndex}`);
    source.onmessage = (event) => {
      try {
        const chain = JSON.parse(event.data) as NiftyChainResponse;
        queryClient.setQueryData(['option-chain', expiryIndex], mapNiftyChainResponse(chain));
      } catch {
        // Malformed frame — ignore, the next tick self-corrects.
      }
    };
    entry = { source, refCount: 0, closeTimer: null };
    activeStreams.set(expiryIndex, entry);
  }
  entry.refCount += 1;

  return () => {
    const current = activeStreams.get(expiryIndex);
    if (!current) return;
    current.refCount -= 1;
    if (current.refCount <= 0) {
      // Deferred, not immediate: React 18 StrictMode (dev) runs this cleanup
      // and then immediately re-invokes the effect, and with six components
      // sharing this same expiryIndex, one unmounting while another mounts
      // a moment later is routine — closing synchronously here tore the
      // shared connection down and rebuilt it repeatedly, so the app spent
      // most of its time re-handshaking a fresh EventSource (and waiting
      // out its one-time initial snapshot) instead of holding a connection
      // open long enough to receive the throttled per-tick pushes. The only
      // updates that reliably survived that churn were the unrelated
      // 30-second REST fallback poll already in OptionChain.tsx — which is
      // exactly the "updates only every ~30s" symptom. Deferring the close
      // to the next microtask lets an imminent remount cancel it above.
      current.closeTimer = setTimeout(() => {
        const stillUnused = activeStreams.get(expiryIndex);
        if (stillUnused && stillUnused.refCount <= 0) {
          stillUnused.source.close();
          activeStreams.delete(expiryIndex);
        }
      }, 0);
    }
  };
}

export function useOptionChain(expiryIndex: number) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['option-chain', expiryIndex],
    queryFn: () => optionsService.getChain(expiryIndex),
    staleTime: 30 * 1000,
    refetchInterval: false, // manually controlled via auto-refresh (kept as a fallback; see stream below)
  });

  // Real-time updates — the backend pushes a fresh snapshot over
  // Server-Sent Events the instant a subscribed token ticks, reusing the
  // exact same live cache the REST endpoint reads from. Every caller shares
  // one connection per expiryIndex (see subscribeToLiveChain above).
  useEffect(() => {
    return subscribeToLiveChain(expiryIndex, queryClient);
  }, [expiryIndex, queryClient]);

  return query;
}

/** The real, live NIFTY expiry list (Angel One instrument master) — re-checked every minute so it stays correct if the app is left open across a day/expiry rollover. */
export function useOptionExpiries() {
  return useQuery({
    queryKey: ['option-expiries'],
    queryFn: () => optionsService.getExpiries(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
