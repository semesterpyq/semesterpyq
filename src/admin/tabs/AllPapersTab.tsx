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
} from 'lucide-react';
import { Course, Year, Subject, QuestionPaper } from '../../types';
import { api } from '../../api';

interface AllPapersTabProps {
  courses: Course[];
  years: Year[];
  subjects: Subject[];
  papers: QuestionPaper[];
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
  onPreviewPaper: (paper: QuestionPaper) => void;
}

export const AllPapersTab: React.FC<AllPapersTabProps> = ({
  courses,
  years,
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

  // Distinct Semesters in papers
  const availableSemesters = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => {
      if (p.semester) set.add(p.semester);
    });
    ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', 'Annual Exam'].forEach((s) => set.add(s));
    return Array.from(set);
  }, [papers]);

  // Filtered papers
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = paper.title.toLowerCase().includes(q);
        const matchesSub = (paper.subject_name || '').toLowerCase().includes(q);
        const matchesCode = (paper.paper_code || '').toLowerCase().includes(q) || (paper.subject_code || '').toLowerCase().includes(q);
        const matchesCourse = (paper.course_name || '').toLowerCase().includes(q) || (paper.course_code || '').toLowerCase().includes(q);
        const matchesYear = String(paper.exam_year).includes(q);
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
        const matchesYearName = (paper.year_name || '').toLowerCase().includes(filterYear.toLowerCase());
        const matchesYearId = paper.year_id === filterYear;
        if (!matchesYearName && !matchesYearId) return false;
      }

      // 4. Semester
      if (filterSemester !== 'all') {
        if (paper.semester !== filterSemester) return false;
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
  }, [papers, search, filterCourse, filterYear, filterSemester, filterSubject, filterExamYear, filterLanguage, filterStatus]);

  // Toggle single paper published/draft status
  const handleToggleStatus = async (paper: QuestionPaper) => {
    setTogglingId(paper.id);
    const newStatus = (paper.is_published && paper.status !== 'Draft') ? 'Draft' : 'Published';
    const newIsPub = newStatus === 'Published';
    try {
      await api.adminUpdatePaper(paper.id, {
        status: newStatus,
        is_published: newIsPub,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete single paper
  const handleDeletePaper = async () => {
    if (!deleteConfirmPaper) return;
    setDeleting(true);
    try {
      await api.adminDeletePaper(deleteConfirmPaper.id);
      setDeleteConfirmPaper(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question paper');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk actions
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

  const handleBulkSetStatus = async (status: 'Published' | 'Draft') => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      await api.adminBulkSetPaperStatus(selectedIds, status);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Bulk status update failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      await api.adminBulkDeletePapers(selectedIds);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Edit Paper form save
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaper) return;
    setEditSaving(true);
    setEditError(null);

    try {
      await api.adminUpdatePaper(editingPaper.id, editingPaper);
      setEditingPaper(null);
      setReplacePdfSuccess(null);
      onRefresh();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update question paper');
    } finally {
      setEditSaving(false);
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

        <button
          onClick={() => onNavigateTab('upload-paper')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Question Paper</span>
        </button>
      </div>

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

        {/* Cascading Filter dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
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
                  {c.code}
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
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
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
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-900 text-white rounded-2xl p-4 px-6 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">papers selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkSetStatus('Published')}
              disabled={bulkActionLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Selected</span>
            </button>

            <button
              onClick={() => handleBulkSetStatus('Draft')}
              disabled={bulkActionLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Unpublish (Draft)</span>
            </button>

            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={bulkActionLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Question Papers Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {filteredPapers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              No question papers match your current filters.
            </p>
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
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filteredPapers.length && filteredPapers.length > 0}
                      className="w-4 h-4 rounded-sm text-blue-600 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Paper Title</th>
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
                  const uploadDate = paper.created_at
                    ? new Date(paper.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-';

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
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {paper.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Code: {paper.paper_code || 'None'} • {paper.paper_type || 'Previous Year'}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[11px]">
                          {paper.course_code || paper.course_name || 'Course'}
                        </span>
                      </td>

                      {/* Year / Semester */}
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-medium">{paper.year_name || 'Year'}</div>
                        <div className="text-[10px] text-slate-500">{paper.semester || 'Annual'}</div>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {paper.subject_name || 'Subject'}
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
                            onClick={() => setEditingPaper(paper)}
                            title="Edit Paper"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmPaper(paper)}
                            title="Delete Paper"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
      </div>

      {/* Edit Paper Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif">Edit Question Paper</h3>
                <p className="text-xs text-slate-300">
                  Update database record for "{editingPaper.title}"
                </p>
              </div>
              <button
                onClick={() => setEditingPaper(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingPaper.title}
                  onChange={(e) => setEditingPaper({ ...editingPaper, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Year
                  </label>
                  <input
                    type="number"
                    value={editingPaper.exam_year}
                    onChange={(e) => setEditingPaper({ ...editingPaper, exam_year: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paper Code
                  </label>
                  <input
                    type="text"
                    value={editingPaper.paper_code || ''}
                    onChange={(e) => setEditingPaper({ ...editingPaper, paper_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={editingPaper.exam_type || editingPaper.exam_session || 'University Exam'}
                    onChange={(e) => setEditingPaper({ ...editingPaper, exam_type: e.target.value, exam_session: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="University Exam">University Exam</option>
                    <option value="Semester Exam">Semester Exam</option>
                    <option value="Annual Exam">Annual Exam</option>
                    <option value="Entrance Exam">Entrance Exam</option>
                    <option value="Competitive Exam">Competitive Exam</option>
                    <option value="Internal Exam">Internal Exam</option>
                    <option value="Model Paper">Model Paper</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paper Type
                  </label>
                  <select
                    value={editingPaper.paper_type || 'Previous Year Paper'}
                    onChange={(e) => setEditingPaper({ ...editingPaper, paper_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Previous Year Paper">Previous Year Paper</option>
                    <option value="Model Paper">Model Paper</option>
                    <option value="Sample Paper">Sample Paper</option>
                    <option value="Practice Paper">Practice Paper</option>
                    <option value="Important Questions">Important Questions</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingPaper.status || (editingPaper.is_published ? 'Published' : 'Draft')}
                    onChange={(e) => {
                      const st = e.target.value as 'Published' | 'Draft';
                      setEditingPaper({
                        ...editingPaper,
                        status: st,
                        is_published: st === 'Published',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course / Class
                  </label>
                  <select
                    value={editingPaper.course_id || ''}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const selectedCourse = courses.find((c) => c.id === cId);
                      setEditingPaper({
                        ...editingPaper,
                        course_id: cId,
                        course_name: selectedCourse?.name,
                        course_code: selectedCourse?.code,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
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
                      setEditingPaper({
                        ...editingPaper,
                        subject_id: sId,
                        subject_name: selectedSubject?.name,
                        subject_code: selectedSubject?.code,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {subjects
                      .filter((s) => !editingPaper.course_id || s.course_id === editingPaper.course_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
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
                    value={editingPaper.total_marks || 75}
                    onChange={(e) => setEditingPaper({ ...editingPaper, total_marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Order (Sorting Priority)
                  </label>
                  <input
                    type="number"
                    value={editingPaper.display_order ?? 0}
                    onChange={(e) => setEditingPaper({ ...editingPaper, display_order: Number(e.target.value) })}
                    placeholder="e.g. 1, 2, 3..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* PDF File Management / Replace */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Attached PDF File</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {editingPaper.file_size || 'Original'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono break-all">
                  {editingPaper.file_name || 'QuestionPaper.pdf'}
                </p>
                {replacePdfSuccess && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium">
                    {replacePdfSuccess}
                  </div>
                )}
                <div className="pt-1 flex items-center space-x-3">
                  <input
                    type="file"
                    ref={replaceFileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handleReplacePdfChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => replaceFileInputRef.current?.click()}
                    disabled={replacingPdf}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    {replacingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{replacingPdf ? 'Uploading New PDF...' : 'Replace PDF File'}</span>
                  </button>
                  <a
                    href={`/api/papers/${editingPaper.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>Preview Current PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingPaper.description || ''}
                  onChange={(e) => setEditingPaper({ ...editingPaper, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  type="submit"
                  disabled={editSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
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
                Are you sure you want to delete this question paper?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl text-slate-800 text-xs font-semibold mt-2">
                "{deleteConfirmPaper.title}"
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaper(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePaper}
                disabled={deleting}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Paper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Delete {selectedIds.length} Question Papers?
              </h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete the selected {selectedIds.length} papers from the shared database? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
