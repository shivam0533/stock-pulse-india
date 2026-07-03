import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Modal, Button } from '@components/ui';
import { formatIndianNumber } from '@utils/format';
import { cn } from '@utils/cn';
import type { PriceAlert } from '@/types';

interface PriceAlertModalProps {
  open: boolean;
  symbol: string;
  currentPrice: number;
  existing: PriceAlert | null | undefined;
  onSave: (alert: Omit<PriceAlert, 'triggered'>) => void;
  onClear: () => void;
  onClose: () => void;
}

export function PriceAlertModal({
  open, symbol, currentPrice, existing,
  onSave, onClear, onClose,
}: PriceAlertModalProps) {
  const [direction, setDirection] = useState<'above' | 'below'>(existing?.direction ?? 'above');
  const [price, setPrice] = useState(String(existing?.price ?? ''));

  const handleSave = () => {
    const n = parseFloat(price);
    if (!isNaN(n) && n > 0) { onSave({ price: n, direction }); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Price Alert · ${symbol}`} size="sm">
      <div className="space-y-5">
        {/* Current price reference */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/60 border border-ink-600/40">
          <Bell size={16} className="text-brand-300" />
          <div>
            <div className="text-2xs text-ink-300 uppercase tracking-wide">Current Price</div>
            <div className="font-mono text-lg font-bold text-ink-50 tabular-nums">
              ₹{formatIndianNumber(currentPrice)}
            </div>
          </div>
        </div>

        {/* Direction toggle */}
        <div>
          <div className="text-xs text-ink-300 mb-2">Alert me when price goes</div>
          <div className="grid grid-cols-2 gap-2">
            {(['above', 'below'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  direction === d
                    ? d === 'above'
                      ? 'bg-gain-subtle text-gain border-gain-border'
                      : 'bg-loss-subtle text-loss border-loss-border'
                    : 'bg-ink-800 text-ink-300 border-ink-600 hover:border-ink-500',
                )}
              >
                ↑ {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Price input */}
        <div>
          <div className="text-xs text-ink-300 mb-2">Target price</div>
          <div className="relative flex items-center bg-ink-900 border border-ink-600 rounded-xl focus-within:border-brand-400/60 transition-colors">
            <span className="ml-3.5 text-ink-300 text-sm font-mono">₹</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={formatIndianNumber(currentPrice, 0)}
              className="flex-1 bg-transparent h-11 px-2.5 text-sm font-mono text-ink-50 placeholder:text-ink-400 outline-none tabular-nums"
            />
          </div>
          {price && !isNaN(parseFloat(price)) && (
            <div className="mt-1.5 text-2xs text-ink-400">
              Alert when {symbol} goes {direction} ₹{formatIndianNumber(parseFloat(price), 0)}
              {' '}({direction === 'above' ? '+' : '-'}{Math.abs(((parseFloat(price) - currentPrice) / currentPrice) * 100).toFixed(1)}% from now)
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {existing && !existing.triggered && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { onClear(); onClose(); }}
              leftIcon={<BellOff size={13} />}
              className="flex-1"
            >
              Clear Alert
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0}
            leftIcon={<Bell size={13} />}
            fullWidth={!existing || !!existing.triggered}
            className={existing && !existing.triggered ? 'flex-1' : ''}
          >
            Set Alert
          </Button>
        </div>
      </div>
    </Modal>
  );
}
