'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { isApiError } from '@/lib/auth-context';

type Status = 'loading' | 'success' | 'error';

export default function ActivateCompanyPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Activation tokens are single-use, but React 18 Strict Mode (dev only)
    // mounts effects twice, which would fire this request twice and turn a
    // successful activation into a false "invalid or expired" error on the
    // second call. Guard so the request is only ever sent once per token.
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    api
      .get(`/auth/activate/${params.token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setError(isApiError(err) ? err.message : 'Activation failed.');
        setStatus('error');
      });
  }, [params.token]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md space-y-3 text-center">
        {status === 'loading' && <p>Activating your company account...</p>}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold">Account activated</h1>
            <p className="text-sm text-slate-600">
              Your company account is now active. You can log in.
            </p>
            <Link href="/login" className="btn-primary inline-flex">
              Go to login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-red-700">Activation failed</h1>
            <p className="text-sm text-slate-600">{error}</p>
          </>
        )}
      </div>
    </main>
  );
}
