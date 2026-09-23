import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Course, Semester, Subject, University, Year } from '../../types';
import { api } from '../../api';

interface SubjectsTabProps {
  onRefresh: () => void;
}

interface PendingCreateSubject {
  tempId: string;
  data: {
    university_id: string;
    course_id: string;
    year_id: string;
    semester_id: string;
    name: string;
    code: string;
    description?: string;
  };
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingCreateSubject[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<string, { name: string; code: string; description?: string }>
  >(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [deleteConfirmSub, setDeleteConfirmSub] = useState<Subject | null>(null);

  // Load Universities
  useEffect(() => {
    const loadUniversities = async () => {
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
    loadUniversities();
  }, []);

  // Load Courses for University
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

  // Load Years for Course
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

  // Load Semesters for Year
  useEffect(() => {
    if (!selectedYearId) {
      setSemesters([]);
      setSelectedSemesterId('');
      return;
    }
    const loadSemesters = async () => {
      try {
        const sList = await api.adminGetSemesters({
          universityId: selectedUnivId,
          courseId: selectedCourseId,
          yearId: selectedYearId,
        });
        setSemesters(sList || []);
        if (sList && sList.length > 0) {
          setSelectedSemesterId(sList[0].id);
        } else {
          setSelectedSemesterId('');
        }
      } catch (err) {
        console.error('Failed to load semesters:', err);
      }
    };
    loadSemesters();
  }, [selectedYearId, selectedCourseId, selectedUnivId]);

  // Load Subjects
  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSubjects({
        universityId: selectedUnivId || undefined,
        courseId: selectedCourseId || undefined,
        yearId: selectedYearId || undefined,
        semesterId: selectedSemesterId || undefined,
      });
      setSubjects(data || []);
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSemesterId) {
      loadSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [selectedUnivId, selectedCourseId, selectedYearId, selectedSemesterId]);

  const totalPendingCount = pendingCreates.length + pendingUpdates.size + pendingDeletes.size;

  const openAddModal = () => {
    if (!selectedUnivId || !selectedCourseId || !selectedYearId || !selectedSemesterId) {
      alert('Please select University, Course, Year, and Semester first.');
      return;
    }
    setEditingSub(null);
    setName('');
    setCode('');
    setDescription('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSub(s);
    setName(s.name);
    setCode(s.code || '');
    setDescription(s.description || '');
    setModalError(null);
    setModalOpen(true);
  };

  // Stage Add / Edit
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Subject Name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      code: (code || name.substring(0, 4)).trim().toUpperCase(),
      description: description.trim(),
    };

    if (editingSub) {
      const subId = editingSub.id;
      const isPendingNew = pendingCreates.some((c) => c.tempId === subId);

      if (isPendingNew) {
        setPendingCreates((prev) =>
          prev.map((c) =>
            c.tempId === subId ? { ...c, data: { ...c.data, ...payload } } : c
          )
        );
      } else {
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(subId, payload);
          return next;
        });
      }

      setSubjects((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, ...payload } : s))
      );
    } else {
      // New Subject (Pending)
      const tempId = `temp_sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newSubData = {
        university_id: selectedUnivId,
        course_id: selectedCourseId,
        year_id: selectedYearId,
        semester_id: selectedSemesterId,
        ...payload,
      };

      setPendingCreates((prev) => [...prev, { tempId, data: newSubData }]);

      const newRecord: Subject = {
        id: tempId,
        ...newSubData,
        created_at: new Date().toISOString(),
      };

      setSubjects((prev) => [...prev, newRecord]);
    }

    setModalOpen(false);
  };

  // Stage Delete
  const handleDeleteClick = (s: Subject) => {
    setDeleteConfirmSub(s);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmSub) return;
    const targetId = deleteConfirmSub.id;
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

    setSubjects((prev) => prev.filter((s) => s.id !== targetId));
    setDeleteConfirmSub(null);
  };

  // SAVE CHANGES TO REAL DATABASE
  const handleSaveChanges = async () => {
    if (totalPendingCount === 0) {
      setSuccessNotice('No pending changes to save. All subjects are synchronized with the database.');
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
        await api.adminDeleteSubject(id);
      }

      // 2. Process updates
      for (const [id, data] of Array.from(pendingUpdates.entries())) {
        await api.adminUpdateSubject(id, data);
      }

      // 3. Process creations
      for (const item of pendingCreates) {
        await api.adminCreateSubject(item.data);
      }

      // Confirmed by database!
      setPendingCreates([]);
      setPendingUpdates(new Map());
      setPendingDeletes(new Set());

      // Refresh data from real database
      await loadSubjects();
      onRefresh();

      setSuccessNotice('Changes saved successfully');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to save subjects:', err);
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
          <h2 className="text-xl font-bold text-slate-900 font-serif">Subject Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, or delete subjects for each year and semester.
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
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
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

      {/* Cascading Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>University</span>
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
            <span>Course</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {courses.length === 0 ? (
              <option value="">No courses</option>
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
            <span>Year</span>
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {years.length === 0 ? (
              <option value="">No years</option>
            ) : (
              years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semester</span>
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          >
            {semesters.length === 0 ? (
              <option value="">No semesters</option>
            ) : (
              semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Subjects List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading subjects...</span>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-2xl p-6">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Subjects Configured</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add Subject" above to add subjects to this semester.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const isPendingNew = pendingCreates.some((c) => c.tempId === sub.id);
            const isPendingEdited = pendingUpdates.has(sub.id);

            return (
              <div
                key={sub.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  isPendingNew
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/40'
                    : isPendingEdited
                    ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/40'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                      {sub.code || 'SUB'}
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
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{sub.name}</h3>
                  {sub.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{sub.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => openEditModal(sub)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(sub)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Delete Subject"
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
      {deleteConfirmSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete Subject?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <span className="font-bold text-slate-900">{deleteConfirmSub.name}</span> ({deleteConfirmSub.code})?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This item will be queued for deletion. Click "Save Changes" to commit deletion permanently to the database.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSub(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                Remove Subject
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
              {editingSub ? 'Edit Subject' : 'Add Subject'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Environmental Studies, Microeconomics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ENV-101"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  <span>{editingSub ? 'Apply Edit' : 'Add to List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
