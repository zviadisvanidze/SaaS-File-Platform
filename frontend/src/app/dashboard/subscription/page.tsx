'use client';

import { useEffect, useState } from 'react';
import { useAuth, isApiError } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Role, SubscriptionOverview, SubscriptionPlan } from '@/lib/types';

const PLAN_ORDER = [SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM];

function describePrice(plan: SubscriptionOverview['availablePlans'][SubscriptionPlan]): string {
  if (plan.plan === SubscriptionPlan.FREE) return 'Free';
  if (plan.plan === SubscriptionPlan.BASIC) return `$${plan.pricePerEmployee} / employee / month`;
  return `$${plan.basePricePerMonth} / month + $${plan.overageFilePrice} per file over ${plan.maxFilesPerMonth}`;
}

export default function SubscriptionPage() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);

  async function loadOverview() {
    const data = await api.get<SubscriptionOverview>('/subscription', token);
    setOverview(data);
  }

  useEffect(() => {
    if (token) loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleChangePlan(plan: SubscriptionPlan) {
    setError(null);
    setMessage(null);
    setPendingPlan(plan);
    try {
      await api.patch('/subscription', { plan }, token);
      setMessage(`Subscription switched to ${plan}.`);
      await loadOverview();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to change plan.');
    } finally {
      setPendingPlan(null);
    }
  }

  if (!overview) {
    return <p>Loading subscription...</p>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Subscription</h1>

      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">Current plan: {overview.label}</h2>
        <p className="text-sm text-slate-600">
          {overview.usage.filesThisMonth} / {overview.limits.maxFilesPerMonth} files used this
          month · {overview.usage.employeeCount} employee(s)
          {overview.limits.maxEmployees !== null ? ` (max ${overview.limits.maxEmployees})` : ' (unlimited)'}
        </p>
        <p className="text-xs text-slate-400">
          Billing day of month: {overview.billingAnchorDay}
        </p>
      </section>

      {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</p>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planKey) => {
          const plan = overview.availablePlans[planKey];
          const isCurrent = overview.plan === planKey;
          return (
            <div key={planKey} className={`card space-y-3 ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}>
              <h3 className="text-lg font-semibold">{plan.label}</h3>
              <p className="text-sm text-slate-600">{describePrice(plan)}</p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>Up to {plan.maxFilesPerMonth} files / month</li>
                <li>
                  {Number.isFinite(plan.maxEmployees)
                    ? `Up to ${plan.maxEmployees} employees`
                    : 'Unlimited employees'}
                </li>
              </ul>
              {user?.role === Role.ADMIN && (
                <button
                  disabled={isCurrent || pendingPlan === planKey}
                  onClick={() => handleChangePlan(planKey)}
                  className={isCurrent ? 'btn-secondary w-full' : 'btn-primary w-full'}
                >
                  {isCurrent ? 'Current plan' : pendingPlan === planKey ? 'Switching...' : 'Switch to this plan'}
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
