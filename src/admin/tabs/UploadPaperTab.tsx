import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Loader2,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { Course, Semester, Subject, University, Year } from '../../types';
import { api } from '../../api';

interface UploadPaperTabProps {
  onPaperUploaded: () => void;
  onNavigateTab: (tabId: string) => void;
  onViewPublicSite: () => void;
}

export const UploadPaperTab: React.FC<UploadPaperTabProps> = ({
  onPaperUploaded,
  onNavigateTab,
  onViewPublicSite,
}) => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Selection state
  const [selectedUnivId, setSelectedUnivId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [paperYear, setPaperYear] = useState<number>(new Date().getFullYear());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Paper details
  const [title, setTitle] = useState('');
  const [paperCode, setPaperCode] = useState('');
  const [totalMarks, setTotalMarks] = useState('75');
  const [duration, setDuration] = useState('3 Hours');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [quickSubjectName, setQuickSubjectName] = useState('');
  const [quickSubjectCode, setQuickSubjectCode] = useState('');
  const [showQuickSubject, setShowQuickSubject] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Load Courses
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

  // Load Years
  const refreshYears = async () => {
    if (!selectedCourseId) {
      setYears([]);
      setSelectedYearId('');
      return;
    }
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

  useEffect(() => {
    refreshYears();
  }, [selectedCourseId, selectedUnivId]);

  // Load Semesters
  const refreshSemesters = async () => {
    if (!selectedYearId) {
      setSemesters([]);
      setSelectedSemesterId('');
      return;
    }
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

  useEffect(() => {
    refreshSemesters();
  }, [selectedYearId, selectedCourseId, selectedUnivId]);

  // Load Subjects
  const refreshSubjects = async () => {
    if (!selectedSemesterId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }
    try {
      const subList = await api.adminGetSubjects({
        universityId: selectedUnivId,
        courseId: selectedCourseId,
        yearId: selectedYearId,
        semesterId: selectedSemesterId,
      });
      setSubjects(subList || []);
      if (subList && subList.length > 0) {
        setSelectedSubjectId(subList[0].id);
      } else {
        setSelectedSubjectId('');
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  useEffect(() => {
    refreshSubjects();
  }, [selectedSemesterId, selectedYearId, selectedCourseId, selectedUnivId]);

  const handleQuickAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubjectName.trim() || !selectedSemesterId) return;
    setAddingSubject(true);
    try {
      const created = await api.adminCreateSubject({
        university_id: selectedUnivId,
        course_id: selectedCourseId,
        year_id: selectedYearId,
        semester_id: selectedSemesterId,
        name: quickSubjectName.trim(),
        code: quickSubjectCode.trim().toUpperCase() || 'SUB-01',
      });
      await refreshSubjects();
      if (created?.id) setSelectedSubjectId(created.id);
      setQuickSubjectName('');
      setQuickSubjectCode('');
      setShowQuickSubject(false);
    } catch (err: any) {
      setErrorMsg(`Failed to add subject: ${err.message}`);
    } finally {
      setAddingSubject(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnivId || !selectedCourseId || !selectedYearId || !selectedSemesterId || !selectedSubjectId) {
      setErrorMsg('Please complete all selection dropdowns (University, Course, Year, Semester, Subject).');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Paper Title is required.');
      return;
    }

    if (!pdfFile) {
      setErrorMsg('Please select a PDF file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('university_id', selectedUnivId);
      formData.append('course_id', selectedCourseId);
      formData.append('year_id', selectedYearId);
      formData.append('semester_id', selectedSemesterId);
      formData.append('paper_year', String(paperYear));
      formData.append('exam_year', String(paperYear));
      formData.append('subject_id', selectedSubjectId);
      formData.append('title', title.trim());
      formData.append('paper_code', paperCode.trim() || `QP-${paperYear}`);
      formData.append('total_marks', totalMarks);
      formData.append('duration', duration);
      formData.append('pdf', pdfFile);

      await api.adminCreatePaperWithFile(formData);

      setSuccessMsg(`Question paper "${title.trim()}" uploaded successfully! It is now instantly published and visible on the public website for students.`);
      setTitle('');
      setPaperCode('');
      setPdfFile(null);
      onPaperUploaded();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload question paper.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Upload Question Paper</h2>
          <p className="text-xs text-slate-500 mt-1">
            Attach PDF question papers with full university, course, academic year, semester, and subject hierarchy.
          </p>
        </div>

        <button
          type="button"
          onClick={onViewPublicSite}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
          <span>View Public Website</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('all-papers')}
              className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl font-bold text-xs hover:bg-emerald-100/50 transition-colors cursor-pointer"
            >
              Manage Papers
            </button>
            <button
              onClick={onViewPublicSite}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              View on Website →
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Cascading Hierarchy Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          {/* University */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. University *</span>
            </label>
            <select
              required
              value={selectedUnivId}
              onChange={(e) => setSelectedUnivId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Course *</span>
            </label>
            <select
              required
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {courses.length === 0 ? (
                <option value="">No courses added for this university</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Year */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Academic Year *</span>
              </label>
            </div>
            <select
              required
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {years.length === 0 ? (
                <option value="">No years found for this course</option>
              ) : (
                years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Semester *</span>
            </label>
            <select
              required
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {semesters.length === 0 ? (
                <option value="">No semesters added for this year</option>
              ) : (
                semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Paper Year */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>5. Exam Paper Year (e.g. 2025, 2024, 2023) *</span>
            </label>
            <input
              type="number"
              required
              min={2000}
              max={2035}
              value={paperYear}
              onChange={(e) => setPaperYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>6. Subject *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickSubject(!showQuickSubject)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {showQuickSubject ? 'Cancel' : '+ Quick Add Subject'}
              </button>
            </div>

            {showQuickSubject ? (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <input
                  type="text"
                  placeholder="Subject name (e.g. Physics I)"
                  value={quickSubjectName}
                  onChange={(e) => setQuickSubjectName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs bg-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Code (e.g. PHY-101)"
                    value={quickSubjectCode}
                    onChange={(e) => setQuickSubjectCode(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs bg-white"
                  />
                  <button
                    type="button"
                    disabled={addingSubject || !quickSubjectName.trim()}
                    onClick={handleQuickAddSubject}
                    className="w-1/2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {addingSubject ? 'Adding...' : 'Save Subject'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                required
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects found (Click '+ Quick Add Subject')</option>
                ) : (
                  subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code || 'SUB'})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>

        {/* Step 2: Paper Details */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 font-serif border-b border-slate-100 pb-2">
            Paper Title & Examination Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Differential Equations & Vector Calculus (Paper I)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Code / Serial
              </label>
              <input
                type="text"
                placeholder="e.g. MATH-101 / QP-2024"
                value={paperCode}
                onChange={(e) => setPaperCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Marks
                </label>
                <input
                  type="text"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: PDF File Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            PDF File *
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors bg-slate-50">
            <input
              type="file"
              accept=".pdf,application/pdf"
              required
              id="pdf-upload-input"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="pdf-upload-input" className="cursor-pointer space-y-2 block">
              <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
              {pdfFile ? (
                <div>
                  <p className="font-bold text-xs text-indigo-700">{pdfFile.name}</p>
                  <p className="text-[11px] text-slate-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-xs text-slate-700">Click to select PDF question paper</p>
                  <p className="text-[11px] text-slate-400">PDF documents up to 50MB supported</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading & Publishing Paper...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Save & Upload Question Paper</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

