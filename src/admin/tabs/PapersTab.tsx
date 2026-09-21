import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  AlertTriangle,
  UploadCloud,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  X,
  Filter,
  Layers,
  FileCheck
} from 'lucide-react';
import { Course, Year, Subject, QuestionPaper } from '../../types';
import { api } from '../../api';
import { PdfViewer } from '../../components/PdfViewer';

interface PapersTabProps {
  courses: Course[];
  years: Year[];
  subjects: Subject[];
  papers: QuestionPaper[];
  onRefresh: () => void;
  initialCreateData?: {
    courseId?: string;
    yearId?: string;
    examYear?: number;
    subjectId?: string;
  } | null;
  onClearInitialCreateData?: () => void;
}

export const PapersTab: React.FC<PapersTabProps> = ({
  courses,
  years,
  subjects,
  papers,
  onRefresh,
  initialCreateData,
  onClearInitialCreateData,
}) => {
  // Cascading Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedExamYearFilter, setSelectedExamYearFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formCourseId, setFormCourseId] = useState('');
  const [formYearId, setFormYearId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [examYear, setExamYear] = useState(2026);
  const [examSession, setExamSession] = useState('Annual Examination');
  const [paperCode, setPaperCode] = useState('');
  const [totalMarks, setTotalMarks] = useState(75);
  const [duration, setDuration] = useState('3 Hours');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('1.2 MB');
  const [isPublished, setIsPublished] = useState(true);

  // Available distinct exam years in dataset
  const allExamYears = useMemo(() => {
    const set = new Set<number>();
    papers.forEach((p) => set.add(p.exam_year));
    [2026, 2025, 2024, 2023, 2022, 2021].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [papers]);

  // Filtered dropdowns for Form
  const formAvailableYears = useMemo(() => {
    return years.filter((y) => y.course_id === formCourseId);
  }, [years, formCourseId]);

  const formAvailableSubjects = useMemo(() => {
    return subjects.filter(
      (s) => s.course_id === formCourseId && (!formYearId || s.year_id === formYearId)
    );
  }, [subjects, formCourseId, formYearId]);

  // Open modal when initialCreateData is passed
  useEffect(() => {
    if (initialCreateData) {
      setEditingPaper(null);
      const cId = initialCreateData.courseId || courses[0]?.id || '';
      const yId =
        initialCreateData.yearId ||
        years.find((y) => y.course_id === cId)?.id ||
        '';
      const sId =
        initialCreateData.subjectId ||
        subjects.find((s) => s.course_id === cId && (!yId || s.year_id === yId))?.id ||
        '';
      const eYr = initialCreateData.examYear || 2026;

      const subObj = subjects.find((s) => s.id === sId);

      setFormCourseId(cId);
      setFormYearId(yId);
      setFormSubjectId(sId);
      setExamYear(eYr);
      setExamSession('Annual Examination');
      setTitle(`${eYr} Paper - ${subObj?.name || 'Subject'}`);
      setPaperCode(`QP-${String(eYr).slice(-2)}-${subObj?.code || 'SUB'}`);
      setTotalMarks(75);
      setDuration('3 Hours');
      setFileName('');
      setFileUrl('');
      setFileSize('1.2 MB');
      setIsPublished(true);
      setError(null);
      setModalOpen(true);

      if (onClearInitialCreateData) {
        onClearInitialCreateData();
      }
    }
  }, [initialCreateData]);

  const openCreateModal = () => {
    setEditingPaper(null);
    const initialCourse = selectedCourseFilter !== 'all' ? selectedCourseFilter : courses[0]?.id || '';
    const initialYear =
      selectedYearFilter !== 'all'
        ? selectedYearFilter
        : years.find((y) => y.course_id === initialCourse)?.id || '';
    const initialSub =
      selectedSubjectFilter !== 'all'
        ? selectedSubjectFilter
        : subjects.find((s) => s.course_id === initialCourse && (!initialYear || s.year_id === initialYear))?.id || '';
    const initialExamYr = selectedExamYearFilter !== 'all' ? Number(selectedExamYearFilter) : 2026;

    const subObj = subjects.find((s) => s.id === initialSub);

    setFormCourseId(initialCourse);
    setFormYearId(initialYear);
    setFormSubjectId(initialSub);
    setExamYear(initialExamYr);
    setExamSession('Annual Examination');
    setTitle(`${initialExamYr} Paper - ${subObj?.name || 'Examination'}`);
    setPaperCode(`QP-${String(initialExamYr).slice(-2)}-${subObj?.code || '01'}`);
    setTotalMarks(75);
    setDuration('3 Hours');
    setFileName('');
    setFileUrl('');
    setFileSize('1.2 MB');
    setIsPublished(true);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (paper: QuestionPaper) => {
    setEditingPaper(paper);
    setFormCourseId(paper.course_id);
    setFormYearId(paper.year_id);
    setFormSubjectId(paper.subject_id);
    setTitle(paper.title);
    setExamYear(paper.exam_year);
    setExamSession(paper.exam_session);
    setPaperCode(paper.paper_code);
    setTotalMarks(paper.total_marks);
    setDuration(paper.duration);
    setFileName(paper.file_name);
    setFileUrl(paper.file_url);
    setFileSize(paper.file_size);
    setIsPublished(paper.is_published);
    setError(null);
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only .pdf files are accepted for examination papers');
      return;
    }

    setUploadingPdf(true);
    try {
      const res = await api.adminUploadPdf(file);
      setFileName(res.file_name);
      setFileUrl(res.file_url);
      setFileSize(res.file_size);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!formCourseId || !formYearId || !formSubjectId) {
        throw new Error('Please select Degree Course, Academic Year, and Subject');
      }

      const generatedFileName =
        fileName ||
        `QP_${formCourseId}_${formYearId}_${examYear}_${Date.now()}.pdf`;

      const payload = {
        course_id: formCourseId,
        year_id: formYearId,
        subject_id: formSubjectId,
        title: title.trim(),
        exam_year: Number(examYear),
        exam_session: examSession.trim(),
        paper_code: paperCode.trim().toUpperCase(),
        total_marks: Number(totalMarks),
        duration: duration.trim(),
        file_name: generatedFileName,
        file_url: fileUrl || `/api/papers/${editingPaper?.id || 'temp'}/file`,
        file_size: fileSize,
        is_published: isPublished,
      };

      if (editingPaper) {
        await api.adminUpdatePaper(editingPaper.id, payload);
      } else {
        await api.adminCreatePaper(payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save question paper');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (paper: QuestionPaper) => {
    try {
      await api.adminUpdatePaper(paper.id, { is_published: !paper.is_published });
      onRefresh();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.adminDeletePaper(id);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      alert('Error deleting question paper: ' + err.message);
    }
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return papers.filter((p) => {
      const matchesCourse = selectedCourseFilter === 'all' || p.course_id === selectedCourseFilter;
      const matchesYear = selectedYearFilter === 'all' || p.year_id === selectedYearFilter;
      const matchesExamYear =
        selectedExamYearFilter === 'all' || p.exam_year === Number(selectedExamYearFilter);
      const matchesSubject = selectedSubjectFilter === 'all' || p.subject_id === selectedSubjectFilter;
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'published' && p.is_published) ||
        (selectedStatusFilter === 'draft' && !p.is_published);

      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(q) ||
        p.paper_code.toLowerCase().includes(q) ||
        p.exam_year.toString().includes(q) ||
        (p.subject_name && p.subject_name.toLowerCase().includes(q)) ||
        (p.course_name && p.course_name.toLowerCase().includes(q));

      return matchesCourse && matchesYear && matchesExamYear && matchesSubject && matchesStatus && matchesSearch;
    });
  }, [
    papers,
    selectedCourseFilter,
    selectedYearFilter,
    selectedExamYearFilter,
    selectedSubjectFilter,
    selectedStatusFilter,
    search,
  ]);

  return (
    <div className="space-y-6">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Question Papers Archive</h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {filtered.length} of {papers.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official examination question papers, upload PDF files, and preview documents.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Add Question Paper</span>
        </button>
      </div>

      {/* 4-Level Cascading Hierarchy Filters */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-bold flex items-center gap-1.5 text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Curriculum Filters (6-Step Alignment)
          </span>
          {(selectedCourseFilter !== 'all' ||
            selectedYearFilter !== 'all' ||
            selectedExamYearFilter !== 'all' ||
            selectedSubjectFilter !== 'all' ||
            selectedStatusFilter !== 'all' ||
            search) && (
            <button
              onClick={() => {
                setSelectedCourseFilter('all');
                setSelectedYearFilter('all');
                setSelectedExamYearFilter('all');
                setSelectedSubjectFilter('all');
                setSelectedStatusFilter('all');
                setSearch('');
              }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Step 1: Course Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              1. Degree Course
            </label>
            <select
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setSelectedYearFilter('all');
                setSelectedSubjectFilter('all');
              }}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Academic Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              2. Academic Year
            </label>
            <select
              value={selectedYearFilter}
              onChange={(e) => {
                setSelectedYearFilter(e.target.value);
                setSelectedSubjectFilter('all');
              }}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Academic Years</option>
              {years
                .filter((y) => selectedCourseFilter === 'all' || y.course_id === selectedCourseFilter)
                .map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Step 3: Exam Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              3. Exam Year
            </label>
            <select
              value={selectedExamYearFilter}
              onChange={(e) => setSelectedExamYearFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-serif"
            >
              <option value="all">All Exam Years</option>
              {allExamYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Subject Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              4. Subject
            </label>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Subjects</option>
              {subjects
                .filter((s) => {
                  if (selectedCourseFilter !== 'all' && s.course_id !== selectedCourseFilter) return false;
                  if (selectedYearFilter !== 'all' && s.year_id !== selectedYearFilter) return false;
                  return true;
                })
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Visibility Status
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Visibility</option>
              <option value="published">Published</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>

        {/* Live Search input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers by title, paper code, subject, year..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Exam Year & Paper</th>
                <th className="p-3.5">Curriculum Branch</th>
                <th className="p-3.5">Specifications</th>
                <th className="p-3.5">Student Stats</th>
                <th className="p-3.5">Visibility</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No question papers found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((paper) => (
                  <tr key={paper.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 font-serif">
                          {paper.exam_year}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">{paper.paper_code}</span>
                      </div>
                      <p className="font-bold text-slate-900 mt-1 font-serif">{paper.title}</p>
                      <p className="text-[11px] text-slate-400">{paper.exam_session}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{paper.subject_name}</span>
                      <p className="text-[11px] text-slate-500">
                        {paper.course_code} • {paper.year_name}
                      </p>
                    </td>

                    <td className="p-3.5 text-slate-600">
                      <p>{paper.total_marks} Marks • {paper.duration}</p>
                      <p className="text-[11px] text-slate-400">PDF: {paper.file_size}</p>
                    </td>

                    <td className="p-3.5 text-slate-700">
                      <p className="font-semibold text-emerald-700">{paper.download_count || 0} downloads</p>
                      <p className="text-[11px] text-slate-400">{paper.view_count || 0} views</p>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => handleTogglePublish(paper)}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          paper.is_published
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {paper.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{paper.is_published ? 'Published' : 'Draft'}</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Step 6 PDF Preview */}
                      <button
                        onClick={() => setPreviewPaper(paper)}
                        className="inline-flex items-center space-x-1 p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Step 6: Preview Embedded PDF"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-[11px] font-semibold hidden md:inline">Preview</span>
                      </button>

                      <button
                        onClick={() => openEditModal(paper)}
                        className="p-1.5 text-slate-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Edit Paper Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(paper.id)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Delete Question Paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 6 Modal: Embedded PDF Viewer */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-800">
            {/* Modal Header */}
            <div className="px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="truncate pr-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    Step 6: Institutional Document Preview
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{previewPaper.paper_code}</span>
                </div>
                <h3 className="font-bold text-sm text-white font-serif mt-1 truncate">
                  {previewPaper.title} ({previewPaper.exam_year})
                </h3>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => setPreviewPaper(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded High-Fidelity PDF Viewer */}
            <div className="flex-1 overflow-hidden relative">
              <PdfViewer
                url={previewPaper.file_url || `/api/papers/${previewPaper.id}/file`}
                title={previewPaper.title}
                paperDetails={{
                  courseName: previewPaper.course_name,
                  courseCode: previewPaper.course_code,
                  yearName: previewPaper.year_name,
                  subjectName: previewPaper.subject_name || previewPaper.title,
                  subjectCode: previewPaper.subject_code || previewPaper.paper_code,
                  paperTitle: previewPaper.title,
                  examYear: previewPaper.exam_year,
                  examSession: previewPaper.exam_session,
                  paperCode: previewPaper.paper_code,
                  totalMarks: previewPaper.total_marks,
                  duration: previewPaper.duration,
                }}
                downloadUrl={`/api/papers/${previewPaper.id}/download`}
                downloadFilename={previewPaper.file_name}
                minHeight="100%"
                className="h-full rounded-none border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Paper Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  {editingPaper ? 'Edit Question Paper' : 'Upload / Add Question Paper'}
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in the curriculum details and PDF file for the examination archive.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Step 1 to 4: Curriculum Hierarchy Selectors */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block text-[11px]">
                  Curriculum Assignment
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      1. Degree Course *
                    </label>
                    <select
                      required
                      value={formCourseId}
                      onChange={(e) => {
                        const newCId = e.target.value;
                        setFormCourseId(newCId);
                        const firstYear = years.find((y) => y.course_id === newCId)?.id || '';
                        setFormYearId(firstYear);
                        const firstSub = subjects.find(
                          (s) => s.course_id === newCId && (!firstYear || s.year_id === firstYear)
                        )?.id || '';
                        setFormSubjectId(firstSub);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Degree Course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      2. Academic Year *
                    </label>
                    <select
                      required
                      value={formYearId}
                      onChange={(e) => {
                        const newYId = e.target.value;
                        setFormYearId(newYId);
                        const firstSub = subjects.find(
                          (s) => s.course_id === formCourseId && s.year_id === newYId
                        )?.id || '';
                        setFormSubjectId(firstSub);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Academic Year</option>
                      {formAvailableYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      3. Examination Year *
                    </label>
                    <input
                      type="number"
                      required
                      min={2015}
                      max={2030}
                      value={examYear}
                      onChange={(e) => setExamYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 font-serif"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      4. Curriculum Subject *
                    </label>
                    <select
                      required
                      value={formSubjectId}
                      onChange={(e) => {
                        const newSubId = e.target.value;
                        setFormSubjectId(newSubId);
                        const subObj = subjects.find((s) => s.id === newSubId);
                        if (subObj && !editingPaper) {
                          setTitle(`${examYear} Paper - ${subObj.name}`);
                          setPaperCode(`QP-${String(examYear).slice(-2)}-${subObj.code}`);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Select Subject</option>
                      {formAvailableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 5: Paper Specifics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">
                    Question Paper Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2026 Paper - Physics"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Paper Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={paperCode}
                    onChange={(e) => setPaperCode(e.target.value.toUpperCase())}
                    placeholder="e.g. QP-26-BSC-PHYS"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono uppercase focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Examination Session
                  </label>
                  <input
                    type="text"
                    value={examSession}
                    onChange={(e) => setExamSession(e.target.value)}
                    placeholder="e.g. Annual Examination"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3 Hours"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Step 6: PDF Upload Box */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <label className="block font-semibold text-slate-700">
                  Question Paper PDF Document (Step 6 Viewer)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center space-x-2 text-slate-700">
                      {uploadingPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-semibold text-xs">
                        {uploadingPdf ? 'Uploading...' : 'Choose .PDF File'}
                      </span>
                    </div>
                  </label>

                  <div className="text-slate-500 text-[11px] truncate flex-1">
                    {fileName ? (
                      <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {fileName} ({fileSize})
                      </span>
                    ) : (
                      <span>
                        If no custom PDF is uploaded, the institutional generator will format an official LBS Degree College past paper.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Published Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pub-check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pub-check" className="font-semibold text-slate-700 select-none">
                  Publish immediately (accessible by students in public portal)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPaper ? 'Save Changes' : 'Upload & Save Paper'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Delete Question Paper?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this question paper? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
