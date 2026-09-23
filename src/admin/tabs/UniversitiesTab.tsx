import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { University } from '../../types';
import { api } from '../../api';
import { UniversityLogo } from '../../components/UniversityLogo';

interface UniversitiesTabProps {
  onRefresh: () => void;
}

interface PendingCreateUniv {
  tempId: string;
  data: {
    name: string;
    code: string;
    description: string;
    logo_url: string;
    status: 'active' | 'inactive';
  };
}

export const UniversitiesTab: React.FC<UniversitiesTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingCreateUniv[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<string, { name?: string; code?: string; description?: string; logo_url?: string; status?: 'active' | 'inactive' }>
  >(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUniv, setEditingUniv] = useState<University | null>(null);
  const [deletingUniv, setDeletingUniv] = useState<University | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadUniversities = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetUniversities();
      setUniversities(data || []);
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to fetch universities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const totalPendingCount = pendingCreates.length + pendingUpdates.size + pendingDeletes.size;

  const handleOpenAddModal = () => {
    setEditingUniv(null);
    setName('');
    setCode('');
    setDescription('');
    setLogoUrl('');
    setStatus('active');
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (univ: University) => {
    setEditingUniv(univ);
    setName(univ.name);
    setCode(univ.code || '');
    setDescription(univ.description || '');
    setLogoUrl(univ.logo_url || '');
    setStatus(univ.status || 'active');
    setModalError(null);
    setModalOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const res = await api.adminUploadLogo(file);
      if (res.logo_url) {
        setLogoUrl(res.logo_url);
      }
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Add / Edit form submit (stages as pending change)
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('University Name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      code: (code || name.substring(0, 4)).trim().toUpperCase(),
      description: description.trim(),
      logo_url: logoUrl.trim(),
      status,
    };

    if (editingUniv) {
      const univId = editingUniv.id;
      const isPendingNew = pendingCreates.some((c) => c.tempId === univId);

      if (isPendingNew) {
        setPendingCreates((prev) =>
          prev.map((c) => (c.tempId === univId ? { ...c, data: payload } : c))
        );
      } else {
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(univId, payload);
          return next;
        });
      }

      setUniversities((prev) =>
        prev.map((u) => (u.id === univId ? { ...u, ...payload } : u))
      );
    } else {
      // New University (Pending)
      const tempId = `temp_univ_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setPendingCreates((prev) => [...prev, { tempId, data: payload }]);

      const newRecord: University = {
        id: tempId,
        name: payload.name,
        code: payload.code,
        description: payload.description,
        logo_url: payload.logo_url,
        status: payload.status,
        created_at: new Date().toISOString(),
      };

      setUniversities((prev) => [newRecord, ...prev]);
    }

    setModalOpen(false);
  };

  // Stage Delete
  const handleConfirmDelete = () => {
    if (!deletingUniv) return;
    const targetId = deletingUniv.id;
    const isPendingNew = pendingCreates.some((c) => c.tempId === targetId);

    if (isPendingNew) {
      setPendingCreates((prev) => prev.filter((c) => c.tempId !== targetId));
    } else {
      setPendingUpdates((prev) => {
        const next = new Map(prev);
        next.delete(targetId);
        return next;
      });
      setPendingDeletes((prev) => new Set(prev).add(targetId));
    }

    setUniversities((prev) => prev.filter((u) => u.id !== targetId));
    setDeletingUniv(null);
  };

  // SAVE CHANGES TO REAL DATABASE
  const handleSaveChanges = async () => {
    if (totalPendingCount === 0) {
      setSuccessNotice('No pending changes to save. All universities are synchronized with the database.');
      setErrorNotice(null);
      setTimeout(() => setSuccessNotice(null), 3000);
      return;
    }

    setIsSavingChanges(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      // 1. Process deletions
      for (const id of Array.from(pendingDeletes)) {
        await api.adminDeleteUniversity(id);
      }

      // 2. Process updates
      for (const [id, data] of Array.from(pendingUpdates.entries())) {
        await api.adminUpdateUniversity(id, data);
      }

      // 3. Process creations
      for (const item of pendingCreates) {
        await api.adminCreateUniversity(item.data);
      }

      // Confirmed by database!
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());

      // Refresh data from real database
      await loadUniversities();
      onRefresh();

      setSuccessNotice('Changes saved successfully');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to save universities:', err);
      setErrorNotice(err.message || 'Database save failed. Please check connection and try again.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">University Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or remove affiliated universities and manage institutional logos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear "Save Changes" Button */}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSavingChanges}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              totalPendingCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/30 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            } disabled:opacity-50`}
            title="Save pending changes to database"
          >
            {isSavingChanges ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
                {totalPendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white text-emerald-800 font-extrabold">
                    {totalPendingCount}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add University</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading universities...</span>
        </div>
      ) : universities.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl p-6">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Universities Added</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add University" above to create your first university entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {universities.map((univ) => {
            const isPendingNew = pendingCreates.some((c) => c.tempId === univ.id);
            const isPendingEdited = pendingUpdates.has(univ.id);

            return (
              <div
                key={univ.id}
                className={`rounded-2xl border p-4 sm:p-5 flex items-start justify-between gap-4 transition-all ${
                  isPendingNew
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/40'
                    : isPendingEdited
                    ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/40'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    <UniversityLogo
                      logoUrl={univ.logo_url}
                      name={univ.name}
                      code={univ.code}
                      className="w-full h-full object-contain rounded-xl"
                      iconClassName="w-7 h-7 text-indigo-600"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                        {univ.code || 'UNIV'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          univ.status === 'inactive'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {univ.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                      {isPendingNew && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Pending Save
                        </span>
                      )}
                      {isPendingEdited && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Modified
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 font-serif leading-snug">
                      {univ.name}
                    </h3>

                    {univ.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{univ.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(univ)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit University"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingUniv(univ)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Delete University"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUniv && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete University?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <span className="font-bold text-slate-900">{deletingUniv.name}</span>?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This item will be queued for deletion. Click "Save Changes" to commit deletion permanently to the database.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUniv(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                Remove University
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              {editingUniv ? 'Edit University' : 'Add University'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lal Bahadur Shastri Mahavidyalaya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Code / Acronym *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LBS, RMLAU, DU"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Logo Upload / URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Official Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or enter image URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <span>{editingUniv ? 'Apply Edit' : 'Add to List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
