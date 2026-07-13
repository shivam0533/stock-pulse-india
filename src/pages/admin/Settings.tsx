import { useEffect, useState } from 'react';
import { Check, Settings as SettingsIcon } from 'lucide-react';
import { Card, Button } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { adminService } from '@services/admin.service';
import { cn } from '@utils/cn';
import type { AdminSettings } from '@/types';

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-ink-100">{label}</div>
        <div className="text-xs text-ink-400 mt-0.5">{description}</div>
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
        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getSettings()
      .then((data) => { setSettings(data); setLoadError(null); })
      .catch((err) => setLoadError(err.message ?? 'Failed to load settings'));
  }, []);

  const patch = (updates: Partial<AdminSettings>) => setSettings((s) => (s ? { ...s, ...updates } : s));

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await adminService.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setSaveError((err as { message?: string }).message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[700px] mx-auto">
      <AdminPageHeader icon={SettingsIcon} title="Settings" subtitle="Real, DB-backed app settings" />

      {loadError ? (
        <p className="text-sm text-loss">{loadError}</p>
      ) : !settings ? (
        <p className="text-sm text-ink-300">Loading…</p>
      ) : (
        <>
          <Card className="p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-ink-50">Platform Controls</h3>
            <ToggleRow
              label="Maintenance Mode"
              description="Shows a banner across the app for every logged-in user"
              checked={settings.maintenanceMode}
              onChange={(v) => patch({ maintenanceMode: v })}
            />
            <div className="border-t border-ink-600/30" />
            <ToggleRow
              label="Trading Enabled"
              description="When off, new Option Chain orders (manual and Auto Trading) are blocked app-wide"
              checked={settings.tradingEnabled}
              onChange={(v) => patch({ tradingEnabled: v })}
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-ink-50">Risk Defaults</h3>
            <p className="text-xs text-ink-400">Applied automatically to every brand-new browser's Risk Settings — never overwrites a user who has already customized theirs.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink-300 mb-1">Default Max Loss %</label>
                <input
                  type="number"
                  value={settings.riskDefaults.maxLossPercent}
                  onChange={(e) => patch({ riskDefaults: { ...settings.riskDefaults, maxLossPercent: Number(e.target.value) } })}
                  className="w-full bg-ink-800 border border-ink-600 rounded-xl h-10 px-3 text-sm text-ink-50 outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-300 mb-1">Default Max Profit %</label>
                <input
                  type="number"
                  value={settings.riskDefaults.maxProfitPercent}
                  onChange={(e) => patch({ riskDefaults: { ...settings.riskDefaults, maxProfitPercent: Number(e.target.value) } })}
                  className="w-full bg-ink-800 border border-ink-600 rounded-xl h-10 px-3 text-sm text-ink-50 outline-none focus:border-brand-400 transition-colors"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-ink-50">Notification Defaults</h3>
            <ToggleRow
              label="Market Alerts"
              description="Default preference shown to new users"
              checked={settings.notificationDefaults.marketAlerts}
              onChange={(v) => patch({ notificationDefaults: { ...settings.notificationDefaults, marketAlerts: v } })}
            />
            <div className="border-t border-ink-600/30" />
            <ToggleRow
              label="Maintenance Alerts"
              description="Default preference shown to new users"
              checked={settings.notificationDefaults.maintenanceAlerts}
              onChange={(v) => patch({ notificationDefaults: { ...settings.notificationDefaults, maintenanceAlerts: v } })}
            />
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving} leftIcon={saved ? <Check size={15} /> : undefined}>
              {saved ? 'Saved' : 'Save Settings'}
            </Button>
            {saveError && <span className="text-xs text-loss">{saveError}</span>}
          </div>
        </>
      )}
    </div>
  );
}
