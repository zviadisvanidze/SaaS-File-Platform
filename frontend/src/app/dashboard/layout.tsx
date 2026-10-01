'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
