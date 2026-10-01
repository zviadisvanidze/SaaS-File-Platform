'use client';

import { useEffect, useState } from 'react';
import { useAuth, isApiError } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, Role } from '@/lib/types';

export default function EmployeesPage() {
  const { user, token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadEmployees() {
    if (!token) return;
    const data = await api.get<Employee[]>('/employees', token);
    setEmployees(data);
    setIsLoading(false);
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await api.post('/employees', form, token);
      setMessage(`Invitation sent to ${form.email}.`);
      setForm({ email: '', firstName: '', lastName: '' });
      await loadEmployees();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to add employee.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this employee? This cannot be undone.')) return;
    await api.delete(`/employees/${id}`, token);
    await loadEmployees();
  }

  if (user?.role !== Role.ADMIN) {
    return <p>Only company administrators can manage employees.</p>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Employees</h1>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Invite an employee</h2>
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</p>}
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="label" htmlFor="firstName">First name</label>
            <input
              id="firstName"
              className="input"
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
          </div>
          <div className="md:col-span-1">
            <label className="label" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              className="input"
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>
          <div className="md:col-span-1">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary md:col-span-3">
            {isSubmitting ? 'Sending invite...' : 'Add employee'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Team</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-slate-500">No employees yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee._id} className="border-b border-slate-100">
                  <td className="py-2">
                    {[employee.firstName, employee.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-2">{employee.email}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        employee.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {employee.isActive ? 'Active' : 'Pending activation'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleRemove(employee._id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
