import axios from 'axios';
import {
  INSTRUMENT_MASTER_URL,
  INSTRUMENT_MASTER_REFRESH_MS,
  NIFTY_INDEX_NAME,
  NIFTY_INDEX_INSTRUMENT_TYPE,
  NIFTY_INDEX_EXCHANGE_SEGMENT,
  NIFTY_OPTION_NAME,
  NIFTY_OPTION_INSTRUMENT_TYPE,
  NIFTY_OPTION_EXCHANGE_SEGMENT,
} from './nifty.constants';
import type { NiftyInstrument, NiftyExpiryInfo, OptionSide } from './nifty.types';

/** Raw shape of one entry in Angel One's instrument master (verified directly by downloading and inspecting the real file — field names are exact). */
interface RawInstrument {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
  freeze_qty?: string;
}

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/** Parses the instrument master's "DDMMMYYYY" expiry string (e.g. "07JUL2026") into a real Date at IST midnight. */
function parseExpiryDate(raw: string): Date | null {
  const match = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(raw);
  if (!match) return null;
  const [, dd, mmm, yyyy] = match;
  const month = MONTHS[mmm];
  if (month === undefined) return null;
  // Construct at IST midnight (UTC 18:30 previous day) so `date`/`dte` read correctly regardless of server timezone.
  return new Date(Date.UTC(Number(yyyy), month, Number(dd), -5, -30));
}

function daysBetween(a: Date, b: Date): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function formatLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
}

/**
 * Downloads, filters, and indexes Angel One's real instrument master —
 * scoped to ONLY NIFTY index options (name=NIFTY, instrumenttype=OPTIDX,
 * exch_seg=NFO) plus the NIFTY 50 index itself, per this task's explicit
 * "ONLY NIFTY Options" scope. No BANKNIFTY/FINNIFTY/equity instruments are
 * ever kept in memory. Refreshed once a day (Angel One's own guidance),
 * plus once on first use — never hardcoded, always the live file.
 */
export class InstrumentMasterService {
  private optionsByExpiry: Map<string, NiftyInstrument[]> = new Map();
  private expiries: NiftyExpiryInfo[] = [];
  private niftyIndexToken: string | null = null;
  private lastLoadedAt: number | null = null;
  private loadingPromise: Promise<void> | null = null;

  /** Loads on first use, then re-checks every INSTRUMENT_MASTER_REFRESH_MS — call this before reading any data below. */
  async ensureLoaded(): Promise<void> {
    const isStale = !this.lastLoadedAt || Date.now() - this.lastLoadedAt >= INSTRUMENT_MASTER_REFRESH_MS;
    if (!isStale) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.load();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async load(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[InstrumentMaster] downloading', { url: INSTRUMENT_MASTER_URL });
    const { data } = await axios.get<RawInstrument[]>(INSTRUMENT_MASTER_URL, {
      timeout: 60000,
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024,
    });

    let niftyIndexToken: string | null = null;
    const byExpiry = new Map<string, NiftyInstrument[]>();

    for (const row of data) {
      if (
        !niftyIndexToken &&
        row.name === NIFTY_INDEX_NAME &&
        row.instrumenttype === NIFTY_INDEX_INSTRUMENT_TYPE &&
        row.exch_seg === NIFTY_INDEX_EXCHANGE_SEGMENT
      ) {
        niftyIndexToken = row.token;
        continue;
      }

      if (
        row.name !== NIFTY_OPTION_NAME ||
        row.instrumenttype !== NIFTY_OPTION_INSTRUMENT_TYPE ||
        row.exch_seg !== NIFTY_OPTION_EXCHANGE_SEGMENT
      ) {
        continue;
      }

      const side: OptionSide | null = row.symbol.endsWith('CE') ? 'CE' : row.symbol.endsWith('PE') ? 'PE' : null;
      if (!side) continue;

      const instrument: NiftyInstrument = {
        token: row.token,
        symbol: row.symbol,
        expiry: row.expiry,
        strike: Number(row.strike) / 100,
        side,
        lotSize: Number(row.lotsize),
        tickSize: Number(row.tick_size),
        // Angel One's own file sometimes omits this for far-dated/illiquid
        // contracts — 0 means "not specified", callers must treat that as
        // "no exchange-provided cap" rather than "reject everything".
        freezeQty: row.freeze_qty ? Number(row.freeze_qty) : 0,
      };

      const list = byExpiry.get(row.expiry);
      if (list) list.push(instrument);
      else byExpiry.set(row.expiry, [instrument]);
    }

    if (!niftyIndexToken) {
      throw new Error('NIFTY 50 index instrument not found in Angel One instrument master.');
    }
    if (byExpiry.size === 0) {
      throw new Error('No NIFTY option contracts found in Angel One instrument master.');
    }

    // Determine weekly vs monthly: the latest expiry within each calendar month is "monthly".
    const parsed = [...byExpiry.keys()]
      .map((raw) => ({ raw, date: parseExpiryDate(raw) }))
      .filter((e): e is { raw: string; date: Date } => e.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const latestInMonth = new Map<string, number>(); // "YYYY-MM" -> max timestamp
    for (const e of parsed) {
      const key = `${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`;
      const current = latestInMonth.get(key);
      if (!current || e.date.getTime() > current) latestInMonth.set(key, e.date.getTime());
    }

    const now = new Date();
    const expiries: NiftyExpiryInfo[] = parsed.map((e) => {
      const key = `${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`;
      const isMonthly = latestInMonth.get(key) === e.date.getTime();
      const lotSize = byExpiry.get(e.raw)?.[0]?.lotSize ?? 0;
      return {
        raw: e.raw,
        date: e.date.getTime(),
        label: formatLabel(e.date),
        dte: Math.max(0, daysBetween(now, e.date)),
        type: isMonthly ? 'monthly' : 'weekly',
        lotSize,
      };
    });

    this.optionsByExpiry = byExpiry;
    this.expiries = expiries;
    this.niftyIndexToken = niftyIndexToken;
    this.lastLoadedAt = Date.now();

    // eslint-disable-next-line no-console
    console.log('[InstrumentMaster] loaded', {
      expiries: expiries.length,
      contracts: [...byExpiry.values()].reduce((sum, arr) => sum + arr.length, 0),
    });
  }

  getNiftyIndexToken(): string {
    if (!this.niftyIndexToken) throw new Error('Instrument master not loaded yet.');
    return this.niftyIndexToken;
  }

  /** Expiries sorted chronologically, nearest first — never hardcoded, always derived from the live file. */
  getExpiries(): NiftyExpiryInfo[] {
    return this.expiries;
  }

  getContractsForExpiry(expiryRaw: string): NiftyInstrument[] {
    return this.optionsByExpiry.get(expiryRaw) ?? [];
  }

  /** Automatic symbolToken resolution (requirement 4) — the only way the order-placement/quote paths ever learn a real token. */
  resolve(expiryRaw: string, strike: number, side: OptionSide): NiftyInstrument | undefined {
    return this.optionsByExpiry.get(expiryRaw)?.find((c) => c.strike === strike && c.side === side);
  }
}

export const instrumentMasterService = new InstrumentMasterService();
