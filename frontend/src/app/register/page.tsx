'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { isApiError } from '@/lib/auth-context';
import { Industry } from '@/lib/types';

const INDUSTRY_LABELS: Record<Industry, string> = {
  [Industry.FINANCE]: 'Finance',
  [Industry.ECOMMERCE]: 'E-commerce',
  [Industry.HEALTHCARE]: 'Healthcare',
  [Industry.EDUCATION]: 'Education',
  [Industry.MANUFACTURING]: 'Manufacturing',
  [Industry.RETAIL]: 'Retail',
  [Industry.TECHNOLOGY]: 'Technology',
  [Industry.OTHER]: 'Other',
};

const initialForm = {
  companyName: '',
  registrationNumber: '',
  email: '',
  password: '',
  country: '',
  industry: Industry.TECHNOLOGY,
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  function updateField<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/register', form);
      setIsDone(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card w-full max-w-md space-y-3 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-slate-600">
            We sent an activation link to <strong>{form.email}</strong>. Click it
            to activate your company account, then log in.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="card w-full max-w-lg space-y-4">
        <h1 className="text-xl font-semibold">Register your company</h1>
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="label" htmlFor="companyName">Company name</label>
          <input
            id="companyName"
            required
            className="input"
            value={form.companyName}
            onChange={(event) => updateField('companyName', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="registrationNumber">Registration number</label>
            <input
              id="registrationNumber"
              required
              placeholder="e.g. 12345678910"
              pattern="\d{8,15}"
              title="8 to 15 digits"
              className="input"
              value={form.registrationNumber}
              onChange={(event) => updateField('registrationNumber', event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input
              id="country"
              required
              className="input"
              value={form.country}
              onChange={(event) => updateField('country', event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <select
            id="industry"
            className="input"
            value={form.industry}
            onChange={(event) => updateField('industry', event.target.value as Industry)}
          >
            {Object.values(Industry).map((industry) => (
              <option key={industry} value={industry}>
                {INDUSTRY_LABELS[industry]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className="input"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Registering...' : 'Register company'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
