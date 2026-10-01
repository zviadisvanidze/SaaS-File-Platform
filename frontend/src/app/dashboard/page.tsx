'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Role, StatsOverview, SubscriptionOverview } from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const requests: Promise<unknown>[] = [
      api.get<SubscriptionOverview>('/subscription', token).then(setSubscription),
    ];
    if (user?.role === Role.ADMIN) {
      requests.push(api.get<StatsOverview>('/stats/overview', token).then(setStats));
    }
    Promise.all(requests).finally(() => setIsLoading(false));
  }, [token, user]);

  if (isLoading) {
    return <p>Loading overview...</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      {subscription && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Current plan" value={subscription.label} />
          <StatCard label="Files this month" value={subscription.usage.filesThisMonth} />
          <StatCard label="Employees" value={subscription.usage.employeeCount} />
          <StatCard
            label="Monthly file limit"
            value={subscription.limits.maxFilesPerMonth}
          />
        </section>
      )}

      {stats && (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total files stored" value={stats.totalFiles} />
            <StatCard label="Storage used" value={formatBytes(stats.totalStorageBytes)} />
          </section>

          <section className="card">
            <h2 className="mb-4 text-lg font-semibold">Files uploaded per employee</h2>
            {stats.filesByEmployee.length === 0 ? (
              <p className="text-sm text-slate-500">No files uploaded yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Files uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.filesByEmployee.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-100">
                      <td className="py-2">{row.email}</td>
                      <td className="py-2">{row.fileCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
