import { Badge } from '@components/ui';
import type { UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

const ROLE_VARIANT: Record<UserRole, 'amber' | 'gain' | 'default'> = {
  super_admin: 'amber',
  admin: 'gain',
  user: 'default',
};

/** Shared 3-tier role display — reused on Users.tsx and UserDetail.tsx so the two never drift on labeling/coloring. */
export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
