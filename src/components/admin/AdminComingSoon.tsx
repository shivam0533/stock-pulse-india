import type { LucideIcon } from 'lucide-react';
import { Card } from '@components/ui';

interface AdminComingSoonProps {
  icon: LucideIcon;
  title: string;
  reason: string;
}

/** Honest placeholder for Admin Panel sections that need Phase 2/3 backend work — never fakes data to look done. */
export function AdminComingSoon({ icon: Icon, title, reason }: AdminComingSoonProps) {
  return (
    <Card className="p-10 flex flex-col items-center text-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-400/15">
        <Icon size={22} className="text-brand-300" />
      </div>
      <h3 className="font-display text-base font-semibold text-ink-50">{title} — Coming soon</h3>
      <p className="text-sm text-ink-300 max-w-md">{reason}</p>
    </Card>
  );
}
