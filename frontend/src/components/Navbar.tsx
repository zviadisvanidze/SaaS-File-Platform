'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Role } from '@/lib/types';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', adminOnly: false },
  { href: '/dashboard/files', label: 'Files', adminOnly: false },
  { href: '/dashboard/subscription', label: 'Subscription', adminOnly: false },
  { href: '/dashboard/profile', label: 'Profile', adminOnly: false },
  { href: '/dashboard/employees', label: 'Employees', adminOnly: true },
  { href: '/dashboard/billing', label: 'Billing', adminOnly: true },
  { href: '/dashboard/logs', label: 'Activity logs', adminOnly: true },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
      <div>
        <h2 className="mb-6 px-2 text-lg font-bold text-brand-700">SaaS Platform</h2>
        <nav className="space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === Role.ADMIN).map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
        <p className="px-2 text-xs uppercase tracking-wide text-slate-400">{user?.role}</p>
        <button onClick={handleLogout} className="btn-secondary w-full">
          Log out
        </button>
      </div>
    </aside>
  );
}
