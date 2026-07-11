import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { Card, Badge, Avatar, Skeleton } from '@components/ui';
import { AdminPageHeader } from '@components/admin/AdminPageHeader';
import { AdminSearchBar } from '@components/admin/AdminSearchBar';
import { adminService } from '@services/admin.service';
import type { AdminUserSummary } from '@/types';

const DEBOUNCE_MS = 300;

export default function AdminSupport() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AdminUserSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  // Guards against a slower earlier keystroke's response overwriting a
  // faster later one's results (classic out-of-order-response race).
  const latestQueryRef = useRef('');

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setSearched(false); setLoading(false); return; }

    setLoading(true);
    const id = setTimeout(() => {
      latestQueryRef.current = trimmed;
      adminService.searchSupport(trimmed)
        .then((res) => {
          if (latestQueryRef.current !== trimmed) return; // a newer keystroke already superseded this
          setResults(res.items);
          setSearched(true);
        })
        .catch(() => {})
        .finally(() => {
          if (latestQueryRef.current === trimmed) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="space-y-5 max-w-[900px] mx-auto">
      <AdminPageHeader icon={LifeBuoy} title="Support" subtitle="Find a user by phone, email, name, or client ID" />

      <AdminSearchBar value={q} onChange={setQ} placeholder="Search phone, email, name, or client ID…" />

      <Card>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : !searched ? (
          <p className="text-sm text-ink-300 text-center py-16">Start typing to search.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-16">No matching users.</p>
        ) : (
          <div className="divide-y divide-ink-600/20">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => navigate(`/admin/users/${u.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-700/25 transition-colors text-left"
              >
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-50 font-medium">{u.name}</div>
                  <div className="text-xs text-ink-300 truncate">{u.email} · {u.phone ?? 'No phone'}</div>
                </div>
                <Badge variant={u.kycStatus === 'verified' ? 'gain' : u.kycStatus === 'rejected' ? 'loss' : 'neutral'}>
                  {u.kycStatus}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
