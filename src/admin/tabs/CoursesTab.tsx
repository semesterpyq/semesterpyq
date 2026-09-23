import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Building2,
  X,
  Loader2,
  CheckCircle2,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Course, University } from '../../types';
import { api } from '../../api';

interface CoursesTabProps {
  onRefresh: () => void;
}

interface PendingCourseCreate {
  tempId: string;
  university_id: string;
  name: string;
  code: string;
  description: string;
}

interface PendingCourseUpdate {
  id: string;
  university_id: string;
  name: string;
  code: string;
  description: string;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUnivId, setSelectedUnivId] = useState<string>('all');

  const [dbCourses, setDbCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingCourseCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingCourseUpdate>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form fields
  const [univId, setUnivId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  // Save changes state
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState<Course | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, cList] = await Promise.all([
        api.adminGetUniversities(),
        api.adminGetCourses(selectedUnivId !== 'all' ? selectedUnivId : undefined),
      ]);
      setUniversities(uList || []);
      setDbCourses(cList || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUnivId]);

  // Compute active course list merged with pending changes
  const displayCourses: Course[] = React.useMemo(() => {
    // 1. Start with dbCourses excluding pending deletes
    let list = dbCourses.filter((c) => !pendingDeletes.includes(c.id));

    // 2. Apply pending updates
    list = list.map((c) => {
      const update = pendingUpdates[c.id];
      if (update) {
        const uObj = universities.find((u) => u.id === update.university_id);
        return {
          ...c,
          name: update.name,
          code: update.code,
          description: update.description,
          university_id: update.university_id,
          university_name: uObj?.name || c.university_name,
        };
      }
      return c;
    });

    // 3. Append pending creates (if matching selected university filter)
    const newItems: Course[] = pendingCreates
      .filter((pc) => selectedUnivId === 'all' || pc.university_id === selectedUnivId)
      .map((pc) => {
        const uObj = universities.find((u) => u.id === pc.university_id);
        return {
          id: pc.tempId,
          name: pc.name,
          code: pc.code,
          slug: pc.code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          description: pc.description,
          display_order: 0,
          is_published: true,
          university_id: pc.university_id,
          university_name: uObj?.name || 'University',
          created_at: new Date().toISOString(),
        };
      });

    return [...newItems, ...list];
  }, [dbCourses, pendingCreates, pendingUpdates, pendingDeletes, selectedUnivId, universities]);

  const totalPendingChanges =
    pendingCreates.length + Object.keys(pendingUpdates).length + pendingDeletes.length;

  const openAddModal = () => {
    setEditingCourse(null);
    setUnivId(selectedUnivId !== 'all' ? selectedUnivId : universities[0]?.id || '');
    setName('');
    setCode('');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setUnivId(c.university_id || universities[0]?.id || '');
    setName(c.name);
    setCode(c.code);
    setDescription(c.description || '');
    setModalOpen(true);
  };

  const handleStageCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !univId) {
      alert('University, Course Name, and Course Code are required.');
      return;
    }

    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (editingCourse) {
      if (editingCourse.id.startsWith('temp_')) {
        // Update a pending created course
        setPendingCreates((prev) =>
          prev.map((item) =>
            item.tempId === editingCourse.id
              ? {
                  ...item,
                  university_id: univId,
                  name: name.trim(),
                  code: code.trim().toUpperCase(),
                  description: description.trim(),
                }
              : item
          )
        );
      } else {
        // Stage update for existing course
        setPendingUpdates((prev) => ({
          ...prev,
          [editingCourse.id]: {
            id: editingCourse.id,
            university_id: univId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim(),
          },
        }));
      }
    } else {
      // Stage new course
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setPendingCreates((prev) => [
        {
          tempId,
          university_id: univId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        },
        ...prev,
      ]);
    }

    setModalOpen(false);
  };

  const handleDeleteClick = (c: Course) => {
    setDeleteConfirmCourse(c);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmCourse) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (deleteConfirmCourse.id.startsWith('temp_')) {
      // Remove from pending creates
      setPendingCreates((prev) => prev.filter((p) => p.tempId !== deleteConfirmCourse.id));
    } else {
      // Add to pending deletes & remove from pending updates
      setPendingDeletes((prev) => [...prev, deleteConfirmCourse.id]);
      setPendingUpdates((prev) => {
        const copy = { ...prev };
        delete copy[deleteConfirmCourse.id];
        return copy;
      });
    }

    setDeleteConfirmCourse(null);
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Discard all unsaved pending changes for courses?')) {
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
      // 1. Process all pending creates
      for (const item of pendingCreates) {
        await api.adminCreateCourse({
          university_id: item.university_id,
          name: item.name,
          code: item.code,
          description: item.description,
        });
      }

      // 2. Process all pending updates
      for (const id of Object.keys(pendingUpdates)) {
        const item = pendingUpdates[id];
        await api.adminUpdateCourse(id, {
          university_id: item.university_id,
          name: item.name,
          code: item.code,
          description: item.description,
        });
      }

      // 3. Process all pending deletes
      for (const id of pendingDeletes) {
        await api.adminDeleteCourse(id);
      }

      // 4. Database confirmed: Clear pending state
      setPendingCreates([]);
      setPendingUpdates({});
      setPendingDeletes([]);

      // 5. Refresh data from database so UI always reflects the latest state
      await loadData();
      onRefresh();

      setSaveSuccessMsg('Changes saved successfully to the database!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving course changes:', err);
      setSaveErrorMsg(err.message || 'Failed to save changes to the database.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Course Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or delete degree courses affiliated with universities.
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
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
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

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Filter University:</span>
        </label>
        <select
          value={selectedUnivId}
          onChange={(e) => setSelectedUnivId(e.target.value)}
          className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Universities ({universities.length})</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.code})
            </option>
          ))}
        </select>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-xs">Loading courses...</span>
        </div>
      ) : displayCourses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No courses found</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Course" to create courses for your universities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCourses.map((c) => {
            const isPendingNew = c.id.startsWith('temp_');
            const isPendingUpdated = !!pendingUpdates[c.id];

            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 transition-all hover:shadow-xs flex flex-col justify-between gap-3 ${
                  isPendingNew
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : isPendingUpdated
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200/90'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                      {c.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isPendingNew && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Pending Addition
                        </span>
                      )}
                      {isPendingUpdated && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Pending Edit
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[120px]">
                        {c.university_name || 'University'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {c.name}
                  </h3>

                  {c.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit Course"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(c)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete Course"
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
      {deleteConfirmCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete Course?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmCourse.name}</span> ({deleteConfirmCourse.code})?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This will be marked as a pending deletion until you click "Save Changes".
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCourse(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStageCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select University *
                </label>
                <select
                  required
                  value={univId}
                  onChange={(e) => setUnivId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bachelor of Arts (B.A)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.A or B.Sc"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <span>{editingCourse ? 'Update in Pending' : 'Add to Pending'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

