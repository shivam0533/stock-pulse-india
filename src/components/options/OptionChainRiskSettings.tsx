import { useState } from 'react';
import { Check, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  useOptionChainRiskStore,
  DEFAULT_OPTION_CHAIN_RISK_SETTINGS,
  type OptionChainRiskSettings as RiskSettingsShape,
} from '@store/optionChainRisk.store';
import { cn } from '@utils/cn';

// ── Sub-components ───────────────────────────────────────────────────────────
function PercentInput({
  label, hint, value, min, max, accent, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number;
  accent: 'loss' | 'gain'; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-2xs text-ink-400">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={0.5}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          className={cn(
            'flex-1 bg-ink-900/60 border rounded-xl px-3 py-2',
            'font-mono text-sm tabular-nums outline-none transition-colors',
            accent === 'loss'
              ? 'border-loss-border/60 text-loss focus:border-loss/60'
              : 'border-gain-border/60 text-gain focus:border-gain/60',
          )}
        />
        <span className="text-xs text-ink-400 shrink-0">%</span>
      </div>
    </div>
  );
}

function LimitInput({
  label, hint, value, onChange,
}: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-2xs text-ink-400">{hint}</span>
      </div>
      <input
        type="number"
        value={value}
        min={0}
        step={1}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v) && v >= 0) onChange(v);
        }}
        className="w-full bg-ink-900/60 border border-ink-600/60 rounded-xl px-3 py-2 font-mono text-sm text-ink-50 tabular-nums outline-none focus:border-brand-400/60 transition-colors"
      />
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-ink-200">{label}</div>
        <div className="text-2xs text-ink-400 mt-0.5">{description}</div>
      </div>
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
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * Risk settings scoped to the NIFTY Option Chain page only. Fully separate
 * from the Algo Trading module's RiskSettings/store — do not merge the two.
 */
export function OptionChainRiskSettings() {
  const {
    maxLossPercent, maxProfitPercent, applyAutomatically, paperTradingOnly,
    maxOrdersPerDay, maxQuantityPerTrade, maxLossPerTrade, maxConsecutiveLosses,
    applySettings, resetToDefault,
  } = useOptionChainRiskStore();

  const [draft, setDraft] = useState<RiskSettingsShape>({
    maxLossPercent, maxProfitPercent, applyAutomatically, paperTradingOnly,
    maxOrdersPerDay, maxQuantityPerTrade, maxLossPerTrade, maxConsecutiveLosses,
  });
  const [saved, setSaved] = useState(false);

  const patch = (updates: Partial<RiskSettingsShape>) => setDraft((d) => ({ ...d, ...updates }));

  const current: RiskSettingsShape = {
    maxLossPercent, maxProfitPercent, applyAutomatically, paperTradingOnly,
    maxOrdersPerDay, maxQuantityPerTrade, maxLossPerTrade, maxConsecutiveLosses,
  };
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(current);

  const handleApply = () => {
    applySettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    resetToDefault();
    setDraft(DEFAULT_OPTION_CHAIN_RISK_SETTINGS);
  };

  return (
    <div className="bg-ink-800/60 backdrop-blur-sm border border-ink-600/60 rounded-2xl shadow-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={16} className="text-brand-300" />
        <h3 className="font-display text-sm font-semibold text-ink-50">Option Chain Risk Settings</h3>
      </div>

      <div className="space-y-3.5">
        <PercentInput
          label="Maximum Loss"
          hint="Stop Loss trigger"
          value={draft.maxLossPercent}
          min={0.5}
          max={20}
          accent="loss"
          onChange={(v) => patch({ maxLossPercent: v })}
        />

        <PercentInput
          label="Maximum Profit"
          hint="Target trigger"
          value={draft.maxProfitPercent}
          min={0.5}
          max={50}
          accent="gain"
          onChange={(v) => patch({ maxProfitPercent: v })}
        />

        <div className="border-t border-ink-600/30" />

        <ToggleRow
          label="Apply Automatically"
          description="Attach Stop Loss / Target to every new trade"
          checked={draft.applyAutomatically}
          onChange={(v) => patch({ applyAutomatically: v })}
        />

        <ToggleRow
          label="Paper Trading Only"
          description="Never route Option Chain trades to a live broker"
          checked={draft.paperTradingOnly}
          onChange={(v) => patch({ paperTradingOnly: v })}
        />

        <div className="border-t border-ink-600/30" />

        <div className="text-2xs text-ink-400 uppercase tracking-wide">
          Global Risk Management <span className="normal-case text-ink-500">(0 = no limit)</span>
        </div>

        <LimitInput
          label="Max Orders Per Day"
          hint="Manual + Auto Trading"
          value={draft.maxOrdersPerDay}
          onChange={(v) => patch({ maxOrdersPerDay: v })}
        />
        <LimitInput
          label="Max Quantity Per Trade"
          hint="lotSize × lots"
          value={draft.maxQuantityPerTrade}
          onChange={(v) => patch({ maxQuantityPerTrade: v })}
        />
        <LimitInput
          label="Max Loss Per Trade (₹)"
          hint="Blocks the order upfront"
          value={draft.maxLossPerTrade}
          onChange={(v) => patch({ maxLossPerTrade: v })}
        />
        <LimitInput
          label="Stop After Consecutive Losses"
          hint="Disables Buy for the rest of the day"
          value={draft.maxConsecutiveLosses}
          onChange={(v) => patch({ maxConsecutiveLosses: v })}
        />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasChanges}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
              hasChanges
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
            Reset to Default
          </button>
        </div>

        {/* Currently-applied snapshot */}
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-ink-600/30">
          {[
            { label: 'Max Loss',   value: `${maxLossPercent}%` },
            { label: 'Max Profit', value: `${maxProfitPercent}%` },
            { label: 'Auto Apply', value: applyAutomatically ? 'ON' : 'OFF' },
            { label: 'Paper Only', value: paperTradingOnly ? 'ON' : 'OFF' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-2xs">
              <span className="text-ink-400">{label}</span>
              <span className="font-mono text-ink-200">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
