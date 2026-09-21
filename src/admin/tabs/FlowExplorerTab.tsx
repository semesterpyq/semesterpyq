import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Calendar,
  CalendarDays,
  BookOpen,
  FileText,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  X,
  Maximize2
} from 'lucide-react';
import { Course, Year, Subject, QuestionPaper } from '../../types';
import { api } from '../../api';
import { PdfViewer } from '../../components/PdfViewer';

interface FlowExplorerTabProps {
  courses: Course[];
  years: Year[];
  subjects: Subject[];
  papers: QuestionPaper[];
  onRefresh: () => void;
  onOpenCreatePaperModal: (initialData?: {
    courseId?: string;
    yearId?: string;
    examYear?: number;
    subjectId?: string;
  }) => void;
  onOpenEditPaperModal: (paper: QuestionPaper) => void;
}

export const FlowExplorerTab: React.FC<FlowExplorerTabProps> = ({
  courses,
  years,
  subjects,
  papers,
  onRefresh,
  onOpenCreatePaperModal,
  onOpenEditPaperModal,
}) => {
  // Step selections
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedExamYear, setSelectedExamYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // PDF Preview modal
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Derived entities
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || courses[0] || null,
    [courses, selectedCourseId]
  );

  const availableYears = useMemo(() => {
    if (!selectedCourse) return [];
    return years
      .filter((y) => y.course_id === selectedCourse.id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [years, selectedCourse]);

  // Keep selected year valid
  const effectiveYearId = useMemo(() => {
    if (selectedYearId && availableYears.some((y) => y.id === selectedYearId)) {
      return selectedYearId;
    }
    return availableYears[0]?.id || '';
  }, [selectedYearId, availableYears]);

  const selectedYear = useMemo(
    () => availableYears.find((y) => y.id === effectiveYearId) || null,
    [availableYears, effectiveYearId]
  );

  // Available exam years for this course & academic year
  const availableExamYears = useMemo(() => {
    if (!selectedCourse || !selectedYear) return [];
    const yearPapers = papers.filter(
      (p) => p.course_id === selectedCourse.id && p.year_id === selectedYear.id
    );
    const set = new Set<number>();
    yearPapers.forEach((p) => set.add(p.exam_year));
    // Always include latest standard examination years
    [2026, 2025, 2024, 2023, 2022, 2021].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [papers, selectedCourse, selectedYear]);

  // Keep selected exam year valid
  const effectiveExamYear = useMemo(() => {
    if (selectedExamYear && availableExamYears.includes(selectedExamYear)) {
      return selectedExamYear;
    }
    return availableExamYears[0] || 2026;
  }, [selectedExamYear, availableExamYears]);

  // Available subjects for this course & academic year
  const availableSubjects = useMemo(() => {
    if (!selectedCourse || !selectedYear) return [];
    return subjects
      .filter((s) => s.course_id === selectedCourse.id && s.year_id === selectedYear.id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [subjects, selectedCourse, selectedYear]);

  // Keep selected subject valid
  const effectiveSubjectId = useMemo(() => {
    if (selectedSubjectId && availableSubjects.some((s) => s.id === selectedSubjectId)) {
      return selectedSubjectId;
    }
    return availableSubjects[0]?.id || '';
  }, [selectedSubjectId, availableSubjects]);

  const selectedSubject = useMemo(
    () => availableSubjects.find((s) => s.id === effectiveSubjectId) || null,
    [availableSubjects, effectiveSubjectId]
  );

  // Active papers matching the full 4-stage branch: Course -> Year -> Exam Year -> Subject
  const branchPapers = useMemo(() => {
    if (!selectedCourse || !selectedYear || !selectedSubject) return [];
    return papers.filter(
      (p) =>
        p.course_id === selectedCourse.id &&
        p.year_id === selectedYear.id &&
        p.exam_year === effectiveExamYear &&
        p.subject_id === selectedSubject.id
    );
  }, [papers, selectedCourse, selectedYear, effectiveExamYear, selectedSubject]);

  const handleTogglePublish = async (paper: QuestionPaper) => {
    try {
      await api.adminUpdatePaper(paper.id, { is_published: !paper.is_published });
      onRefresh();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeletePaper = async (id: string) => {
    try {
      await api.adminDeletePaper(id);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      alert('Error deleting paper: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 6-Step Workflow Manager</span>
          </div>
          <h2 className="text-xl font-bold font-serif text-white">Curriculum & Examination Flow Explorer</h2>
          <p className="text-xs text-blue-100/80 mt-1 max-w-2xl leading-relaxed">
            Directly navigate and manage the exact 6-step taxonomy experienced by students: 
            Course → Academic Year → Examination Year → Subject → Question Papers → PDF Preview.
          </p>
        </div>

        <button
          onClick={() =>
            onOpenCreatePaperModal({
              courseId: selectedCourse?.id,
              yearId: selectedYear?.id,
              examYear: effectiveExamYear,
              subjectId: selectedSubject?.id,
            })
          }
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Paper for Current Branch</span>
        </button>
      </div>

      {/* Active Breadcrumb Path */}
      <div className="flex items-center flex-wrap gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700">
        <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Active Branch:</span>
        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
          Step 1: {selectedCourse?.code || 'Course'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
          Step 2: {selectedYear?.name || 'Year'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
          Step 3: Exam Year {effectiveExamYear}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
          Step 4: {selectedSubject?.name || 'Subject'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">
          Step 5: {branchPapers.length} Papers Available
        </span>
      </div>

      {/* 4-Step Filter Bars (Steps 1 to 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Step 1: Select Degree Course */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              1. Choose Course
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({courses.length})</span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {courses.map((course) => {
              const active = course.id === selectedCourse?.id;
              return (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="block font-bold">{course.code}</span>
                    <span className={`text-[11px] truncate block ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      {course.name}
                    </span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${active ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {course.papers_count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Academic Year */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              2. Academic Year
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({availableYears.length})</span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {availableYears.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 italic">No academic years configured.</p>
            ) : (
              availableYears.map((year) => {
                const active = year.id === effectiveYearId;
                const yearPapersCount = papers.filter(
                  (p) => p.course_id === selectedCourse?.id && p.year_id === year.id
                ).length;

                return (
                  <button
                    key={year.id}
                    onClick={() => setSelectedYearId(year.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{year.name}</span>
                      <span className={`text-[10px] ${active ? 'text-indigo-200' : 'text-slate-400'}`}>
                        Year {year.year_number}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${active ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {yearPapersCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Step 3: Select Examination Year */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              3. Exam Year
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({availableExamYears.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {availableExamYears.map((yearNum) => {
              const active = yearNum === effectiveExamYear;
              const countInYear = papers.filter(
                (p) =>
                  p.course_id === selectedCourse?.id &&
                  p.year_id === effectiveYearId &&
                  p.exam_year === yearNum
              ).length;

              return (
                <button
                  key={yearNum}
                  onClick={() => setSelectedExamYear(yearNum)}
                  className={`p-2 rounded-lg text-xs text-center transition-all flex flex-col items-center justify-center cursor-pointer border ${
                    active
                      ? 'bg-amber-500 border-amber-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-sm font-bold font-serif">{yearNum}</span>
                  <span className={`text-[9px] mt-0.5 ${active ? 'text-amber-100' : 'text-slate-400'}`}>
                    {countInYear} {countInYear === 1 ? 'paper' : 'papers'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Select Subject */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              4. Subject
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({availableSubjects.length})</span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {availableSubjects.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 italic">No subjects configured for this year.</p>
            ) : (
              availableSubjects.map((sub) => {
                const active = sub.id === effectiveSubjectId;
                const countInSub = papers.filter(
                  (p) =>
                    p.course_id === selectedCourse?.id &&
                    p.year_id === effectiveYearId &&
                    p.exam_year === effectiveExamYear &&
                    p.subject_id === sub.id
                ).length;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <span className="block font-bold truncate">{sub.name}</span>
                      <span className={`text-[10px] font-mono ${active ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {sub.code}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${active ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {countInSub}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Step 5 & 6: Papers Under Selected Branch & PDF Viewer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 5: Question Papers</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {branchPapers.length} {branchPapers.length === 1 ? 'Paper' : 'Papers'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif mt-0.5">
              {selectedSubject?.name || 'Selected Subject'} — Examination Year {effectiveExamYear}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedCourse?.name} ({selectedCourse?.code}) • {selectedYear?.name}
            </p>
          </div>

          <button
            onClick={() =>
              onOpenCreatePaperModal({
                courseId: selectedCourse?.id,
                yearId: selectedYear?.id,
                examYear: effectiveExamYear,
                subjectId: selectedSubject?.id,
              })
            }
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Paper to this Subject ({effectiveExamYear})</span>
          </button>
        </div>

        {/* Papers Listing */}
        {branchPapers.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Question Papers for this Selection</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There is currently no examination question paper uploaded for {selectedSubject?.name} in the {effectiveExamYear} examination session.
            </p>
            <button
              onClick={() =>
                onOpenCreatePaperModal({
                  courseId: selectedCourse?.id,
                  yearId: selectedYear?.id,
                  examYear: effectiveExamYear,
                  subjectId: selectedSubject?.id,
                })
              }
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload {effectiveExamYear} Paper Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branchPapers.map((paper) => (
              <div
                key={paper.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150 bg-white flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Exam Year: {paper.exam_year}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(paper)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        paper.is_published
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {paper.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{paper.is_published ? 'Published' : 'Draft'}</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 font-serif leading-snug">{paper.title}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{paper.paper_code}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Marks & Time</span>
                      <span>{paper.total_marks} Marks • {paper.duration}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">PDF Status</span>
                      <span>{paper.file_size}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Downloads</span>
                      <span>{paper.download_count || 0} times</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Views</span>
                      <span>{paper.view_count || 0} views</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Step 6 PDF Preview + Edit + Delete */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setPreviewPaper(paper)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Step 6: Preview PDF</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenEditPaperModal(paper)}
                      className="p-1.5 text-slate-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Paper Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(paper.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Question Paper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Delete Question Paper?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this examination question paper? Students will immediately lose access to this past paper.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePaper(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
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
