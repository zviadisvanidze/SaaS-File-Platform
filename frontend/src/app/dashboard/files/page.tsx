'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useAuth, isApiError } from '@/lib/auth-context';
import { api, uploadFile } from '@/lib/api';
import { FileAsset, FileVisibility, Role } from '@/lib/types';
import { CompanyMember } from '@/lib/member';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploaderLabel(file: FileAsset): string {
  if (typeof file.uploadedBy === 'string') return file.uploadedBy;
  return file.uploadedBy.email;
}

function uploaderId(file: FileAsset): string {
  return typeof file.uploadedBy === 'string' ? file.uploadedBy : file.uploadedBy._id;
}

export default function FilesPage() {
  const { user, token } = useAuth();
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visibility, setVisibility] = useState<FileVisibility>(FileVisibility.ALL);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  async function loadData() {
    if (!token) return;
    const [filesData, membersData] = await Promise.all([
      api.get<FileAsset[]>('/files', token),
      api.get<CompanyMember[]>('/company/members', token),
    ]);
    setFiles(filesData);
    setMembers(membersData);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please choose a CSV, XLS or XLSX file.');
      return;
    }
    if (visibility === FileVisibility.RESTRICTED && selectedMembers.length === 0) {
      setError('Select at least one employee for a restricted file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', visibility);
    if (visibility === FileVisibility.RESTRICTED) {
      formData.append('allowedUserIds', selectedMembers.join(','));
    }

    setIsUploading(true);
    try {
      await uploadFile('/files/upload', formData, token);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedMembers([]);
      setVisibility(FileVisibility.ALL);
      await loadData();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(id: string) {
    const { url } = await api.get<{ url: string }>(`/files/${id}/download-url`, token);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this file permanently?')) return;
    await api.delete(`/files/${id}`, token);
    await loadData();
  }

  async function handleVisibilityUpdate(
    id: string,
    newVisibility: FileVisibility,
    newAllowedUsers: string[],
  ) {
    await api.patch(
      `/files/${id}/visibility`,
      { visibility: newVisibility, allowedUserIds: newAllowedUsers },
      token,
    );
    setEditingFileId(null);
    await loadData();
  }

  function canManage(file: FileAsset): boolean {
    return user?.role === Role.ADMIN || uploaderId(file) === user?.userId;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Files</h1>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Upload a file</h2>
        <p className="text-sm text-slate-500">Only CSV, XLS and XLSX files are accepted.</p>
        {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleUpload} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            className="input"
          />
          <div>
            <label className="label">Visibility</label>
            <select
              className="input"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as FileVisibility)}
            >
              <option value={FileVisibility.ALL}>Everyone in the company</option>
              <option value={FileVisibility.RESTRICTED}>Selected employees only</option>
            </select>
          </div>
          {visibility === FileVisibility.RESTRICTED && (
            <div>
              <label className="label">Who can view this file</label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {members.length === 0 && (
                  <p className="text-sm text-slate-500">No other employees yet.</p>
                )}
                {members.map((member) => (
                  <label key={member._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member._id)}
                      onChange={() => toggleMember(member._id)}
                    />
                    {member.email}
                  </label>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={isUploading} className="btn-primary">
            {isUploading ? 'Uploading...' : 'Upload file'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Company files</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-slate-500">No files uploaded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Uploaded by</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Visibility</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <Fragment key={file._id}>
                  <tr className="border-b border-slate-100 align-top">
                    <td className="py-2">{file.originalName}</td>
                    <td className="py-2">{uploaderLabel(file)}</td>
                    <td className="py-2">{formatBytes(file.size)}</td>
                    <td className="py-2 capitalize">{file.visibility}</td>
                    <td className="space-x-3 py-2 text-right">
                      <button
                        onClick={() => handleDownload(file._id)}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        Download
                      </button>
                      {canManage(file) && (
                        <>
                          <button
                            onClick={() =>
                              setEditingFileId(editingFileId === file._id ? null : file._id)
                            }
                            className="font-medium text-slate-600 hover:underline"
                          >
                            Access
                          </button>
                          <button
                            onClick={() => handleDelete(file._id)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {editingFileId === file._id && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={5} className="py-3">
                        <VisibilityEditor
                          file={file}
                          members={members}
                          onSave={(newVisibility, newAllowedUsers) =>
                            handleVisibilityUpdate(file._id, newVisibility, newAllowedUsers)
                          }
                          onCancel={() => setEditingFileId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function VisibilityEditor({
  file,
  members,
  onSave,
  onCancel,
}: {
  file: FileAsset;
  members: CompanyMember[];
  onSave: (visibility: FileVisibility, allowedUserIds: string[]) => void;
  onCancel: () => void;
}) {
  const [visibility, setVisibility] = useState<FileVisibility>(file.visibility);
  const [selected, setSelected] = useState<string[]>(file.allowedUsers);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-3 px-2">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={visibility === FileVisibility.ALL}
            onChange={() => setVisibility(FileVisibility.ALL)}
          />
          Everyone
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={visibility === FileVisibility.RESTRICTED}
            onChange={() => setVisibility(FileVisibility.RESTRICTED)}
          />
          Selected employees only
        </label>
      </div>
      {visibility === FileVisibility.RESTRICTED && (
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          {members.map((member) => (
            <label key={member._id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(member._id)}
                onChange={() => toggle(member._id)}
              />
              {member.email}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          className="btn-primary"
          onClick={() => onSave(visibility, selected)}
          disabled={visibility === FileVisibility.RESTRICTED && selected.length === 0}
        >
          Save
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
