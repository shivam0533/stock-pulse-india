import { useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { Button } from '@components/ui';
import { cn } from '@utils/cn';
import type { DailyRiskSettings } from '@/types';

interface RiskSettingsProps {
  settings: DailyRiskSettings;
  disabled?: boolean;
  onSave: (settings: DailyRiskSettings) => void;
}

function NumberInput({
  label, description, value, min, max, step = 1, unit, disabled,
  onChange,
}: {
  label: string; description: string; value: number; min: number;
  max: number; step?: number; unit?: string; disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-2xs text-ink-400">{description}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          className={cn(
            'flex-1 bg-ink-900/60 border border-ink-600/40 rounded-xl px-3 py-2',
            'font-mono text-sm text-ink-50 tabular-nums outline-none transition-colors',
            'focus:border-brand-400/60',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-ink-500',
          )}
        />
        {unit && <span className="text-xs text-ink-400 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

export function RiskSettings({ settings, disabled, onSave }: RiskSettingsProps) {
  const [draft, setDraft] = useState<DailyRiskSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const patch = (key: keyof DailyRiskSettings, value: number | boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-600/40">
        <Settings2 size={14} className="text-brand-300" />
        <span className="font-display text-sm font-semibold text-ink-50">Risk Settings</span>
        {disabled && (
          <span className="ml-auto text-2xs text-ink-400">Stop bot to edit</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <NumberInput
          label="Max Trades / Day"
          description="Daily trade cap"
          value={draft.maxTradesPerDay}
          min={1} max={50}
          unit="trades"
          disabled={disabled}
          onChange={(v) => patch('maxTradesPerDay', v)}
        />
        <NumberInput
          label="Max Daily Losses"
          description="Auto-halt trigger"
          value={draft.maxDailyLosses}
          min={1} max={20}
          unit="losses"
          disabled={disabled}
          onChange={(v) => patch('maxDailyLosses', v)}
        />
        <NumberInput
          label="Risk Per Trade"
          description="Capital at risk"
          value={draft.riskPerTrade}
          min={0.1} max={10} step={0.1}
          unit="% capital"
          disabled={disabled}
          onChange={(v) => patch('riskPerTrade', v)}
        />

        {/* Auto Stop toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-200">Auto Stop Trading</div>
              <div className="text-2xs text-ink-400 mt-0.5">Halt on loss limit automatically</div>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && patch('autoStop', !draft.autoStop)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                draft.autoStop ? 'bg-gain' : 'bg-ink-600',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  draft.autoStop ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </div>

        <Button
          variant={saved ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleSave}
          disabled={disabled || !hasChanges}
          fullWidth
          leftIcon={saved ? <Check size={13} /> : undefined}
        >
          {saved ? 'Settings Saved' : 'Apply Settings'}
        </Button>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-ink-600/30">
          {[
            { label: 'Max Trades', value: settings.maxTradesPerDay },
            { label: 'Max Losses', value: settings.maxDailyLosses },
            { label: 'Risk/Trade', value: `${settings.riskPerTrade}%` },
            { label: 'Auto Stop', value: settings.autoStop ? 'ON' : 'OFF' },
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
