import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { University } from '../../types';
import { api } from '../../api';
import { UniversityLogo } from '../../components/UniversityLogo';

interface UniversitiesTabProps {
  onRefresh: () => void;
}

interface PendingUniversityCreate {
  tempId: string;
  name: string;
  code: string;
  description: string;
  logo_url: string;
  status: 'active' | 'inactive';
}

interface PendingUniversityUpdate {
  id: string;
  name: string;
  code: string;
  description: string;
  logo_url: string;
  status: 'active' | 'inactive';
}

export const UniversitiesTab: React.FC<UniversitiesTabProps> = ({ onRefresh }) => {
  const [dbUniversities, setDbUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pending changes state
  const [pendingCreates, setPendingCreates] = useState<PendingUniversityCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingUniversityUpdate>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Save changes state
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

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

  const loadUniversities = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetUniversities();
      setDbUniversities(data || []);
    } catch (err: any) {
      console.error('Failed to fetch universities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  // Compute displayed list merged with pending changes
  const displayUniversities: University[] = useMemo(() => {
    // 1. Exclude pending deletes
    let list = dbUniversities.filter((u) => !pendingDeletes.includes(u.id));

    // 2. Apply pending updates
    list = list.map((u) => {
      const update = pendingUpdates[u.id];
      if (update) {
        return {
          ...u,
          name: update.name,
          code: update.code,
          description: update.description,
          logo_url: update.logo_url,
          status: update.status,
        };
      }
      return u;
    });

    // 3. Append pending creates
    const newItems: University[] = pendingCreates.map((pu) => ({
      id: pu.tempId,
      name: pu.name,
      code: pu.code,
      slug: pu.code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: pu.description,
      logo_url: pu.logo_url,
      status: pu.status,
      display_order: 1,
      is_active: pu.status === 'active',
      created_at: new Date().toISOString(),
    }));

    let merged = [...newItems, ...list];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      merged = merged.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.code && u.code.toLowerCase().includes(q))
      );
    }

    return merged;
  }, [dbUniversities, pendingCreates, pendingUpdates, pendingDeletes, searchQuery]);

  const totalPendingChanges =
    pendingCreates.length + Object.keys(pendingUpdates).length + pendingDeletes.length;

  const handleOpenAddModal = () => {
    setEditingUniv(null);
    setName('');
    setCode('');
    setDescription('');
    setLogoUrl('');
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (univ: University) => {
    setEditingUniv(univ);
    setName(univ.name);
    setCode(univ.code || '');
    setDescription(univ.description || '');
    setLogoUrl(univ.logo_url || '');
    setStatus((univ.status as 'active' | 'inactive') || 'active');
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

  const handleStageUniversity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('University Name is required');
      return;
    }

    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (editingUniv) {
      if (editingUniv.id.startsWith('temp_')) {
        setPendingCreates((prev) =>
          prev.map((item) =>
            item.tempId === editingUniv.id
              ? {
                  ...item,
                  name: name.trim(),
                  code: code.trim().toUpperCase(),
                  description: description.trim(),
                  logo_url: logoUrl,
                  status,
                }
              : item
          )
        );
      } else {
        setPendingUpdates((prev) => ({
          ...prev,
          [editingUniv.id]: {
            id: editingUniv.id,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim(),
            logo_url: logoUrl,
            status,
          },
        }));
      }
    } else {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setPendingCreates((prev) => [
        {
          tempId,
          name: name.trim(),
          code: code.trim().toUpperCase() || 'UNIV',
          description: description.trim(),
          logo_url: logoUrl,
          status,
        },
        ...prev,
      ]);
    }

    setModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingUniv) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (deletingUniv.id.startsWith('temp_')) {
      setPendingCreates((prev) => prev.filter((p) => p.tempId !== deletingUniv.id));
    } else {
      setPendingDeletes((prev) => [...prev, deletingUniv.id]);
      setPendingUpdates((prev) => {
        const copy = { ...prev };
        delete copy[deletingUniv.id];
        return copy;
      });
    }

    setDeletingUniv(null);
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Discard all unsaved pending changes for universities?')) {
      setPendingCreates([]);
      setPendingUpdates({});
      setPendingDeletes([]);
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
    }
  };

  const handleSaveChangesToDatabase = async () => {
    if (totalPendingChanges === 0) return;

    setIsSavingChanges(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      // 1. Process pending creates
      for (const item of pendingCreates) {
        await api.adminCreateUniversity({
          name: item.name,
          code: item.code,
          description: item.description,
          logo_url: item.logo_url,
          status: item.status,
        });
      }

      // 2. Process pending updates
      for (const id of Object.keys(pendingUpdates)) {
        const item = pendingUpdates[id];
        await api.adminUpdateUniversity(id, {
          name: item.name,
          code: item.code,
          description: item.description,
          logo_url: item.logo_url,
          status: item.status,
        });
      }

      // 3. Process pending deletes
      for (const id of pendingDeletes) {
        await api.adminDeleteUniversity(id);
      }

      // 4. Reset pending state
      setPendingCreates([]);
      setPendingUpdates({});
      setPendingDeletes([]);

      // 5. Reload from DB
      await loadUniversities();
      onRefresh();

      setSaveSuccessMsg('Universities saved successfully to the database!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving universities to database:', err);
      setSaveErrorMsg(err.message || 'Failed to save universities to the database.');
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
            Add, edit, or remove affiliated universities and manage logos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {totalPendingChanges > 0 && (
            <button
              onClick={handleDiscardChanges}
              disabled={isSavingChanges}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Discard Changes</span>
            </button>
          )}

          <button
            onClick={handleSaveChangesToDatabase}
            disabled={isSavingChanges || totalPendingChanges === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
              totalPendingChanges > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/30 animate-pulse'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSavingChanges ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  Save Changes {totalPendingChanges > 0 ? `(${totalPendingChanges} pending)` : ''}
                </span>
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

      {/* Success / Error Feedback */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-2xl animate-fade-in shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Pending status notification */}
      {totalPendingChanges > 0 && !saveSuccessMsg && !saveErrorMsg && (
        <div className="flex items-center justify-between gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              You have <strong>{totalPendingChanges}</strong> unsaved pending change(s). Click <strong>"Save Changes"</strong> to commit them permanently to the database.
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search universities by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-600 font-semibold shrink-0">
          Showing <span className="text-indigo-600 font-bold">{displayUniversities.length}</span> university/universities
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading universities...</span>
        </div>
      ) : displayUniversities.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-slate-700">No Universities Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click "Add University" above to register a new university.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayUniversities.map((u) => {
            const isPendingNew = u.id.startsWith('temp_');
            const isPendingUpdated = !!pendingUpdates[u.id];

            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isPendingNew
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : isPendingUpdated
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    <UniversityLogo logoUrl={u.logo_url} name={u.name} className="w-full h-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                        {u.code}
                      </span>
                      {isPendingNew && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                      {isPendingUpdated && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Edited
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          u.status === 'inactive'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug line-clamp-2">
                      {u.name}
                    </h3>
                  </div>
                </div>

                {u.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{u.description}</p>
                )}

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => handleOpenEditModal(u)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit University"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingUniv(u)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
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

      {/* Delete Modal */}
      {deletingUniv && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete University?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900">{deletingUniv.name}</span>?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This will be marked as a pending deletion until you click "Save Changes".
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
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingUniv ? 'Edit University' : 'Add University'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStageUniversity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rammanohar Lohia Avadh University"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Code / Abbr *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RMLAU"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-3.5 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 text-xs font-medium text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <Upload className="w-4 h-4 text-indigo-600" />
                      )}
                      <span>{uploadingLogo ? 'Processing...' : 'Upload Logo Image'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief notes or location..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <span>{editingUniv ? 'Update in Pending' : 'Add to Pending'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
