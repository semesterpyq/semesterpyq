import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  GraduationCap,
  CheckCircle2,
  Loader2,
  Save,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Course, University, Year } from '../../types';
import { api } from '../../api';

interface YearsTabProps {
  onRefresh: () => void;
}

interface PendingYearCreate {
  tempId: string;
  university_id: string;
  course_id: string;
  name: string;
  year_number: number;
}

interface PendingYearUpdate {
  id: string;
  name: string;
  year_number: number;
}

export const YearsTab: React.FC<YearsTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dbYears, setDbYears] = useState<Year[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingYearCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingYearUpdate>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Save changes state
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [name, setName] = useState('');
  const [yearNumber, setYearNumber] = useState<number>(1);

  // Delete modal state
  const [deleteConfirmYear, setDeleteConfirmYear] = useState<Year | null>(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const uList = await api.adminGetUniversities();
        setUniversities(uList || []);
        if (uList && uList.length > 0) {
          setSelectedUnivId(uList[0].id);
        }
      } catch (err) {
        console.error('Failed to load universities:', err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    if (!selectedUnivId) {
      setCourses([]);
      setSelectedCourseId('');
      return;
    }
    const loadCourses = async () => {
      try {
        const cList = await api.adminGetCourses(selectedUnivId);
        setCourses(cList || []);
        if (cList && cList.length > 0) {
          setSelectedCourseId(cList[0].id);
        } else {
          setSelectedCourseId('');
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, [selectedUnivId]);

  const loadYears = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetYears({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
      });
      setDbYears(data || []);
    } catch (err) {
      console.error('Failed to load years:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, [selectedUnivId, selectedCourseId]);

  // Compute active displayed years merged with pending changes
  const displayYears: Year[] = React.useMemo(() => {
    // 1. Filter out pending deleted years
    let list = dbYears.filter((y) => !pendingDeletes.includes(y.id));

    // 2. Apply pending updates
    list = list.map((y) => {
      const update = pendingUpdates[y.id];
      if (update) {
        return {
          ...y,
          name: update.name,
          year_number: update.year_number,
        };
      }
      return y;
    });

    // 3. Append pending creates matching selected course
    const newItems: Year[] = pendingCreates
      .filter((py) => !selectedCourseId || py.course_id === selectedCourseId)
      .map((py) => ({
        id: py.tempId,
        university_id: py.university_id,
        course_id: py.course_id,
        name: py.name,
        year_number: py.year_number,
        slug: `year-${py.year_number}`,
        display_order: py.year_number,
        is_published: true,
        created_at: new Date().toISOString(),
      }));

    return [...newItems, ...list];
  }, [dbYears, pendingCreates, pendingUpdates, pendingDeletes, selectedCourseId]);

  const totalPendingChanges =
    pendingCreates.length + Object.keys(pendingUpdates).length + pendingDeletes.length;

  const openAddModal = () => {
    if (!selectedUnivId || !selectedCourseId) {
      alert('Please select a University and Course first.');
      return;
    }
    setEditingYear(null);
    const count = displayYears.length;
    setName(`${count + 1}${count === 0 ? 'st' : count === 1 ? 'nd' : count === 2 ? 'rd' : 'th'} Year`);
    setYearNumber(count + 1);
    setModalOpen(true);
  };

  const openEditModal = (y: Year) => {
    setEditingYear(y);
    setName(y.name);
    setYearNumber(y.year_number || 1);
    setModalOpen(true);
  };

  const handleStageYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (editingYear) {
      if (editingYear.id.startsWith('temp_')) {
        setPendingCreates((prev) =>
          prev.map((item) =>
            item.tempId === editingYear.id
              ? { ...item, name: name.trim(), year_number: Number(yearNumber) }
              : item
          )
        );
      } else {
        setPendingUpdates((prev) => ({
          ...prev,
          [editingYear.id]: {
            id: editingYear.id,
            name: name.trim(),
            year_number: Number(yearNumber),
          },
        }));
      }
    } else {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setPendingCreates((prev) => [
        {
          tempId,
          university_id: selectedUnivId,
          course_id: selectedCourseId,
          name: name.trim(),
          year_number: Number(yearNumber),
        },
        ...prev,
      ]);
    }

    setModalOpen(false);
  };

  const handleDeleteClick = (y: Year) => {
    setDeleteConfirmYear(y);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmYear) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (deleteConfirmYear.id.startsWith('temp_')) {
      setPendingCreates((prev) => prev.filter((p) => p.tempId !== deleteConfirmYear.id));
    } else {
      setPendingDeletes((prev) => [...prev, deleteConfirmYear.id]);
      setPendingUpdates((prev) => {
        const copy = { ...prev };
        delete copy[deleteConfirmYear.id];
        return copy;
      });
    }

    setDeleteConfirmYear(null);
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Discard all unsaved pending changes for academic years?')) {
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
        await api.adminCreateYear({
          university_id: item.university_id,
          course_id: item.course_id,
          name: item.name,
          year_number: item.year_number,
        });
      }

      // 2. Process all pending updates
      for (const id of Object.keys(pendingUpdates)) {
        const item = pendingUpdates[id];
        await api.adminUpdateYear(id, {
          name: item.name,
          year_number: item.year_number,
        });
      }

      // 3. Process all pending deletes
      for (const id of pendingDeletes) {
        await api.adminDeleteYear(id);
      }

      // 4. Reset pending state
      setPendingCreates([]);
      setPendingUpdates({});
      setPendingDeletes([]);

      // 5. Reload from DB
      await loadYears();
      onRefresh();

      setSaveSuccessMsg('Academic years saved successfully to the database!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving year changes:', err);
      setSaveErrorMsg(err.message || 'Failed to save academic years to the database.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Academic Year Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic years (1st Year, 2nd Year, 3rd Year, etc.) for each course.
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
            <span>Add Year</span>
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

      {/* Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Select University</span>
          </label>
          <select
            value={selectedUnivId}
            onChange={(e) => setSelectedUnivId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Select Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            disabled={courses.length === 0}
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Year List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-xs">Loading years...</span>
        </div>
      ) : displayYears.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-700">No academic years found for this course</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Year" above to create an academic year.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayYears.map((y) => {
            const isPendingNew = y.id.startsWith('temp_');
            const isPendingUpdated = !!pendingUpdates[y.id];

            return (
              <div
                key={y.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  isPendingNew
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : isPendingUpdated
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {y.year_number || '1'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900">{y.name}</h4>
                      {isPendingNew && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                      {isPendingUpdated && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Edited
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Year #{y.year_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(y)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Year"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(y)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Year"
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
      {deleteConfirmYear && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete Academic Year?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmYear.name}</span> (Year #{deleteConfirmYear.year_number})?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This will be marked as a pending deletion until you click "Save Changes".
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmYear(null)}
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              {editingYear ? 'Edit Year' : 'Add Academic Year'}
            </h3>

            <form onSubmit={handleStageYear} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Year, 2nd Year, 3rd Year"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Number (1, 2, 3...) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={yearNumber}
                  onChange={(e) => setYearNumber(parseInt(e.target.value, 10))}
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>{editingYear ? 'Update in Pending' : 'Add to Pending'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

