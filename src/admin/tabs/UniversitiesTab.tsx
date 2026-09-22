import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Upload, Image as ImageIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { University } from '../../types';
import { api } from '../../api';

interface UniversitiesTabProps {
  onRefresh: () => void;
}

export const UniversitiesTab: React.FC<UniversitiesTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUniv, setEditingUniv] = useState<University | null>(null);
  const [deletingUniv, setDeletingUniv] = useState<University | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadUniversities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminGetUniversities();
      setUniversities(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch universities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUniv(null);
    setName('');
    setCode('');
    setDescription('');
    setLogoUrl('/assets/logos/logo.jpg');
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (univ: University) => {
    setEditingUniv(univ);
    setName(univ.name);
    setCode(univ.code || '');
    setDescription(univ.description || '');
    setLogoUrl(univ.logo_url || '');
    setStatus(univ.status || 'active');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('University Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingUniv) {
        await api.adminUpdateUniversity(editingUniv.id, {
          name,
          code,
          description,
          logo_url: logoUrl,
          status,
        });
      } else {
        await api.adminCreateUniversity({
          name,
          code,
          description,
          logo_url: logoUrl,
          status,
        });
      }
      setModalOpen(false);
      await loadUniversities();
      onRefresh();
    } catch (err: any) {
      alert(`Error saving university: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUniv) return;
    setIsDeleting(true);

    try {
      await api.adminDeleteUniversity(deletingUniv.id);
      // Immediately filter out from UI
      setUniversities((prev) => prev.filter((u) => u.id !== deletingUniv.id));
      setDeletingUniv(null);
      await loadUniversities();
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete university: ${err.message}`);
    } finally {
      setIsDeleting(false);
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

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add University</span>
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading universities...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-xs">{error}</div>
      ) : universities.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl p-6">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Universities Added</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add University" above to create your first university entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {universities.map((univ) => (
            <div
              key={univ.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                  {univ.logo_url ? (
                    <img src={univ.logo_url} alt={univ.name} className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Building2 className="w-7 h-7 text-indigo-600" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
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
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUniv && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">Delete University</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">"{deletingUniv.name}"</p>
              <p className="text-slate-500">
                Deleting this university will also remove all affiliated courses, semesters, subjects, and examination papers stored in the cloud database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingUniv(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              {editingUniv ? 'Edit University' : 'Add New University'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  University Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucknow University or Maa Pateshwari University"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Code / Abbreviation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LU or MPU"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo (PNG / JPG)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      placeholder="Logo URL or upload file"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingLogo ? 'Uploading...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief overview or campus detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : editingUniv ? 'Update University' : 'Create University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
