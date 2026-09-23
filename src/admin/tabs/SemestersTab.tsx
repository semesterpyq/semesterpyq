import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Building2,
  GraduationCap,
  Calendar,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Course, Semester, University, Year } from '../../types';
import { api } from '../../api';

interface SemestersTabProps {
  onRefresh: () => void;
}

interface PendingCreateSemester {
  tempId: string;
  data: {
    university_id: string;
    course_id: string;
    year_id: string;
    name: string;
    semester_number: number;
  };
}

export const SemestersTab: React.FC<SemestersTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingCreateSemester[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<string, { name: string; semester_number: number }>
  >(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<Semester | null>(null);
  const [name, setName] = useState('');
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [deleteConfirmSem, setDeleteConfirmSem] = useState<Semester | null>(null);

  // Load initial universities
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

  // When selected university changes, load courses
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

  // When selected course changes, load years
  useEffect(() => {
    if (!selectedCourseId) {
      setYears([]);
      setSelectedYearId('');
      return;
    }
    const loadYears = async () => {
      try {
        const yList = await api.adminGetYears({ courseId: selectedCourseId, universityId: selectedUnivId });
        setYears(yList || []);
        if (yList && yList.length > 0) {
          setSelectedYearId(yList[0].id);
        } else {
          setSelectedYearId('');
        }
      } catch (err) {
        console.error('Failed to load years:', err);
      }
    };
    loadYears();
  }, [selectedCourseId, selectedUnivId]);

  // Load semesters whenever year changes
  const loadSemesters = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSemesters({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
        yearId: selectedYearId || undefined,
      });
      setSemesters(data || []);
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());
    } catch (err) {
      console.error('Failed to load semesters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadSemesters();
    } else {
      setSemesters([]);
      setLoading(false);
    }
  }, [selectedUnivId, selectedCourseId, selectedYearId]);

  const totalPendingCount = pendingCreates.length + pendingUpdates.size + pendingDeletes.size;

  const handleOpenAddModal = () => {
    if (!selectedUnivId || !selectedCourseId || !selectedYearId) {
      alert('Please select a University, Course, and Year first.');
      return;
    }
    setEditingSem(null);
    const nextNum = semesters.length + 1;
    setName(`${nextNum}${nextNum === 1 ? 'st' : nextNum === 2 ? 'nd' : nextNum === 3 ? 'rd' : 'th'} Semester`);
    setSemesterNumber(nextNum);
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (sem: Semester) => {
    setEditingSem(sem);
    setName(sem.name);
    setSemesterNumber(sem.semester_number || 1);
    setModalError(null);
    setModalOpen(true);
  };

  // Stage changes from form submit
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Semester Name is required');
      return;
    }

    if (editingSem) {
      const semId = editingSem.id;
      const isPendingNew = pendingCreates.some((c) => c.tempId === semId);

      const updateData = {
        name: name.trim(),
        semester_number: Number(semesterNumber),
      };

      if (isPendingNew) {
        setPendingCreates((prev) =>
          prev.map((c) =>
            c.tempId === semId ? { ...c, data: { ...c.data, ...updateData } } : c
          )
        );
      } else {
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(semId, updateData);
          return next;
        });
      }

      setSemesters((prev) =>
        prev.map((s) => (s.id === semId ? { ...s, ...updateData } : s))
      );
    } else {
      // New Semester (Pending)
      const tempId = `temp_sem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newSemData = {
        university_id: selectedUnivId,
        course_id: selectedCourseId,
        year_id: selectedYearId,
        name: name.trim(),
        semester_number: Number(semesterNumber),
      };

      setPendingCreates((prev) => [...prev, { tempId, data: newSemData }]);

      const newRecord: Semester = {
        id: tempId,
        ...newSemData,
        created_at: new Date().toISOString(),
      };

      setSemesters((prev) => [...prev, newRecord]);
    }

    setModalOpen(false);
  };

  // Stage Delete
  const handleDeleteClick = (sem: Semester) => {
    setDeleteConfirmSem(sem);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmSem) return;
    const targetId = deleteConfirmSem.id;
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

    setSemesters((prev) => prev.filter((s) => s.id !== targetId));
    setDeleteConfirmSem(null);
  };

  // SAVE CHANGES TO REAL DATABASE
  const handleSaveChanges = async () => {
    if (totalPendingCount === 0) {
      setSuccessNotice('No pending changes to save. All semesters are synchronized with the database.');
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
        await api.adminDeleteSemester(id);
      }

      // 2. Process updates
      for (const [id, data] of Array.from(pendingUpdates.entries())) {
        await api.adminUpdateSemester(id, data);
      }

      // 3. Process creations
      for (const item of pendingCreates) {
        await api.adminCreateSemester(item.data);
      }

      // Confirmed by database!
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());

      // Refresh data from real database
      await loadSemesters();
      onRefresh();

      setSuccessNotice('Changes saved successfully');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to save semesters:', err);
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
          <h2 className="text-xl font-bold text-slate-900 font-serif">Semester Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure semesters connected to each academic year, course, and university.
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
            <span>Add Semester</span>
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

      {/* Select Cascading Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select University</span>
          </label>
          <select
            value={selectedUnivId}
            onChange={(e) => setSelectedUnivId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {courses.length === 0 ? (
              <option value="">No courses in university</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Select Year</span>
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {years.length === 0 ? (
              <option value="">No years in course</option>
            ) : (
              years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Semester List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading semesters...</span>
        </div>
      ) : semesters.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-2xl p-6">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Semesters Configured</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Semester" above to create semesters for this year.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {semesters.map((sem) => {
            const isPendingNew = pendingCreates.some((c) => c.tempId === sem.id);
            const isPendingEdited = pendingUpdates.has(sem.id);

            return (
              <div
                key={sem.id}
                className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${
                  isPendingNew
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/40'
                    : isPendingEdited
                    ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/40'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    Sem {sem.semester_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 font-serif">
                        {sem.name}
                      </h3>
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
                    <p className="text-xs text-slate-500">Semester #{sem.semester_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(sem)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit Semester"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(sem)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete Semester"
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
      {deleteConfirmSem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete Semester?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <span className="font-bold text-slate-900">{deleteConfirmSem.name}</span> (Semester #{deleteConfirmSem.semester_number})?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This item will be queued for deletion. Click "Save Changes" to commit deletion permanently to the database.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSem(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                Remove Semester
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
              {editingSem ? 'Edit Semester' : 'Add Semester'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1st Semester, 2nd Semester"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester Number *
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={semesterNumber}
                  onChange={(e) => setSemesterNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
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
                  <span>{editingSem ? 'Apply Edit' : 'Add to List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
