import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Parser } from 'binary-parser';
import { getAnyLiveAngelOneSession } from '../brokers/angelOne/angelOneSessionRegistry';
import {
  ANGEL_ONE_WS_URL,
  ANGEL_ONE_WS_PING_INTERVAL_MS,
  ANGEL_ONE_WS_PING_MESSAGE,
  WS_ACTION,
  WS_MODE,
  WS_EXCHANGE_TYPE,
  WS_PRICE_SCALE,
} from './nifty.constants';
import type { NiftyLiveTick } from './nifty.types';

/**
 * Real Angel One WebSocket 2.0 market-data stream — no mock ticks.
 * Connection headers, subscribe request shape, and the binary SnapQuote
 * frame layout are verified directly from the official
 * angel-one/smartapi-javascript SDK source (lib/websocket2.0.js). Only
 * SnapQuote mode is used — it carries LTP, volume, OI, OI change, and best
 * bid/ask in a single frame.
 */

/** binary-parser returns BigInt for (u)int64 fields (Node Buffers can't hold 64-bit ints as plain numbers) — converted to Number immediately since every value here (prices/quantities/OI) safely fits a JS double. */
const asNumber = (v: unknown) => Number(v as bigint);

const bestFiveEntry = new Parser()
  .endianness('little')
  .int16('flag')
  .int64('quantity', { formatter: asNumber })
  .int64('price', { formatter: asNumber })
  .int16('no_of_orders');

const snapQuoteParser = new Parser()
  .endianness('little')
  .uint8('subscription_mode')
  .uint8('exchange_type')
  .array('token', { type: 'int8', length: 25 })
  .uint64('sequence_number', { formatter: asNumber })
  .uint64('exchange_timestamp', { formatter: asNumber })
  .uint64('last_traded_price', { formatter: asNumber })
  .int64('last_traded_quantity', { formatter: asNumber })
  .int64('avg_traded_price', { formatter: asNumber })
  .int64('vol_traded', { formatter: asNumber })
  .doublele('total_buy_quantity')
  .doublele('total_sell_quantity')
  .int64('open_price_day', { formatter: asNumber })
  .int64('high_price_day', { formatter: asNumber })
  .int64('low_price_day', { formatter: asNumber })
  .int64('close_price', { formatter: asNumber })
  .int64('last_traded_timestamp', { formatter: asNumber })
  .int64('open_interest', { formatter: asNumber })
  .doublele('open_interest_change')
  .array('best_5_buy_data', { type: bestFiveEntry, lengthInBytes: 100 })
  .array('best_5_sell_data', { type: bestFiveEntry, lengthInBytes: 100 });

/** Decodes the 25-byte null-padded ASCII token field into a plain numeric-string token. */
/**
 * The 25-byte token field is padded with trailing NULL bytes (\x00), not
 * spaces — stripping only spaces left them in the decoded string, so the
 * cache key never matched the clean token string used everywhere else
 * (instrument master, quote lookups), and every getTick() lookup silently
 * missed despite the tick having actually arrived and been cached.
 */
function decodeToken(bytes: number[]): string {
  return bytes.map((b) => String.fromCharCode(b < 0 ? b + 256 : b)).join('').replace(/[\x00 ]+$/, '');
}

interface SnapQuoteFrame {
  subscription_mode: number;
  exchange_type: number;
  token: number[];
  sequence_number: number;
  exchange_timestamp: number;
  last_traded_price: number;
  vol_traded: number;
  open_interest: number;
  open_interest_change: number;
  best_5_buy_data: Array<{ price: number }>;
  best_5_sell_data: Array<{ price: number }>;
}

const RECONNECT_BASE_DELAY_MS = 3000;
const RECONNECT_MAX_DELAY_MS = 60_000;
/**
 * Observed in production: the socket can stay open — `ws.on('close')` never
 * fires, ping/pong keeps succeeding — while Angel One silently stops sending
 * real SnapQuote frames, so every tick (spot price included) stays frozen at
 * its last value indefinitely. Neither the existing close-handler reconnect
 * nor the SSE-side safety poll can detect this "zombie" state, since both
 * only react to an actual disconnect or re-read the same stale cached tick.
 * NIFTY's own index ticks essentially continuously during market hours, so
 * this long a gap with zero fresh frames is never legitimate market quiet.
 */
const STALE_TICK_THRESHOLD_MS = 20_000;
const STALE_TICK_CHECK_INTERVAL_MS = 5_000;

export class AngelOneWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private ticks: Map<string, NiftyLiveTick> = new Map();
  private subscribedTokens: Set<string> = new Set();
  private connectingClientCode: string | null = null;
  // Every token ever requested via ensureSubscribed(), regardless of
  // connection state at the time — the `open` handler subscribes to these,
  // not `subscribedTokens` (see connect() for why that distinction matters).
  private pendingNfoTokens: Set<string> = new Set();
  private pendingNseTokens: Set<string> = new Set();
  /** Consecutive failed-connection count — drives exponential backoff so a prolonged Angel One-side outage doesn't hammer their API every few seconds forever. Reset to 0 on a successful open. */
  private reconnectAttempts = 0;
  /** Timestamp of the last genuine SnapQuote frame (any token) — reset on every fresh `open` so a brand-new connection isn't immediately judged stale before Angel One has had a chance to send anything. 0 means "never connected yet". */
  private lastTickAt = 0;

  constructor() {
    super();
    setInterval(() => {
      if (this.lastTickAt === 0 || !this.isConnected()) return;
      const staleSinceMs = Date.now() - this.lastTickAt;
      if (staleSinceMs > STALE_TICK_THRESHOLD_MS) {
        // eslint-disable-next-line no-console
        console.warn(`[AngelOneWS] no tick received in ${staleSinceMs}ms (connection looks open but Angel One has gone silent) — forcing reconnect`);
        this.ws?.terminate(); // triggers the existing 'close' handler's reconnect/backoff logic below
      }
    }, STALE_TICK_CHECK_INTERVAL_MS);
  }

  getTick(token: string): NiftyLiveTick | undefined {
    return this.ticks.get(token);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Ensures a live connection exists for the current Angel One session, then subscribes to the given tokens (idempotent — already-subscribed tokens are skipped). */
  ensureSubscribed(nfoTokens: string[], nseTokens: string[] = []): void {
    // Any one currently-live user's session — this is shared, public market
    // data (NIFTY/option LTP), not user-specific, so any valid feed token
    // can authenticate the one upstream connection every user's browser
    // reads from.
    const creds = getAnyLiveAngelOneSession()?.getMarketFeedCredentials() ?? null;
    if (!creds) return; // nobody connected yet — nothing to stream

    // Fix: previously, on the very first call (WS not connected yet), this
    // method called connect() and returned WITHOUT recording nfoTokens/
    // nseTokens anywhere — the open handler only resent `subscribedTokens`,
    // which is empty until sendSubscribe() actually runs, so the tokens from
    // this first-ever request were silently dropped and never subscribed.
    nfoTokens.forEach((t) => this.pendingNfoTokens.add(t));
    nseTokens.forEach((t) => this.pendingNseTokens.add(t));

    if (!this.isConnected() || this.connectingClientCode !== creds.clientCode) {
      this.connect();
      return; // subscription happens once the new connection opens (see onopen)
    }

    this.sendSubscribe(nfoTokens, WS_EXCHANGE_TYPE.nse_fo);
    this.sendSubscribe(nseTokens, WS_EXCHANGE_TYPE.nse_cm);
  }

  private connect(): void {
    const creds = getAnyLiveAngelOneSession()?.getMarketFeedCredentials() ?? null;
    if (!creds) return;

    this.teardown();
    this.connectingClientCode = creds.clientCode;

    // Stage: Feed Token — confirms a real feed token exists before we even
    // attempt the socket handshake (masked, never logs the real value).
    // eslint-disable-next-line no-console
    console.log('[Pipeline] Feed Token present', {
      clientCode: creds.clientCode,
      feedTokenLength: creds.feedToken?.length ?? 0,
    });

    this.ws = new WebSocket(ANGEL_ONE_WS_URL, {
      headers: {
        'x-client-code': creds.clientCode,
        Authorization: `Bearer ${creds.jwtToken}`,
        'x-api-key': creds.apiKey,
        'x-feed-token': creds.feedToken,
      },
    });

    this.ws.on('open', () => {
      // Stage: WebSocket Connected
      // eslint-disable-next-line no-console
      console.log('[Pipeline] WebSocket Connected');
      this.reconnectAttempts = 0; // back to full speed after a successful connect
      this.lastTickAt = Date.now(); // give this fresh connection the full threshold before it can be judged stale
      this.pingInterval = setInterval(() => this.ws?.send(ANGEL_ONE_WS_PING_MESSAGE), ANGEL_ONE_WS_PING_INTERVAL_MS);
      // Subscribe to everything ever requested (this connection's first
      // caller included) — using pendingNfoTokens/pendingNseTokens, not
      // subscribedTokens, which is only populated by sendSubscribe() itself
      // and would always be empty here on a first-ever connect.
      const nfo = [...this.pendingNfoTokens];
      const nse = [...this.pendingNseTokens];
      if (nfo.length > 0) this.sendSubscribe(nfo, WS_EXCHANGE_TYPE.nse_fo);
      if (nse.length > 0) this.sendSubscribe(nse, WS_EXCHANGE_TYPE.nse_cm);
      // Stage: Subscription Success (request sent — SmartAPI has no JSON ack;
      // real confirmation only comes from ticks actually arriving afterward)
      // eslint-disable-next-line no-console
      console.log('[Pipeline] Subscription Success (request sent)', {
        nfoTokenCount: nfo.length, nseTokenCount: nse.length,
      });
    });

    this.ws.on('message', (raw: Buffer) => {
      if (raw.length < 2) return; // 'pong' or a non-binary control message
      try {
        const mode = raw.readUInt8(0);
        if (mode !== WS_MODE.SNAP_QUOTE) return; // only SnapQuote is requested, but guard anyway
        this.handleSnapQuote(snapQuoteParser.parse(raw) as SnapQuoteFrame);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[AngelOneWS] failed to parse a frame — skipping it', { message: (err as Error).message });
      }
    });

    this.ws.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.warn('[AngelOneWS] socket error', { message: err.message });
    });

    this.ws.on('close', () => {
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
        RECONNECT_MAX_DELAY_MS,
      );
      this.reconnectAttempts += 1;
      // eslint-disable-next-line no-console
      console.log(`[AngelOneWS] disconnected — reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      this.teardown();
      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    });
  }

  private sendSubscribe(tokens: string[], exchangeType: number): void {
    if (tokens.length === 0 || this.ws?.readyState !== WebSocket.OPEN) return;
    const newTokens = tokens.filter((t) => !this.subscribedTokens.has(t));
    if (newTokens.length === 0) return;
    newTokens.forEach((t) => this.subscribedTokens.add(t));

    this.ws.send(JSON.stringify({
      correlationID: `nifty-${Date.now()}`,
      action: WS_ACTION.SUBSCRIBE,
      params: { mode: WS_MODE.SNAP_QUOTE, tokenList: [{ exchangeType, tokens: newTokens }] },
    }));
  }

  private diagTickLogCount = 0;
  /** Last sequence_number seen per token — SmartAPI increments this on every genuine new tick, so a repeated value means the socket redelivered the same frame rather than sending fresh market data. */
  private lastSequenceByToken: Map<string, number> = new Map();

  private handleSnapQuote(frame: SnapQuoteFrame): void {
    const token = decodeToken(frame.token);
    if (!token) return;

    this.lastTickAt = Date.now();
    const rawLtp = frame.last_traded_price / WS_PRICE_SCALE;
    const prevSequence = this.lastSequenceByToken.get(token);
    const isDuplicateSequence = prevSequence !== undefined && prevSequence === frame.sequence_number;
    this.lastSequenceByToken.set(token, frame.sequence_number);

    this.ticks.set(token, {
      token,
      ltp: rawLtp,
      volume: frame.vol_traded,
      openInterest: frame.open_interest,
      openInterestChange: frame.open_interest_change,
      bestBid: frame.best_5_buy_data?.[0] ? frame.best_5_buy_data[0].price / WS_PRICE_SCALE : 0,
      bestAsk: frame.best_5_sell_data?.[0] ? frame.best_5_sell_data[0].price / WS_PRICE_SCALE : 0,
      updatedAt: Date.now(),
    });

    // Stage: Tick Received — bounded, first 40 ticks only. sequence_number
    // and exchange_timestamp prove whether the exchange actually sent new
    // data or the socket redelivered a stale/duplicate frame.
    if (this.diagTickLogCount < 40) {
      this.diagTickLogCount += 1;
      // eslint-disable-next-line no-console
      console.log('[Pipeline] Tick Received', {
        token, ltp: rawLtp,
        sequenceNumber: frame.sequence_number,
        exchangeTimestamp: new Date(frame.exchange_timestamp).toISOString(),
        isDuplicateSequence,
      });
    }

    // Real-time push (requirement 5) — niftyOptionChain SSE stream listens
    // for this and pushes a fresh snapshot to every connected browser the
    // instant a subscribed token ticks, instead of waiting on a poll.
    this.emit('tick', token);
  }

  private teardown(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.pingInterval = null;
    this.reconnectTimeout = null;
    // Bug fix: this used to only be cleared in disconnect() (explicit
    // logout), never here — so after ANY reconnect (network blip, Angel
    // One idle timeout, routine on Railway), sendSubscribe()'s "already
    // subscribed" filter treated every previously-known token as already
    // subscribed on the brand-new socket and never resent the subscribe
    // request. Ticks for every token requested before the first reconnect
    // of the process's life went permanently dark, silently. Clearing it
    // here means the next `open` handler's sendSubscribe() call correctly
    // treats everything in pendingNfoTokens/pendingNseTokens as new again.
    this.subscribedTokens.clear();
    if (this.ws) {
      this.ws.removeAllListeners();
      // Closing a socket that never finished connecting makes the `ws`
      // library emit its own 'error' event internally — with zero listeners
      // left (removeAllListeners just ran), Node treats that as fatal and
      // crashes the process. This absorbs it; the socket is being discarded
      // either way, so there's nothing else to do with the error.
      this.ws.on('error', () => {});
      try { this.ws.close(); } catch { /* already closing/closed */ }
    }
    this.ws = null;
  }

  disconnect(): void {
    this.subscribedTokens.clear();
    this.pendingNfoTokens.clear();
    this.pendingNseTokens.clear();
    this.ticks.clear();
    this.connectingClientCode = null;
    this.teardown();
  }
}

export const angelOneWebSocketService = new AngelOneWebSocketService();
