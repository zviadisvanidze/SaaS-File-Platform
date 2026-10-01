'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { BillingSummary, Role } from '@/lib/types';

export default function BillingPage() {
  const { user, token } = useAuth();
  const [billing, setBilling] = useState<BillingSummary | null>(null);

  useEffect(() => {
    if (token && user?.role === Role.ADMIN) {
      api.get<BillingSummary>('/billing/current', token).then(setBilling);
    }
  }, [token, user]);

  if (user?.role !== Role.ADMIN) {
    return <p>Only company administrators can view billing.</p>;
  }

  if (!billing) {
    return <p>Loading billing...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <section className="card space-y-2">
        <p className="text-sm text-slate-500">Current plan</p>
        <p className="text-2xl font-semibold">{billing.planLabel}</p>
        <p className="text-sm text-slate-600">
          Next payment due: {new Date(billing.nextDueDate).toLocaleDateString()}
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">This month&apos;s charges</h2>
        <div className="flex justify-between text-sm">
          <span>Base plan fee</span>
          <span>${billing.breakdown.basePricePerMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Employee charges ({billing.employeeCount} employees)</span>
          <span>${billing.breakdown.employeeCharges.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>
            File overage ({billing.breakdown.overageFiles} files over the monthly limit)
          </span>
          <span>${billing.breakdown.overageCharges.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
          <span>Total due</span>
          <span>${billing.amountDueUsd.toFixed(2)}</span>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Files processed this month: {billing.filesThisMonth}. Payment processing is not part of
        this platform — this page only reflects the computed amount owed.
      </p>
    </div>
  );
}
