import { Radio } from 'lucide-react';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminComingSoon } from '@components/admin/AdminComingSoon';

export default function AdminLiveActivity() {
  return (
    <div className="space-y-5 max-w-[1000px] mx-auto">
      <AdminPageHeader icon={Radio} title="Live Activity" subtitle="Real-time feed of user actions" />
      <AdminComingSoon
        icon={Radio}
        title="Live Activity Feed"
        reason="Needs Phase 2's per-user trade/broker data plus a real-time transport (SSE) that doesn't exist yet for this event stream."
      />
    </div>
  );
}
