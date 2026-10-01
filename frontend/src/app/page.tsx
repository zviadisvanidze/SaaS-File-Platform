'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold text-slate-900">SaaS File Platform</h1>
      <p className="max-w-md text-slate-600">
        Register your company, invite employees and manage CSV / XLS / XLSX file
        uploads with fine-grained access control and simple subscription billing.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="btn-primary">
          Log in
        </Link>
        <Link href="/register" className="btn-secondary">
          Register your company
        </Link>
      </div>
    </main>
  );
}
