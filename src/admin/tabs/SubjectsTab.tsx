import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Course, Semester, Subject, University, Year } from '../../types';
import { api } from '../../api';

interface SubjectsTabProps {
  onRefresh: () => void;
}

interface PendingSubjectCreate {
  tempId: string;
  university_id: string;
  course_id: string;
  year_id: string;
  semester_id: string;
  name: string;
  code: string;
  description: string;
}

interface PendingSubjectUpdate {
  id: string;
  university_id: string;
  course_id: string;
  year_id: string;
  semester_id: string;
  name: string;
  code: string;
  description: string;
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({ onRefresh }) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);

  // Filter States (with 'all' support)
  const [selectedUnivId, setSelectedUnivId] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedYearId, setSelectedYearId] = useState<string>('all');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(true);

  // Pending Changes State
  const [pendingCreates, setPendingCreates] = useState<PendingSubjectCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingSubjectUpdate>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  // Save changes state
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subject | null>(null);
  const [modalUnivId, setModalUnivId] = useState('');
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalYearId, setModalYearId] = useState('');
  const [modalSemesterId, setModalSemesterId] = useState('');
  const [modalCourses, setModalCourses] = useState<Course[]>([]);
  const [modalYears, setModalYears] = useState<Year[]>([]);
  const [modalSemesters, setModalSemesters] = useState<Semester[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  // Delete modal state
  const [deleteConfirmSub, setDeleteConfirmSub] = useState<Subject | null>(null);

  // Load Universities
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const uList = await api.adminGetUniversities();
        setUniversities(uList || []);
      } catch (err) {
        console.error('Failed to load universities:', err);
      }
    };
    loadUniversities();
  }, []);

  // Load Courses for Filter
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const cList = await api.adminGetCourses(selectedUnivId !== 'all' ? selectedUnivId : undefined);
        setCourses(cList || []);
        if (selectedCourseId !== 'all' && cList && !cList.some((c) => c.id === selectedCourseId)) {
          setSelectedCourseId('all');
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, [selectedUnivId]);

  // Load Years for Filter
  useEffect(() => {
    const loadYears = async () => {
      try {
        const yList = await api.adminGetYears({
          courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
          universityId: selectedUnivId !== 'all' ? selectedUnivId : undefined,
        });
        setYears(yList || []);
        if (selectedYearId !== 'all' && yList && !yList.some((y) => y.id === selectedYearId)) {
          setSelectedYearId('all');
        }
      } catch (err) {
        console.error('Failed to load years:', err);
      }
    };
    loadYears();
  }, [selectedCourseId, selectedUnivId]);

  // Load Semesters for Filter
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const sList = await api.adminGetSemesters({
          universityId: selectedUnivId !== 'all' ? selectedUnivId : undefined,
          courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
          yearId: selectedYearId !== 'all' ? selectedYearId : undefined,
        });
        setSemesters(sList || []);
        if (selectedSemesterId !== 'all' && sList && !sList.some((s) => s.id === selectedSemesterId)) {
          setSelectedSemesterId('all');
        }
      } catch (err) {
        console.error('Failed to load semesters:', err);
      }
    };
    loadSemesters();
  }, [selectedYearId, selectedCourseId, selectedUnivId]);

  // Load Subjects from Database
  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSubjects({
        universityId: selectedUnivId !== 'all' ? selectedUnivId : undefined,
        courseId: selectedCourseId !== 'all' ? selectedCourseId : undefined,
        yearId: selectedYearId !== 'all' ? selectedYearId : undefined,
        semesterId: selectedSemesterId !== 'all' ? selectedSemesterId : undefined,
      });
      setDbSubjects(data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [selectedUnivId, selectedCourseId, selectedYearId, selectedSemesterId]);

  // Compute active displayed subjects merged with pending changes
  const displaySubjects: Subject[] = useMemo(() => {
    // 1. Filter out pending deleted subjects
    let list = dbSubjects.filter((s) => !pendingDeletes.includes(s.id));

    // 2. Apply pending updates
    list = list.map((s) => {
      const update = pendingUpdates[s.id];
      if (update) {
        return {
          ...s,
          name: update.name,
          code: update.code,
          description: update.description,
          university_id: update.university_id,
          course_id: update.course_id,
          year_id: update.year_id,
          semester_id: update.semester_id,
        };
      }
      return s;
    });

    // 3. Append pending creates matching active filter
    const newItems: Subject[] = pendingCreates
      .filter((ps) => {
        if (selectedUnivId !== 'all' && ps.university_id && ps.university_id !== selectedUnivId) return false;
        if (selectedCourseId !== 'all' && ps.course_id && ps.course_id !== selectedCourseId) return false;
        if (selectedYearId !== 'all' && ps.year_id && ps.year_id !== selectedYearId) return false;
        if (selectedSemesterId !== 'all' && ps.semester_id && ps.semester_id !== selectedSemesterId) return false;
        return true;
      })
      .map((ps) => ({
        id: ps.tempId,
        university_id: ps.university_id,
        course_id: ps.course_id,
        year_id: ps.year_id,
        semester_id: ps.semester_id,
        name: ps.name,
        code: ps.code,
        slug: ps.code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: ps.description,
        display_order: 1,
        is_published: true,
        created_at: new Date().toISOString(),
      }));

    let merged = [...newItems, ...list];

    // Filter by search query if present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      merged = merged.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return merged;
  }, [
    dbSubjects,
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    selectedUnivId,
    selectedCourseId,
    selectedYearId,
    selectedSemesterId,
    searchQuery,
  ]);

  const totalPendingChanges =
    pendingCreates.length + Object.keys(pendingUpdates).length + pendingDeletes.length;

  // Sync Modal Dropdowns
  useEffect(() => {
    if (!modalOpen) return;
    const loadModalCourses = async () => {
      try {
        const cList = await api.adminGetCourses(modalUnivId || undefined);
        setModalCourses(cList || []);
        if (cList && cList.length > 0 && (!modalCourseId || !cList.some((c) => c.id === modalCourseId))) {
          setModalCourseId(cList[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadModalCourses();
  }, [modalUnivId, modalOpen]);

  useEffect(() => {
    if (!modalOpen || !modalCourseId) return;
    const loadModalYears = async () => {
      try {
        const yList = await api.adminGetYears({ courseId: modalCourseId, universityId: modalUnivId });
        setModalYears(yList || []);
        if (yList && yList.length > 0 && (!modalYearId || !yList.some((y) => y.id === modalYearId))) {
          setModalYearId(yList[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadModalYears();
  }, [modalCourseId, modalUnivId, modalOpen]);

  useEffect(() => {
    if (!modalOpen || !modalYearId) return;
    const loadModalSemesters = async () => {
      try {
        const sList = await api.adminGetSemesters({
          courseId: modalCourseId,
          universityId: modalUnivId,
          yearId: modalYearId,
        });
        setModalSemesters(sList || []);
        if (sList && sList.length > 0 && (!modalSemesterId || !sList.some((s) => s.id === modalSemesterId))) {
          setModalSemesterId(sList[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadModalSemesters();
  }, [modalYearId, modalCourseId, modalUnivId, modalOpen]);

  const openAddModal = () => {
    setEditingSub(null);
    const u = selectedUnivId !== 'all' ? selectedUnivId : universities[0]?.id || '';
    const c = selectedCourseId !== 'all' ? selectedCourseId : courses[0]?.id || '';
    const y = selectedYearId !== 'all' ? selectedYearId : years[0]?.id || '';
    const s = selectedSemesterId !== 'all' ? selectedSemesterId : semesters[0]?.id || '';
    setModalUnivId(u);
    setModalCourseId(c);
    setModalYearId(y);
    setModalSemesterId(s);
    setName('');
    setCode('');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSub(s);
    setModalUnivId(s.university_id || universities[0]?.id || '');
    setModalCourseId(s.course_id || courses[0]?.id || '');
    setModalYearId(s.year_id || years[0]?.id || '');
    setModalSemesterId(s.semester_id || semesters[0]?.id || '');
    setName(s.name);
    setCode(s.code || '');
    setDescription(s.description || '');
    setModalOpen(true);
  };

  const handleStageSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Subject Name is required');
      return;
    }

    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (editingSub) {
      if (editingSub.id.startsWith('temp_')) {
        setPendingCreates((prev) =>
          prev.map((item) =>
            item.tempId === editingSub.id
              ? {
                  ...item,
                  university_id: modalUnivId,
                  course_id: modalCourseId,
                  year_id: modalYearId,
                  semester_id: modalSemesterId,
                  name: name.trim(),
                  code: code.trim().toUpperCase(),
                  description: description.trim(),
                }
              : item
          )
        );
      } else {
        setPendingUpdates((prev) => ({
          ...prev,
          [editingSub.id]: {
            id: editingSub.id,
            university_id: modalUnivId,
            course_id: modalCourseId,
            year_id: modalYearId,
            semester_id: modalSemesterId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim(),
          },
        }));
      }
    } else {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setPendingCreates((prev) => [
        {
          tempId,
          university_id: modalUnivId,
          course_id: modalCourseId,
          year_id: modalYearId,
          semester_id: modalSemesterId,
          name: name.trim(),
          code: code.trim().toUpperCase() || 'SUB',
          description: description.trim(),
        },
        ...prev,
      ]);
    }

    setModalOpen(false);
  };

  const handleDeleteClick = (s: Subject) => {
    setDeleteConfirmSub(s);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmSub) return;
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (deleteConfirmSub.id.startsWith('temp_')) {
      setPendingCreates((prev) => prev.filter((p) => p.tempId !== deleteConfirmSub.id));
    } else {
      setPendingDeletes((prev) => [...prev, deleteConfirmSub.id]);
      setPendingUpdates((prev) => {
        const copy = { ...prev };
        delete copy[deleteConfirmSub.id];
        return copy;
      });
    }

    setDeleteConfirmSub(null);
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Discard all unsaved pending changes for subjects?')) {
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
        await api.adminCreateSubject({
          university_id: item.university_id,
          course_id: item.course_id,
          year_id: item.year_id,
          semester_id: item.semester_id,
          name: item.name,
          code: item.code,
          description: item.description,
        });
      }

      // 2. Process pending updates
      for (const id of Object.keys(pendingUpdates)) {
        const item = pendingUpdates[id];
        await api.adminUpdateSubject(id, {
          university_id: item.university_id,
          course_id: item.course_id,
          year_id: item.year_id,
          semester_id: item.semester_id,
          name: item.name,
          code: item.code,
          description: item.description,
        });
      }

      // 3. Process pending deletes
      for (const id of pendingDeletes) {
        await api.adminDeleteSubject(id);
      }

      // 4. Reset pending state
      setPendingCreates([]);
      setPendingUpdates({});
      setPendingDeletes([]);

      // 5. Reload fresh from DB
      await loadSubjects();
      onRefresh();

      setSaveSuccessMsg('Subjects saved successfully to the database!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving subjects to database:', err);
      setSaveErrorMsg(err.message || 'Failed to save subjects to the database.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Helper map for display badges
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.code || c.name));
    return map;
  }, [courses]);

  const semesterMap = useMemo(() => {
    const map = new Map<string, string>();
    semesters.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [semesters]);

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
            <span>Add Subject</span>
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

      {/* Cascading Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>University</span>
            </label>
            <select
              value={selectedUnivId}
              onChange={(e) => setSelectedUnivId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">🌐 All Universities</option>
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">📚 All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">🗓️ All Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">📑 All Semesters</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects by name, code, or description..."
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
            Showing <span className="text-indigo-600 font-bold">{displaySubjects.length}</span> subject(s)
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading subjects...</span>
        </div>
      ) : displaySubjects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-slate-700">No Subjects Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedSemesterId !== 'all' || selectedCourseId !== 'all' || searchQuery
                ? 'Try selecting "All Semesters" / "All Courses" or clearing your search, or click "Add Subject" to create one.'
                : 'Click "Add Subject" above to create subjects.'}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySubjects.map((s) => {
            const isPendingNew = s.id.startsWith('temp_');
            const isPendingUpdated = !!pendingUpdates[s.id];

            const courseName = s.course_id ? courseMap.get(s.course_id) : null;
            const semesterName = s.semester_id ? semesterMap.get(s.semester_id) : null;

            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-xs ${
                  isPendingNew
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : isPendingUpdated
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200/90'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md inline-block">
                      {s.code || 'SUB'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPendingNew && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          New
                        </span>
                      )}
                      {isPendingUpdated && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Edited
                        </span>
                      )}
                      {courseName && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                          {courseName}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {s.name}
                  </h3>

                  {semesterName && (
                    <div className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>{semesterName}</span>
                    </div>
                  )}

                  {s.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(s)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
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
                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmSub.name}</span> ({deleteConfirmSub.code})?
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                This will be marked as a pending deletion until you click "Save Changes".
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
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {editingSub ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStageSubject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    University *
                  </label>
                  <select
                    value={modalUnivId}
                    onChange={(e) => setModalUnivId(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={modalCourseId}
                    onChange={(e) => setModalCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {modalCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={modalYearId}
                    onChange={(e) => setModalYearId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {modalYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester *
                  </label>
                  <select
                    value={modalSemesterId}
                    onChange={(e) => setModalSemesterId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {modalSemesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics, Chemistry, Mathematics, Botany, Zoology"
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
                  placeholder="e.g. PHY101 or MATH201"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Syllabus Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Subject details or syllabus notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  <span>{editingSub ? 'Update in Pending' : 'Add to Pending'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
