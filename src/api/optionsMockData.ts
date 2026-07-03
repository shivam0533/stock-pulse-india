import type { OptionChainData, OptionExpiry, OptionStrike } from '@/types';

// ─── Math helpers ────────────────────────────────────────────────────────────

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp((-x * x) / 2);
  const poly =
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - d * poly;
  return x >= 0 ? p : 1 - p;
}

function bsCall(S: number, K: number, T: number, r: number, σ: number): number {
  if (T <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + (σ * σ) / 2) * T) / (σ * Math.sqrt(T));
  const d2 = d1 - σ * Math.sqrt(T);
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

function bsPut(S: number, K: number, T: number, r: number, σ: number): number {
  if (T <= 0) return Math.max(K - S, 0);
  const d1 = (Math.log(S / K) + (r + (σ * σ) / 2) * T) / (σ * Math.sqrt(T));
  const d2 = d1 - σ * Math.sqrt(T);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

// Volatility smile: ATM has lowest IV, wings curve up
function smile(K: number, S: number, baseVol = 0.145): number {
  const m = (K - S) / S;
  return baseVol + 1.8 * m * m + (m < 0 ? 0.012 : 0.005); // skew: downside vol higher
}

// Seeded deterministic random for stable data
function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.abs(x - Math.floor(x));
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── OI distribution ─────────────────────────────────────────────────────────

function callOI(strike: number, atm: number, dte: number): number {
  const dist = strike - atm;
  // Typical: sellers write OTM calls → high OI at OTM calls; ATM moderate
  const base = strike % 1000 === 0 ? 1.6 : strike % 500 === 0 ? 1.25 : 1.0;
  const shape =
    dist >= 0
      ? Math.exp(-0.5 * (dist / 400) ** 2) * 1.2  // OTM calls popular for hedging
      : Math.exp(-0.5 * (dist / 250) ** 2) * 0.7;  // deep ITM calls less OI
  const noise = 0.55 + 0.9 * seeded(strike * 7 + dte * 11);
  return Math.max(500, Math.round(base * shape * noise * 95_000));
}

function putOI(strike: number, atm: number, dte: number): number {
  const dist = strike - atm;
  // OTM puts popular as insurance → high OI below ATM
  const base = strike % 1000 === 0 ? 1.7 : strike % 500 === 0 ? 1.3 : 1.0;
  const shape =
    dist <= 0
      ? Math.exp(-0.5 * (dist / 400) ** 2) * 1.3
      : Math.exp(-0.5 * (dist / 300) ** 2) * 0.75;
  const noise = 0.55 + 0.9 * seeded(strike * 13 + dte * 7);
  return Math.max(500, Math.round(base * shape * noise * 110_000));
}

// ─── Generator ───────────────────────────────────────────────────────────────

const NIFTY_SPOT = 24_586;
const RISK_FREE_RATE = 0.065;
const STRIKE_STEP = 50;
const MIN_STRIKE = 23_000;
const MAX_STRIKE = 26_000;

export const OPTION_EXPIRIES: OptionExpiry[] = [
  { label: '03 Jul 2026', date: new Date('2026-07-03').getTime(), dte: 3, type: 'weekly' },
  { label: '10 Jul 2026', date: new Date('2026-07-10').getTime(), dte: 10, type: 'weekly' },
  { label: '31 Jul 2026', date: new Date('2026-07-31').getTime(), dte: 31, type: 'monthly' },
  { label: '27 Aug 2026', date: new Date('2026-08-27').getTime(), dte: 58, type: 'monthly' },
  { label: '25 Sep 2026', date: new Date('2026-09-25').getTime(), dte: 87, type: 'monthly' },
];

export function generateOptionChain(expiryIndex = 0): OptionChainData {
  const expiry = OPTION_EXPIRIES[expiryIndex];
  const T = expiry.dte / 365;
  const r = RISK_FREE_RATE;
  const S = NIFTY_SPOT;
  const atm = Math.round(S / STRIKE_STEP) * STRIKE_STEP;

  const strikes: OptionStrike[] = [];
  let totalCallOI = 0;
  let totalPutOI = 0;

  for (let K = MIN_STRIKE; K <= MAX_STRIKE; K += STRIKE_STEP) {
    const σC = smile(K, S);
    const σP = smile(K, S) + 0.003; // put IV slightly higher

    const cLTP = roundTo2(Math.max(0.05, bsCall(S, K, T, r, σC)));
    const pLTP = roundTo2(Math.max(0.05, bsPut(S, K, T, r, σP)));

    const cOI = callOI(K, atm, expiry.dte);
    const pOI = putOI(K, atm, expiry.dte);
    totalCallOI += cOI;
    totalPutOI += pOI;

    const cChg = Math.round((seeded(K * 3 + expiry.dte) - 0.4) * cOI * 0.18);
    const pChg = Math.round((seeded(K * 5 + expiry.dte) - 0.38) * pOI * 0.18);
    const cVol = Math.round(seeded(K * 2 + expiry.dte * 3) * cOI * 0.4);
    const pVol = Math.round(seeded(K * 4 + expiry.dte * 5) * pOI * 0.4);

    strikes.push({
      strike: K,
      callLTP: cLTP,
      callOI: cOI,
      callChgOI: cChg,
      callVolume: cVol,
      callIV: roundTo2(σC * 100),
      putLTP: pLTP,
      putOI: pOI,
      putChgOI: pChg,
      putVolume: pVol,
      putIV: roundTo2(σP * 100),
    });
  }

  // Max pain: find strike where total option writer pain is minimised
  let maxPainStrike = atm;
  let minWriterPain = Infinity;
  for (const row of strikes) {
    let pain = 0;
    for (const r2 of strikes) {
      pain += r2.callOI * Math.max(0, r2.strike - row.strike);
      pain += r2.putOI * Math.max(0, row.strike - r2.strike);
    }
    if (pain < minWriterPain) {
      minWriterPain = pain;
      maxPainStrike = row.strike;
    }
  }

  return {
    expiry,
    spotPrice: S,
    atmStrike: atm,
    strikes,
    pcr: roundTo2(totalPutOI / totalCallOI),
    maxPain: maxPainStrike,
    totalCallOI,
    totalPutOI,
    updatedAt: Date.now(),
  };
}
