import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  AlertTriangle,
  X,
  Loader2,
  Check,
  RefreshCw,
  ExternalLink,
  UploadCloud,
  Save,
} from 'lucide-react';
import { University, Course, Year, Semester, Subject, QuestionPaper } from '../../types';
import { api } from '../../api';

interface AllPapersTabProps {
  universities?: University[];
  courses: Course[];
  years: Year[];
  semesters?: Semester[];
  subjects: Subject[];
  papers: QuestionPaper[];
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
  onPreviewPaper: (paper: QuestionPaper) => void;
}

export const AllPapersTab: React.FC<AllPapersTabProps> = ({
  universities = [],
  courses,
  years,
  semesters = [],
  subjects,
  papers,
  onRefresh,
  onNavigateTab,
  onPreviewPaper,
}) => {
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterExamYear, setFilterExamYear] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pending Changes State
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Partial<QuestionPaper>>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  const totalPendingCount = pendingUpdates.size + pendingDeletes.size;

  // Lookup maps for fast and accurate relation resolution
  const coursesMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const yearsMap = useMemo(() => new Map(years.map((y) => [y.id, y])), [years]);
  const semestersMap = useMemo(() => new Map(semesters.map((s) => [s.id, s])), [semesters]);
  const subjectsMap = useMemo(() => new Map(subjects.map((sub) => [sub.id, sub])), [subjects]);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Edit Modal state
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [replacingPdf, setReplacingPdf] = useState(false);
  const [replacePdfSuccess, setReplacePdfSuccess] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal
  const [deleteConfirmPaper, setDeleteConfirmPaper] = useState<QuestionPaper | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Quick Status Toggle Loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Distinct Exam Years
  const availableExamYears = useMemo(() => {
    const set = new Set<number>();
    papers.forEach((p) => {
      if (p.exam_year) set.add(p.exam_year);
    });
    [2026, 2025, 2024, 2023, 2022, 2021].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [papers]);

  // Distinct Semesters in papers and system
  const availableSemesters = useMemo(() => {
    const set = new Set<string>();
    semesters.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    papers.forEach((p) => {
      if (p.semester) set.add(p.semester);
      if (p.semester_name) set.add(p.semester_name);
    });
    ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', 'Annual Exam'].forEach((s) => set.add(s));
    return Array.from(set);
  }, [papers, semesters]);

  // Distinct Academic Years in system
  const availableAcademicYears = useMemo(() => {
    const set = new Set<string>();
    years.forEach((y) => {
      if (y.name) set.add(y.name);
    });
    papers.forEach((p) => {
      if (p.year_name) set.add(p.year_name);
    });
    ['1st Year', '2nd Year', '3rd Year', '4th Year'].forEach((y) => set.add(y));
    return Array.from(set);
  }, [papers, years]);

  // Active papers with pending updates and filtering out pending deletes
  const displayedPapers = useMemo(() => {
    return papers
      .filter((p) => !pendingDeletes.has(p.id))
      .map((p) => {
        const update = pendingUpdates.get(p.id);
        if (update) {
          return { ...p, ...update };
        }
        return p;
      });
  }, [papers, pendingUpdates, pendingDeletes]);

  // Filtered papers
  const filteredPapers = useMemo(() => {
    return displayedPapers.filter((paper) => {
      const resolvedCourse = paper.course_id ? coursesMap.get(paper.course_id) : undefined;
      const resolvedYear = paper.year_id ? yearsMap.get(paper.year_id) : undefined;
      const resolvedSem = paper.semester_id ? semestersMap.get(paper.semester_id) : undefined;
      const resolvedSubject = paper.subject_id ? subjectsMap.get(paper.subject_id) : undefined;

      const courseName = (resolvedCourse?.name || paper.course_name || '').toLowerCase();
      const courseCode = (resolvedCourse?.code || paper.course_code || '').toLowerCase();
      const yearName = (resolvedYear?.name || paper.year_name || '').toLowerCase();
      const semName = (resolvedSem?.name || paper.semester || paper.semester_name || '').toLowerCase();
      const subName = (resolvedSubject?.name || paper.subject_name || '').toLowerCase();
      const subCode = (resolvedSubject?.code || paper.subject_code || paper.paper_code || '').toLowerCase();

      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = paper.title.toLowerCase().includes(q);
        const matchesSub = subName.includes(q);
        const matchesCode = (paper.paper_code || '').toLowerCase().includes(q) || subCode.includes(q);
        const matchesCourse = courseName.includes(q) || courseCode.includes(q);
        const matchesYear = String(paper.exam_year).includes(q) || yearName.includes(q);
        if (!matchesTitle && !matchesSub && !matchesCode && !matchesCourse && !matchesYear) {
          return false;
        }
      }

      // 2. Course
      if (filterCourse !== 'all' && paper.course_id !== filterCourse) {
        return false;
      }

      // 3. Year
      if (filterYear !== 'all') {
        const matchesYearName = yearName.includes(filterYear.toLowerCase());
        const matchesYearId = paper.year_id === filterYear;
        if (!matchesYearName && !matchesYearId) return false;
      }

      // 4. Semester
      if (filterSemester !== 'all') {
        const matchesSemName = semName === filterSemester.toLowerCase();
        const matchesSemId = paper.semester_id === filterSemester;
        if (!matchesSemName && !matchesSemId) return false;
      }

      // 5. Subject
      if (filterSubject !== 'all' && paper.subject_id !== filterSubject) {
        return false;
      }

      // 6. Exam Year
      if (filterExamYear !== 'all' && paper.exam_year !== Number(filterExamYear)) {
        return false;
      }

      // 7. Language
      if (filterLanguage !== 'all' && (paper.language || 'English') !== filterLanguage) {
        return false;
      }

      // 8. Status
      if (filterStatus !== 'all') {
        const isPub = paper.is_published && paper.status !== 'Draft';
        if (filterStatus === 'published' && !isPub) return false;
        if (filterStatus === 'draft' && isPub) return false;
      }

      return true;
    });
  }, [
    displayedPapers,
    search,
    filterCourse,
    filterYear,
    filterSemester,
    filterSubject,
    filterExamYear,
    filterLanguage,
    filterStatus,
    coursesMap,
    yearsMap,
    semestersMap,
    subjectsMap,
  ]);

  // Toggle single paper published/draft status (Stage as Pending)
  const handleToggleStatus = (paper: QuestionPaper) => {
    const isCurrentlyPublished = paper.is_published && paper.status !== 'Draft';
    const newStatus = isCurrentlyPublished ? 'Draft' : 'Published';
    const newIsPub = newStatus === 'Published';

    setPendingUpdates((prev) => {
      const next = new Map(prev);
      const existing = next.get(paper.id) || {};
      next.set(paper.id, {
        ...existing,
        status: newStatus,
        is_published: newIsPub,
      });
      return next;
    });

    setSuccessNotice(`Paper "${paper.title}" marked as ${newStatus} (pending save). Click "Save Changes" to commit.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Open edit modal
  const handleOpenEdit = (paper: QuestionPaper) => {
    const staged = pendingUpdates.get(paper.id);
    setEditingPaper(staged ? ({ ...paper, ...staged } as QuestionPaper) : { ...paper });
    setEditError(null);
    setReplacePdfSuccess(null);
  };

  // Delete single paper (Stage as Pending)
  const handleDeletePaper = () => {
    if (!deleteConfirmPaper) return;
    const targetId = deleteConfirmPaper.id;

    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.delete(targetId);
      return next;
    });

    setPendingDeletes((prev) => new Set(prev).add(targetId));
    setDeleteConfirmPaper(null);

    setSuccessNotice(`Paper "${deleteConfirmPaper.title}" staged for deletion. Click "Save Changes" to permanently delete from database.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Bulk actions (Stage as Pending)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPapers.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkSetStatus = (status: 'Published' | 'Draft') => {
    if (selectedIds.length === 0) return;
    const isPub = status === 'Published';

    setPendingUpdates((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) {
        const existing = next.get(id) || {};
        next.set(id, {
          ...existing,
          status,
          is_published: isPub,
        });
      }
      return next;
    });

    const count = selectedIds.length;
    setSelectedIds([]);
    setSuccessNotice(`${count} paper(s) set to ${status} (pending save). Click "Save Changes" to commit.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    setPendingUpdates((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) {
        next.delete(id);
      }
      return next;
    });

    setPendingDeletes((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) {
        next.add(id);
      }
      return next;
    });

    const count = selectedIds.length;
    setSelectedIds([]);
    setBulkDeleteConfirmOpen(false);

    setSuccessNotice(`${count} paper(s) staged for deletion. Click "Save Changes" to permanently delete.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Edit Paper form save (Stage or Direct Database Save)
  const handleEditSubmit = async (e: React.FormEvent, saveImmediately: boolean = false) => {
    e.preventDefault();
    if (!editingPaper) return;
    setEditSaving(true);
    setEditError(null);

    try {
      const courseObj = courses.find((c) => c.id === editingPaper.course_id);
      const yearObj = years.find((y) => y.id === editingPaper.year_id);
      const semObj = semesters.find((s) => s.id === editingPaper.semester_id);
      const subObj = subjects.find((s) => s.id === editingPaper.subject_id);

      const paperYearNum = Number(editingPaper.exam_year || editingPaper.paper_year || new Date().getFullYear());

      const payload: Partial<QuestionPaper> = {
        ...editingPaper,
        title: (editingPaper.title || '').trim(),
        paper_code: (editingPaper.paper_code || '').trim(),
        exam_year: paperYearNum,
        paper_year: paperYearNum,
        course_id: editingPaper.course_id || '',
        course_name: courseObj?.name || editingPaper.course_name || '',
        course_code: courseObj?.code || editingPaper.course_code || '',
        year_id: editingPaper.year_id || '',
        year_name: yearObj?.name || editingPaper.year_name || '',
        semester_id: editingPaper.semester_id || '',
        semester: semObj?.name || editingPaper.semester || editingPaper.semester_name || '',
        semester_name: semObj?.name || editingPaper.semester_name || editingPaper.semester || '',
        subject_id: editingPaper.subject_id || '',
        subject_name: subObj?.name || editingPaper.subject_name || '',
        subject_code: subObj?.code || editingPaper.subject_code || '',
        university_id: courseObj?.university_id || editingPaper.university_id || '',
        total_marks: Number(editingPaper.total_marks || 75),
        display_order: Number(editingPaper.display_order ?? 0),
        status: editingPaper.status || (editingPaper.is_published ? 'Published' : 'Draft'),
        is_published: (editingPaper.status ? editingPaper.status === 'Published' : editingPaper.is_published !== false),
      };

      if (saveImmediately) {
        // Direct database save
        await api.adminUpdatePaper(editingPaper.id, payload);
        // Remove from pending updates if it was staged previously
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.delete(editingPaper.id);
          return next;
        });
        setEditingPaper(null);
        setReplacePdfSuccess(null);
        await onRefresh();
        setSuccessNotice('Changes saved successfully');
        setTimeout(() => setSuccessNotice(null), 5000);
      } else {
        // Stage as pending change
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.set(editingPaper.id, payload);
          return next;
        });
        const updatedTitle = payload.title || 'Paper';
        setEditingPaper(null);
        setReplacePdfSuccess(null);
        setSuccessNotice(`Paper "${updatedTitle}" changes staged. Click "Save Changes" to commit permanently.`);
        setTimeout(() => setSuccessNotice(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to update paper:', err);
      setEditError(err.message || 'Failed to update question paper in database');
      setErrorNotice(err.message || 'Failed to update question paper in database');
    } finally {
      setEditSaving(false);
    }
  };

  // SAVE CHANGES TO REAL DATABASE
  const handleSaveChanges = async () => {
    if (totalPendingCount === 0) {
      setSuccessNotice('No pending changes to save. All question papers are synchronized with the database.');
      setErrorNotice(null);
      setTimeout(() => setSuccessNotice(null), 3000);
      return;
    }

    setIsSavingChanges(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      // 1. Process deletions in database
      for (const id of Array.from(pendingDeletes)) {
        await api.adminDeletePaper(id);
      }

      // 2. Process updates in database
      for (const [id, data] of Array.from(pendingUpdates.entries())) {
        await api.adminUpdatePaper(id, data);
      }

      // Confirmed by database!
      setPendingDeletes(new Set());
      setPendingUpdates(new Map());

      // Refresh data from real database
      await onRefresh();

      setSuccessNotice('Changes saved successfully');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to save paper changes:', err);
      setErrorNotice(err.message || 'Database save failed. Please check connection and try again.');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleReplacePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPaper) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setEditError('Only PDF files are accepted.');
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
      return;
    }

    setReplacingPdf(true);
    setReplacePdfSuccess(null);
    setEditError(null);

    try {
      const res = await api.adminUploadPdf(file);
      setEditingPaper((prev) =>
        prev
          ? {
              ...prev,
              file_name: res.file_name,
              file_url: res.file_url,
              file_size: res.file_size,
              updated_at: new Date().toISOString(),
            }
          : null
      );
      setReplacePdfSuccess(`Uploaded new PDF: ${res.file_name} (${res.file_size})`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to upload replacement PDF');
    } finally {
      setReplacingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
            All Question Papers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, filter, edit, delete, and control publication status of all examination papers in the shared database ({papers.length} total).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            title={
              totalPendingCount > 0
                ? `${totalPendingCount} pending change(s) ready to be saved permanently to database`
                : 'No pending changes. Real database is up to date.'
            }
          >
            {isSavingChanges ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-300" />
                <span>Save Changes</span>
                {totalPendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white text-emerald-800 rounded-full font-black">
                    {totalPendingCount}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={() => onNavigateTab('upload-paper')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Question Paper</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorNotice && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Paper title, Subject, Subject code, Course, or Exam year..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setSearch('');
              setFilterCourse('all');
              setFilterYear('all');
              setFilterSemester('all');
              setFilterSubject('all');
              setFilterExamYear('all');
              setFilterLanguage('all');
              setFilterStatus('all');
            }}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        {/* Multi-filter row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-2 border-t border-slate-100">
          {/* Course */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Course</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Years</option>
              {availableAcademicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Semesters</option>
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Subjects</option>
              {subjects
                .filter((s) => filterCourse === 'all' || s.course_id === filterCourse)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Exam Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exam Year</label>
            <select
              value={filterExamYear}
              onChange={(e) => setFilterExamYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Years</option>
              {availableExamYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Language</label>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Hindi + English">Hindi + English</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2 font-bold text-blue-900">
            <span>{selectedIds.length} question paper(s) selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkSetStatus('Published')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Publish Selected
            </button>
            <button
              onClick={() => handleBulkSetStatus('Draft')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Unpublish Selected
            </button>
            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {filteredPapers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No question papers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No question papers match your current search and filter criteria. Try adjusting the filters or upload a new paper.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredPapers.length > 0 &&
                        selectedIds.length === filteredPapers.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded-sm text-blue-600 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Paper Title & Code</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Year / Semester</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Exam Year</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Upload Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPapers.map((paper) => {
                  const isPublished = paper.is_published && paper.status !== 'Draft';
                  const isSelected = selectedIds.includes(paper.id);
                  const isPending = pendingUpdates.has(paper.id);
                  const uploadDate = paper.created_at
                    ? new Date(paper.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-';

                  const matchedCourse = paper.course_id ? coursesMap.get(paper.course_id) : undefined;
                  const matchedYear = paper.year_id ? yearsMap.get(paper.year_id) : undefined;
                  const matchedSem = paper.semester_id ? semestersMap.get(paper.semester_id) : undefined;
                  const matchedSub = paper.subject_id ? subjectsMap.get(paper.subject_id) : undefined;

                  return (
                    <tr
                      key={paper.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(paper.id)}
                          className="w-4 h-4 rounded-sm text-blue-600 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 line-clamp-1">
                          <span>{paper.title}</span>
                          {isPending && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                              Pending Save
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Code: {paper.paper_code || 'None'} • {paper.paper_type || 'Previous Year'}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[11px]"
                          title={matchedCourse?.name || paper.course_name}
                        >
                          {matchedCourse?.code || paper.course_code || matchedCourse?.name || paper.course_name || 'General'}
                        </span>
                      </td>

                      {/* Year / Semester */}
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-medium">{matchedYear?.name || paper.year_name || '1st Year'}</div>
                        <div className="text-[10px] text-slate-500">{matchedSem?.name || paper.semester || paper.semester_name || '1st Semester'}</div>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <div>{matchedSub?.name || paper.subject_name || 'Subject'}</div>
                        {(matchedSub?.code || paper.subject_code) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {matchedSub?.code || paper.subject_code}
                          </div>
                        )}
                      </td>

                      {/* Exam Year */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {paper.exam_year}
                      </td>

                      {/* Language */}
                      <td className="px-4 py-3.5 text-slate-600">
                        {paper.language || 'English'}
                      </td>

                      {/* Views & Downloads */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        <div>{paper.view_count || 0} views</div>
                        <div>{paper.download_count || 0} downloads</div>
                      </td>

                      {/* Status & Toggle Button */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(paper)}
                          disabled={togglingId === paper.id}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle Published / Draft"
                        >
                          {togglingId === paper.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isPublished ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Upload Date */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {uploadDate}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          {/* View PDF */}
                          <button
                            onClick={() => onPreviewPaper(paper)}
                            title="View PDF"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(paper)}
                            title="Edit Paper"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmPaper(paper)}
                            title="Delete Paper"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Stats bar */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredPapers.length}</span> of{' '}
            <span className="font-bold text-slate-700">{papers.length}</span> question papers
            {totalPendingCount > 0 && (
              <span className="ml-2 font-bold text-amber-600">
                ({totalPendingCount} pending save)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Published:{' '}
              <strong className="text-emerald-700">
                {displayedPapers.filter((p) => p.is_published && p.status !== 'Draft').length}
              </strong>
            </span>
            <span>
              Drafts:{' '}
              <strong className="text-amber-700">
                {displayedPapers.filter((p) => !p.is_published || p.status === 'Draft').length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Edit Paper Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif">
                    Edit Question Paper
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update metadata, academic classification, or replace the PDF document
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPaper(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {replacePdfSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{replacePdfSuccess}</span>
              </div>
            )}

            <form onSubmit={(e) => handleEditSubmit(e, true)} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingPaper.title || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, title: e.target.value })}
                  placeholder="e.g. Engineering Mathematics - I"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Year *
                  </label>
                  <select
                    value={editingPaper.exam_year || editingPaper.paper_year || ''}
                    onChange={(e) =>
                      setEditingPaper({
                        ...editingPaper,
                        exam_year: Number(e.target.value),
                        paper_year: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paper Code
                  </label>
                  <input
                    type="text"
                    value={editingPaper.paper_code || ''}
                    onChange={(e) => setEditingPaper({ ...editingPaper, paper_code: e.target.value })}
                    placeholder="e.g. CS101, BT-302"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={editingPaper.exam_type || 'Main Exam'}
                    onChange={(e) => setEditingPaper({ ...editingPaper, exam_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Main Exam">Main Exam</option>
                    <option value="Supplementary">Supplementary</option>
                    <option value="Backlog / ATKT">Backlog / ATKT</option>
                    <option value="Mid Term / Internal">Mid Term / Internal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paper Type
                  </label>
                  <select
                    value={editingPaper.paper_type || 'Previous Year'}
                    onChange={(e) => setEditingPaper({ ...editingPaper, paper_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Previous Year">Previous Year</option>
                    <option value="Model Paper">Model Paper</option>
                    <option value="Sample Paper">Sample Paper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Language
                  </label>
                  <select
                    value={editingPaper.language || 'English'}
                    onChange={(e) => setEditingPaper({ ...editingPaper, language: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Hindi + English">Hindi + English</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={editingPaper.course_id || ''}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const selectedCourse = courses.find((c) => c.id === cId);
                      setEditingPaper({
                        ...editingPaper,
                        course_id: cId,
                        course_name: selectedCourse?.name || editingPaper.course_name,
                        course_code: selectedCourse?.code || editingPaper.course_code,
                        university_id: selectedCourse?.university_id || editingPaper.university_id,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
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
                    value={editingPaper.year_id || ''}
                    onChange={(e) => {
                      const yId = e.target.value;
                      const selectedYear = years.find((y) => y.id === yId);
                      setEditingPaper({
                        ...editingPaper,
                        year_id: yId,
                        year_name: selectedYear?.name || editingPaper.year_name,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Academic Year</option>
                    {years
                      .filter((y) => !editingPaper.course_id || y.course_id === editingPaper.course_id)
                      .map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester / Term
                  </label>
                  <select
                    value={editingPaper.semester_id || ''}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const selectedSem = semesters.find((s) => s.id === sId);
                      setEditingPaper({
                        ...editingPaper,
                        semester_id: sId,
                        semester: selectedSem?.name || editingPaper.semester,
                        semester_name: selectedSem?.name || editingPaper.semester_name,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Semester</option>
                    {semesters
                      .filter(
                        (s) =>
                          (!editingPaper.course_id || s.course_id === editingPaper.course_id) &&
                          (!editingPaper.year_id || s.year_id === editingPaper.year_id)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={editingPaper.subject_id || ''}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const selectedSubject = subjects.find((s) => s.id === sId);
                      if (selectedSubject) {
                        setEditingPaper({
                          ...editingPaper,
                          subject_id: sId,
                          subject_name: selectedSubject.name,
                          subject_code: selectedSubject.code,
                          university_id: selectedSubject.university_id || editingPaper.university_id,
                          course_id: selectedSubject.course_id || editingPaper.course_id,
                          year_id: selectedSubject.year_id || editingPaper.year_id,
                          semester_id: selectedSubject.semester_id || editingPaper.semester_id,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Select Subject</option>
                    {subjects
                      .filter((s) => !editingPaper.course_id || s.course_id === editingPaper.course_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={editingPaper.total_marks || ''}
                    onChange={(e) =>
                      setEditingPaper({ ...editingPaper, total_marks: Number(e.target.value) })
                    }
                    placeholder="75"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={editingPaper.duration || ''}
                    onChange={(e) => setEditingPaper({ ...editingPaper, duration: e.target.value })}
                    placeholder="3 Hours"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Status toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Publication Status</div>
                  <div className="text-[11px] text-slate-500">
                    Published papers are publicly visible and downloadable on the student portal.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const willPublish = !(editingPaper.status === 'Published' || editingPaper.is_published);
                    setEditingPaper({
                      ...editingPaper,
                      status: willPublish ? 'Published' : 'Draft',
                      is_published: willPublish,
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    editingPaper.status === 'Published' || editingPaper.is_published
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {editingPaper.status === 'Published' || editingPaper.is_published
                    ? 'Published'
                    : 'Draft'}
                </button>
              </div>

              {/* PDF Replacement section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Attached PDF Document</div>
                    <div className="text-[11px] text-slate-500">
                      {editingPaper.file_name || 'paper.pdf'} ({editingPaper.file_size || 'PDF Document'})
                    </div>
                  </div>
                  {editingPaper.file_url && (
                    <button
                      type="button"
                      onClick={() => onPreviewPaper(editingPaper)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Current PDF</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    Replace this file with a new PDF:
                  </span>
                  <div>
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleReplacePdfChange}
                      className="hidden"
                      id="replace-pdf-input"
                    />
                    <label
                      htmlFor="replace-pdf-input"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      {replacingPdf ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                          <span>Select New PDF</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPaper(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleEditSubmit(e, false)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer inline-flex items-center space-x-1.5"
                  title="Stage changes as pending to save along with other items"
                >
                  <span>Stage Changes</span>
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer inline-flex items-center space-x-2"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPaper && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete Question Paper
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900">"{deleteConfirmPaper.title}"</strong>?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2">
                This will stage the paper for permanent removal. Click "Save Changes" on the tab to commit to the real database.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaper(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePaper}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer inline-flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Stage for Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Bulk Delete Question Papers
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete{' '}
                <strong className="text-slate-900">{selectedIds.length}</strong> selected question paper(s)?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2">
                This will stage all selected papers for deletion. Click "Save Changes" on the page header to commit to the database.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer inline-flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Stage for Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
