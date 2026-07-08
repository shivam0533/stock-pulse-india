import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button } from '@components/ui';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { getActiveBrokerAdapter } from '@services/broker/brokerExecution.service';
import { getLotSize } from '@config/lotSize.config';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { OptionOrderType, OptionProductType } from '@services/broker/broker.types';

const ORDER_TYPES: OptionOrderType[] = ['MARKET', 'LIMIT', 'SL', 'SL-M'];
const PRODUCT_TYPES: { id: OptionProductType; label: string; hint: string }[] = [
  { id: 'INTRADAY', label: 'Intraday (MIS)', hint: 'Auto square-off at 3:20 PM' },
  { id: 'CARRYFORWARD', label: 'Carryforward (NRML)', hint: 'Held overnight — carries gap risk' },
];

export interface OrderDraft {
  strike: number;
  side: 'CE' | 'PE';
  expiry: string;
  /** Angel One instrument-master expiry key (e.g. "07JUL2026") — present only for a live chain; needed to resolve the correct symbolToken automatically for a real order. */
  expiryRaw?: string;
  ltp: number;
}

interface OrderWindowModalProps {
  draft: OrderDraft | null;
  onClose: () => void;
}

const LOT_PRESETS = [1, 2, 3, 5, 10];

function InfoTile({
  label, value, accent = 'neutral',
}: { label: string; value: string; accent?: 'gain' | 'loss' | 'brand' | 'neutral' }) {
  const textClass = {
    gain: 'text-gain', loss: 'text-loss', brand: 'text-brand-300', neutral: 'text-ink-50',
  }[accent];

  return (
    <div className="bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 min-w-0">
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1 whitespace-nowrap">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums truncate', textClass)}>{value}</div>
    </div>
  );
}

function isValidLots(lots: number): boolean {
  return Number.isInteger(lots) && lots >= 1;
}

export function OrderWindowModal({ draft, onClose }: OrderWindowModalProps) {
  const openTrade = useOptionTradeStore((s) => s.openTrade);
  const risk = useOptionChainRiskStore();
  // Mirrors the same adapter resolution openTrade() uses, so the preview here
  // always matches what actually gets applied when Buy is clicked.
  const usedAdapterId = risk.paperTradingOnly ? 'PAPER' : getActiveBrokerAdapter().id;
  const lotSize = getLotSize('NIFTY', usedAdapterId === 'PAPER');

  const [lots, setLots] = useState(1);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('1');
  const [localError, setLocalError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OptionOrderType>('MARKET');
  const [productType, setProductType] = useState<OptionProductType>('INTRADAY');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');

  // Reset the form whenever a fresh order window opens for a (possibly different) strike
  useEffect(() => {
    if (!draft) return;
    setLots(1);
    setCustomMode(false);
    setCustomInput('1');
    setLocalError(null);
    setOrderType('MARKET');
    setProductType('INTRADAY');
    setLimitPrice('');
    setTriggerPrice('');
  }, [draft?.strike, draft?.side, draft?.expiry]);

  if (!draft) return null;

  const quantity   = lotSize * lots;
  const limitPriceNum   = parseFloat(limitPrice);
  const triggerPriceNum = parseFloat(triggerPrice);
  const needsLimitPrice   = orderType === 'LIMIT';
  const needsTriggerPrice = orderType === 'SL' || orderType === 'SL-M';
  const limitPriceValid   = !needsLimitPrice || (Number.isFinite(limitPriceNum) && limitPriceNum > 0);
  const triggerPriceValid = !needsTriggerPrice || (Number.isFinite(triggerPriceNum) && triggerPriceNum > 0);
  // Estimated cost mirrors what the broker will actually be asked to reserve:
  // the limit price for a LIMIT order, otherwise the live premium shown at click time.
  const estimatedPrice = needsLimitPrice && limitPriceValid ? limitPriceNum : draft.ltp;
  const investment = +(estimatedPrice * quantity).toFixed(2);
  const maxLossAmount   = +(investment * risk.maxLossPercent / 100).toFixed(2);
  const maxProfitAmount = +(investment * risk.maxProfitPercent / 100).toFixed(2);
  const lotsValid = isValidLots(lots);
  const formValid = lotsValid && limitPriceValid && triggerPriceValid;

  const handleCustomChange = (raw: string) => {
    setCustomInput(raw);
    const v = parseInt(raw, 10);
    setLots(Number.isNaN(v) ? 0 : v);
  };

  const [placingOrder, setPlacingOrder] = useState(false);

  const handleBuy = async () => {
    if (!formValid) return;
    setPlacingOrder(true);
    setLocalError(null);
    try {
      const opened = await openTrade({
        strike: draft.strike,
        side: draft.side,
        expiry: draft.expiry,
        expiryRaw: draft.expiryRaw,
        entryPrice: draft.ltp,
        lots,
        orderType,
        productType,
        limitPrice: needsLimitPrice ? limitPriceNum : undefined,
        triggerPrice: needsTriggerPrice ? triggerPriceNum : undefined,
      });
      if (opened) {
        onClose();
      } else {
        setLocalError(useOptionTradeStore.getState().tradeError);
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const isCall = draft.side === 'CE';

  return (
    <Modal open={!!draft} onClose={onClose} title="Place Order" size="md">
      <div className="space-y-4">
        {/* ── Identity ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-xl font-bold text-ink-50 tracking-tight">
              NIFTY {formatIndianNumber(draft.strike, 0)}{' '}
              <span className={isCall ? 'text-loss' : 'text-gain'}>{draft.side}</span>
            </div>
            <div className="text-xs text-ink-300 mt-0.5">{draft.expiry}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xs text-ink-400 uppercase tracking-wide">Current Premium</div>
            <div className="font-mono text-lg font-semibold text-ink-50">₹{formatIndianNumber(draft.ltp)}</div>
          </div>
        </div>

        {/* ── Index / Lot size ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <InfoTile label="Index" value="NIFTY" />
          <InfoTile label="Lot Size" value={String(lotSize)} />
        </div>

        {/* ── Lots picker ──────────────────────────────────────────────────── */}
        <div>
          <div className="text-xs text-ink-200 mb-1.5">Lots</div>
          <div className="flex flex-wrap gap-1.5">
            {LOT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setLots(n); setCustomMode(false); }}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
                  !customMode && lots === n
                    ? 'bg-brand-400/20 text-brand-300 border-brand-400/50'
                    : 'bg-ink-700/40 text-ink-200 border-ink-600 hover:border-ink-500',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
                customMode
                  ? 'bg-brand-400/20 text-brand-300 border-brand-400/50'
                  : 'bg-ink-700/40 text-ink-200 border-ink-600 hover:border-ink-500',
              )}
            >
              Custom
            </button>
          </div>
          {customMode && (
            <input
              type="number"
              min={1}
              step={1}
              value={customInput}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Enter number of lots"
              autoFocus
              className="mt-2 w-full bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 font-mono text-sm text-ink-50 outline-none focus:border-brand-400/60 transition-colors"
            />
          )}
          {!lotsValid && (
            <p className="text-2xs text-loss mt-1.5">Enter a whole number of lots (minimum 1).</p>
          )}
        </div>

        {/* ── Order type ───────────────────────────────────────────────────── */}
        <div>
          <div className="text-xs text-ink-200 mb-1.5">Order Type</div>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
                  orderType === t
                    ? 'bg-brand-400/20 text-brand-300 border-brand-400/50'
                    : 'bg-ink-700/40 text-ink-200 border-ink-600 hover:border-ink-500',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {needsLimitPrice && (
            <input
              type="number"
              min={0}
              step={0.05}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Limit price"
              className="mt-2 w-full bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 font-mono text-sm text-ink-50 outline-none focus:border-brand-400/60 transition-colors"
            />
          )}
          {needsTriggerPrice && (
            <input
              type="number"
              min={0}
              step={0.05}
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(e.target.value)}
              placeholder="Trigger price"
              className="mt-2 w-full bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 font-mono text-sm text-ink-50 outline-none focus:border-brand-400/60 transition-colors"
            />
          )}
          {needsLimitPrice && !limitPriceValid && (
            <p className="text-2xs text-loss mt-1.5">Enter a valid limit price.</p>
          )}
          {needsTriggerPrice && !triggerPriceValid && (
            <p className="text-2xs text-loss mt-1.5">Enter a valid trigger price.</p>
          )}
        </div>

        {/* ── Product type ─────────────────────────────────────────────────── */}
        <div>
          <div className="text-xs text-ink-200 mb-1.5">Product Type</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRODUCT_TYPES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductType(p.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-left border transition-colors',
                  productType === p.id
                    ? 'bg-brand-400/20 border-brand-400/50'
                    : 'bg-ink-700/40 border-ink-600 hover:border-ink-500',
                )}
              >
                <div className={cn('text-sm font-semibold', productType === p.id ? 'text-brand-300' : 'text-ink-100')}>
                  {p.label}
                </div>
                <div className="text-2xs text-ink-300 mt-0.5">{p.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Quantity / Estimated cost ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <InfoTile label="Quantity" value={lotsValid ? String(quantity) : '—'} />
          <InfoTile
            label="Estimated Cost"
            value={lotsValid ? `₹${formatIndianNumber(investment, 0)}` : '—'}
            accent="brand"
          />
        </div>

        {/* ── Risk preview ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <InfoTile
            label={`Max Loss (${risk.maxLossPercent}%)`}
            value={lotsValid ? `₹${formatIndianNumber(maxLossAmount, 0)}` : '—'}
            accent="loss"
          />
          <InfoTile
            label={`Max Profit (${risk.maxProfitPercent}%)`}
            value={lotsValid ? `₹${formatIndianNumber(maxProfitAmount, 0)}` : '—'}
            accent="gain"
          />
        </div>

        {localError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-loss-subtle border border-loss-border text-xs text-loss">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={placingOrder}>
            Cancel
          </Button>
          <Button
            fullWidth
            disabled={!formValid || placingOrder}
            loading={placingOrder}
            onClick={handleBuy}
            className={isCall ? 'bg-loss text-white hover:bg-loss/90' : 'bg-gain text-ink-950 hover:bg-gain/90'}
          >
            Buy {draft.side}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
