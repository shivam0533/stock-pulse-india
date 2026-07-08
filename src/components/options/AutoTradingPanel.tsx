import { useState } from 'react';
import { AlertTriangle, Bot, Check, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  useAutoTradingStore,
  DEFAULT_AUTO_TRADING_SETTINGS,
  type AutoTradingSettings,
} from '@store/autoTrading.store';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import { useAutoTradingStatusStore, AUTO_TRADING_STATUS_LABEL } from '@store/autoTradingStatus.store';
import { cn } from '@utils/cn';

type GuardRailDraft = Pick<
  AutoTradingSettings,
  'minConfidence' | 'maxTradesPerDay' | 'maxDailyLoss' | 'maxOpenPositions' | 'trailingStopPercent'
>;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-brand-400' : 'bg-ink-600',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

function NumberField({
  label, value, onChange, suffix,
}: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-1.5 bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 focus-within:border-brand-400/60 transition-colors">
        <input
          type="number"
          value={value}
          min={0}
          step={1}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v >= 0) onChange(v);
          }}
          className="w-full bg-transparent font-mono text-sm text-ink-50 tabular-nums outline-none"
        />
        {suffix && <span className="text-2xs text-ink-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  IDLE: 'bg-ink-500',
  WAITING_FOR_SIGNAL: 'bg-brand-400 animate-pulse-dot',
  SIGNAL_FOUND: 'bg-brand-300 animate-pulse-dot',
  ORDER_PLACED: 'bg-gain animate-pulse-dot',
  POSITION_ACTIVE: 'bg-gain',
  TARGET_HIT: 'bg-gain',
  STOP_LOSS_HIT: 'bg-loss',
};

/**
 * Auto Trading ON/OFF + every guard rail for the Auto Trading Engine. Purely
 * a settings + status surface — all execution happens in
 * useAutoTradingEngine/useTrailingStopEngine, which call the existing
 * openTrade()/exitTrade() (same functions the manual Buy button and Active
 * Trade panel use) and the existing Stop Loss %/Target Profit % from Option
 * Chain Risk Settings, unchanged. This component never places an order
 * itself.
 */
export function AutoTradingPanel() {
  const {
    enabled, lots, minConfidence, maxTradesPerDay, maxDailyLoss, maxOpenPositions,
    trailingStopEnabled, trailingStopPercent, aiReversalExitEnabled, liveTradingAcknowledged,
    setEnabled, setLots, applySettings, resetToDefault,
  } = useAutoTradingStore();
  const paperTradingOnly = useOptionChainRiskStore((s) => s.paperTradingOnly);
  const isLiveMode = !paperTradingOnly;
  const [lotsDraft, setLotsDraft] = useState(lots);
  const [draft, setDraft] = useState<GuardRailDraft>({
    minConfidence, maxTradesPerDay, maxDailyLoss, maxOpenPositions, trailingStopPercent,
  });
  const [saved, setSaved] = useState(false);

  const status = useAutoTradingStatusStore((s) => s.status);
  const statusMessage = useAutoTradingStatusStore((s) => s.message);

  const lotsChanged = lotsDraft !== lots;
  const guardRailsChanged =
    draft.minConfidence !== minConfidence ||
    draft.maxTradesPerDay !== maxTradesPerDay ||
    draft.maxDailyLoss !== maxDailyLoss ||
    draft.maxOpenPositions !== maxOpenPositions ||
    draft.trailingStopPercent !== trailingStopPercent;

  const handleApplyGuardRails = () => {
    applySettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    resetToDefault();
    setLotsDraft(DEFAULT_AUTO_TRADING_SETTINGS.lots);
    setDraft({
      minConfidence: DEFAULT_AUTO_TRADING_SETTINGS.minConfidence,
      maxTradesPerDay: DEFAULT_AUTO_TRADING_SETTINGS.maxTradesPerDay,
      maxDailyLoss: DEFAULT_AUTO_TRADING_SETTINGS.maxDailyLoss,
      maxOpenPositions: DEFAULT_AUTO_TRADING_SETTINGS.maxOpenPositions,
      trailingStopPercent: DEFAULT_AUTO_TRADING_SETTINGS.trailingStopPercent,
    });
  };

  return (
    <div className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Bot size={16} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">Auto Trading</h3>
      </div>
      <p className="text-2xs text-ink-400 mb-4 leading-relaxed">
        OFF: the AI only recommends. ON: the moment AI Trade Selection finds a
        BUY setup that clears your guard rails below, it places that order
        automatically using the existing Buy flow, Stop Loss %, and Target
        Profit % from Risk Settings above.
      </p>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs text-ink-200">Auto Trading</div>
          <div className={cn('text-2xs mt-0.5', enabled ? 'text-gain' : 'text-ink-400')}>
            {enabled ? 'ON — trades execute automatically' : 'OFF — AI only recommends'}
          </div>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {/* Live Auto Trading safety checkpoint — only shown once Paper Trading Only is OFF */}
      {isLiveMode && (
        <div
          className={cn(
            'rounded-xl border p-3 mb-4',
            liveTradingAcknowledged
              ? 'bg-ink-700/40 border-ink-600/40'
              : 'bg-loss-subtle border-loss-border',
          )}
        >
          <div className="flex items-start gap-2">
            {liveTradingAcknowledged ? (
              <ShieldAlert size={15} className="text-ink-300 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={15} className="text-loss shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className={cn('text-xs font-semibold', liveTradingAcknowledged ? 'text-ink-100' : 'text-loss')}>
                Paper Trading is OFF — real broker orders are live
              </div>
              <p className="text-2xs text-ink-300 mt-0.5 leading-relaxed">
                Auto Trading will not place a single real order until you explicitly acknowledge this. This is a
                one-time confirmation, not a per-trade one — once acknowledged, Auto Trading (if ON) executes real
                trades autonomously exactly like it does in Paper mode.
              </p>
              {!liveTradingAcknowledged && (
                <button
                  type="button"
                  onClick={() => applySettings({ liveTradingAcknowledged: true })}
                  className="mt-2 px-3 py-1.5 rounded-lg text-2xs font-semibold bg-loss text-white hover:bg-loss/90 transition-colors"
                >
                  I understand — enable Live Auto Trading
                </button>
              )}
              {liveTradingAcknowledged && (
                <button
                  type="button"
                  onClick={() => applySettings({ liveTradingAcknowledged: false })}
                  className="mt-2 px-3 py-1.5 rounded-lg text-2xs font-medium text-ink-200 border border-ink-600 hover:border-ink-400 hover:text-ink-50 transition-colors"
                >
                  Revoke Live Auto Trading acknowledgment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status readout */}
      <div className="flex items-center justify-between gap-3 bg-ink-700/40 rounded-xl px-3 py-2.5 border border-ink-600/40 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[status])} />
          <span className="text-xs font-semibold text-ink-50 truncate">{AUTO_TRADING_STATUS_LABEL[status]}</span>
        </div>
        {statusMessage && (
          <span className="text-2xs text-ink-400 truncate max-w-[55%] text-right">{statusMessage}</span>
        )}
      </div>

      <div className="border-t border-ink-600/30 pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-ink-200">Lots per Auto Trade</span>
          <span className="text-2xs text-ink-400">Manually set — the AI never decides this</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step={1}
            value={lotsDraft}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v >= 1) setLotsDraft(v);
            }}
            className="flex-1 bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 font-mono text-sm text-ink-50 outline-none focus:border-brand-400/60 transition-colors"
          />
          <button
            type="button"
            onClick={() => setLots(lotsDraft)}
            disabled={!lotsChanged}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
              lotsChanged
                ? 'bg-brand-400 text-ink-950 hover:bg-brand-300'
                : 'bg-ink-700/60 text-ink-400 cursor-not-allowed',
            )}
          >
            Save
          </button>
        </div>
      </div>

      {/* Guard rails */}
      <div className="border-t border-ink-600/30 pt-4 mt-4">
        <div className="text-xs text-ink-200 mb-2">Auto Trading Guard Rails</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumberField
            label="Min AI Confidence"
            value={draft.minConfidence}
            onChange={(v) => setDraft((d) => ({ ...d, minConfidence: v }))}
            suffix="%"
          />
          <NumberField
            label="Max Trades / Day"
            value={draft.maxTradesPerDay}
            onChange={(v) => setDraft((d) => ({ ...d, maxTradesPerDay: v }))}
          />
          <NumberField
            label="Max Daily Loss"
            value={draft.maxDailyLoss}
            onChange={(v) => setDraft((d) => ({ ...d, maxDailyLoss: v }))}
            suffix="₹"
          />
          <NumberField
            label="Max Open Positions"
            value={draft.maxOpenPositions}
            onChange={(v) => setDraft((d) => ({ ...d, maxOpenPositions: v }))}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApplyGuardRails}
            disabled={!guardRailsChanged}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
              guardRailsChanged
                ? 'bg-brand-400 text-ink-950 hover:bg-brand-300'
                : 'bg-ink-700/60 text-ink-400 cursor-not-allowed',
            )}
          >
            {saved && <Check size={13} />}
            {saved ? 'Settings Applied' : 'Apply Settings'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-ink-200 border border-ink-600 hover:border-ink-400 hover:text-ink-50 bg-ink-700/60 transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Optional trailing stop */}
      <div className="border-t border-ink-600/30 pt-4 mt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-ink-200">Trailing Stop Loss</div>
            <div className="text-2xs text-ink-400 mt-0.5">
              Optional — ratchets Stop Loss up as price rises, never down
            </div>
          </div>
          <Toggle
            checked={trailingStopEnabled}
            onChange={(v) => applySettings({ trailingStopEnabled: v })}
          />
        </div>
        {trailingStopEnabled && (
          <NumberField
            label="Trail Distance"
            value={draft.trailingStopPercent}
            onChange={(v) => {
              setDraft((d) => ({ ...d, trailingStopPercent: v }));
              applySettings({ trailingStopPercent: v });
            }}
            suffix="% below peak"
          />
        )}
      </div>

      {/* Optional AI reversal exit */}
      <div className="border-t border-ink-600/30 pt-4 mt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-ink-200">AI Reversal Exit</div>
            <div className="text-2xs text-ink-400 mt-0.5">
              Optional — exits early if the AI signal flips against the open position
            </div>
          </div>
          <Toggle
            checked={aiReversalExitEnabled}
            onChange={(v) => applySettings({ aiReversalExitEnabled: v })}
          />
        </div>
      </div>

      <p className="text-2xs text-ink-400 mt-4 pt-3 border-t border-ink-600/30">
        AI only decides Strike, CE/PE, BUY/SELL, and entry timing. Lots,
        quantity, margin, and capital are always yours to set. Auto Trading
        only ever places BUY orders — SELL signals stay recommendation-only.
      </p>
    </div>
  );
}
