'use client';

import { useEffect, useState } from 'react';
import { useAuth, isApiError } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Company, Industry, Role } from '@/lib/types';

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

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', country: '', industry: Industry.OTHER });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<Company>('/company/profile', token).then((data) => {
      setCompany(data);
      setProfileForm({ name: data.name, country: data.country, industry: data.industry });
    });
  }, [token]);

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    try {
      const updated = await api.patch<Company>('/company/profile', profileForm, token);
      setCompany(updated);
      setProfileMessage('Company profile updated.');
    } catch (err) {
      setProfileError(isApiError(err) ? err.message : 'Failed to update profile.');
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await api.post('/auth/change-password', passwordForm, token);
      setPasswordMessage('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPasswordError(isApiError(err) ? err.message : 'Failed to change password.');
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Profile</h1>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Company details</h2>
        {company && (
          <p className="text-sm text-slate-500">
            Registration number: {company.registrationNumber}
          </p>
        )}
        {profileMessage && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{profileMessage}</p>}
        {profileError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{profileError}</p>}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Company name</label>
            <input
              id="name"
              className="input"
              disabled={user?.role !== Role.ADMIN}
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input
              id="country"
              className="input"
              disabled={user?.role !== Role.ADMIN}
              value={profileForm.country}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="industry">Industry</label>
            <select
              id="industry"
              className="input"
              disabled={user?.role !== Role.ADMIN}
              value={profileForm.industry}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, industry: event.target.value as Industry }))
              }
            >
              {Object.values(Industry).map((industry) => (
                <option key={industry} value={industry}>
                  {INDUSTRY_LABELS[industry]}
                </option>
              ))}
            </select>
          </div>
          {user?.role === Role.ADMIN && (
            <button type="submit" className="btn-primary">Save changes</button>
          )}
        </form>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        {passwordMessage && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{passwordMessage}</p>}
        {passwordError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{passwordError}</p>}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              required
              className="input"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              className="input"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
            />
          </div>
          <button type="submit" className="btn-primary">Update password</button>
        </form>
      </section>
    </div>
  );
}
