'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { AuditLog, Role } from '@/lib/types';

function actorLabel(log: AuditLog): string {
  if (!log.actorId) return 'System';
  return log.actorId.email;
}

export default function LogsPage() {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token && user?.role === Role.ADMIN) {
      api.get<AuditLog[]>('/logs', token).then((data) => {
        setLogs(data);
        setIsLoading(false);
      });
    }
  }, [token, user]);

  if (user?.role !== Role.ADMIN) {
    return <p>Only company administrators can view activity logs.</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Activity logs</h1>
      <section className="card">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log._id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">by {actorLabel(log)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
