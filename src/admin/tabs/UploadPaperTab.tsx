import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Building2, GraduationCap, Calendar, Layers, BookOpen } from 'lucide-react';
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

  // Load Semesters
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
  useEffect(() => {
    if (!selectedSemesterId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }
    const loadSubjects = async () => {
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
    loadSubjects();
  }, [selectedSemesterId, selectedYearId, selectedCourseId, selectedUnivId]);

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
      formData.append('subject_id', selectedSubjectId);
      formData.append('title', title.trim());
      formData.append('paper_code', paperCode.trim());
      formData.append('total_marks', totalMarks);
      formData.append('duration', duration);
      formData.append('pdf', pdfFile);

      await api.adminCreatePaperWithFile(formData);

      setSuccessMsg('Question paper uploaded successfully! It is now instantly visible on the User Website.');
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
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 font-serif">Upload Question Paper</h2>
        <p className="text-xs text-slate-500 mt-1">
          Select University, Course, Year, Semester, Paper Year, and Subject to attach a PDF question paper.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={onViewPublicSite}
            className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors"
          >
            View on Public Site
          </button>
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
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Year *</span>
            </label>
            <select
              required
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {years.length === 0 ? (
                <option value="">No years added for this course</option>
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
              <span>5. Paper Year (e.g. 2024, 2025) *</span>
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
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>6. Subject *</span>
            </label>
            <select
              required
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {subjects.length === 0 ? (
                <option value="">No subjects added for this semester</option>
              ) : (
                subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code || 'SUB'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Step 2: Paper Details */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 font-serif border-b border-slate-100 pb-2">
            Paper Title & Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Differential Equations & Vector Calculus"
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
                placeholder="e.g. MATH-101"
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
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Uploading Paper...' : 'Save & Upload Question Paper'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
