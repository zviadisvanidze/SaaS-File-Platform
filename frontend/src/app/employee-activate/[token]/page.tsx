'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { isApiError } from '@/lib/auth-context';

export default function ActivateEmployeePage({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/auth/employee-activate/${params.token}`, { password });
      setIsDone(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Activation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card w-full max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">Account activated</h1>
          <p className="text-sm text-slate-600">You can now log in with your new password.</p>
          <Link href="/login" className="btn-primary inline-flex">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Set your password</h1>
        <p className="text-sm text-slate-600">
          Choose a password to activate your employee account.
        </p>
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            className="input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Activating...' : 'Activate account'}
        </button>
      </form>
    </main>
  );
}
