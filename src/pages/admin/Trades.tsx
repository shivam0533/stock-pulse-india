import { ClipboardList } from 'lucide-react';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminComingSoon } from '@components/admin/AdminComingSoon';

export default function AdminTrades() {
  return (
    <div className="space-y-5 max-w-[1000px] mx-auto">
      <AdminPageHeader icon={ClipboardList} title="Trades" subtitle="Every user's trade history" />
      <AdminComingSoon
        icon={ClipboardList}
        title="Trade History"
        reason="Trades currently live only in each user's own browser (localStorage) — there is no server-side trades table or per-user broker session yet. This needs Phase 2: a new trades table plus a write path from the trading engine, and replacing the single global Angel One session with a per-user one."
      />
    </div>
  );
}
