/**
 * NIFTY Option Chain market-data constants — scoped ONLY to NIFTY index
 * options (no BANKNIFTY/FINNIFTY/equity). Instrument master URL, WebSocket
 * URL/protocol values, and the underlying's own instrument identity are
 * verified directly against Angel One's real, current data:
 *  - Instrument master: downloaded and inspected directly (33MB JSON,
 *    verified real field names: token/symbol/name/expiry/strike/lotsize/
 *    instrumenttype/exch_seg/tick_size/freeze_qty). NIFTY options are
 *    name="NIFTY", instrumenttype="OPTIDX", exch_seg="NFO". The `strike`
 *    field is the real strike × 100 (e.g. "2135000.000000" = ₹21350).
 *  - WebSocket protocol (URL, headers, subscribe request shape, binary
 *    SnapQuote frame layout): verified from the official
 *    angel-one/smartapi-javascript SDK source (lib/websocket2.0.js,
 *    config/constant.js) — not guessed.
 */

/** Official, current instrument master — Angel One recommends re-downloading periodically (tokens/lot sizes can change). */
export const INSTRUMENT_MASTER_URL = 'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json';
export const INSTRUMENT_MASTER_REFRESH_MS = 24 * 60 * 60 * 1000; // once a day, per Angel One's own guidance

/** The NIFTY 50 index itself — "Nifty 50" / name "NIFTY", instrumenttype AMXIDX, exch_seg NSE (verified from the instrument master's own first entries). */
export const NIFTY_INDEX_NAME = 'NIFTY';
export const NIFTY_INDEX_INSTRUMENT_TYPE = 'AMXIDX';
export const NIFTY_INDEX_EXCHANGE_SEGMENT = 'NSE';

export const NIFTY_OPTION_NAME = 'NIFTY';
export const NIFTY_OPTION_INSTRUMENT_TYPE = 'OPTIDX';
export const NIFTY_OPTION_EXCHANGE_SEGMENT = 'NFO';

export const ANGEL_ONE_WS_URL = 'wss://smartapisocket.angelone.in/smart-stream';
export const ANGEL_ONE_WS_PING_INTERVAL_MS = 10000;
export const ANGEL_ONE_WS_PING_MESSAGE = 'ping';

/** Verified from config/constant.js. */
export const WS_ACTION = { SUBSCRIBE: 1, UNSUBSCRIBE: 0 } as const;
export const WS_MODE = { LTP: 1, QUOTE: 2, SNAP_QUOTE: 3, DEPTH: 4 } as const;
export const WS_EXCHANGE_TYPE = {
  nse_cm: 1, nse_fo: 2, bse_cm: 3, bse_fo: 4, mcx_fo: 5, ncx_fo: 7, cde_fo: 13,
} as const;

/** SmartAPI's WS numeric price/OI fields are paise-scaled (well-established SmartAPI convention) — divide by 100 to get real ₹ values. */
export const WS_PRICE_SCALE = 100;

export const NIFTY_STRIKE_STEP = 50;
/** How many strikes around the ATM to keep subscribed/streamed — mirrors the existing UI's own "±20 strikes" default so subscription volume stays reasonable. */
export const NIFTY_DEFAULT_STRIKES_AROUND = 20;
