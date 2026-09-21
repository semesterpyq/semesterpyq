import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  RefreshCw,
  Loader2,
  ExternalLink,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Course, Year, Subject, QuestionPaper, SiteSettings } from '../../types';
import { api } from '../../api';
import { PdfViewer } from '../../components/PdfViewer';

interface UploadPaperTabProps {
  courses: Course[];
  years: Year[];
  subjects: Subject[];
  settings: SiteSettings;
  onPaperUploaded: (newPaper: QuestionPaper) => void;
  onNavigateTab: (tabId: string) => void;
  onViewPublicSite: () => void;
}

export const UploadPaperTab: React.FC<UploadPaperTabProps> = ({
  courses,
  years,
  subjects,
  settings,
  onPaperUploaded,
  onNavigateTab,
  onViewPublicSite,
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [courseInput, setCourseInput] = useState(courses[0]?.id || '');
  const [customCourseName, setCustomCourseName] = useState('');
  const [stream, setStream] = useState('Science');
  const [yearInput, setYearInput] = useState('1st Year');
  const [semester, setSemester] = useState('1st Semester');
  const [subjectInput, setSubjectInput] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [examType, setExamType] = useState('Annual Exam');
  const [examYear, setExamYear] = useState<number>(2026);
  const [examDate, setExamDate] = useState('');
  const [paperType, setPaperType] = useState('Previous Year Paper');
  const [language, setLanguage] = useState('English');
  const [totalMarks, setTotalMarks] = useState<number>(75);
  const [examDuration, setExamDuration] = useState('3 Hours');

  // Optional fields
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [featured, setFeatured] = useState(false);

  // Status
  const [status, setStatus] = useState<'Published' | 'Draft'>(
    settings.default_paper_status || 'Published'
  );

  // PDF File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileData, setUploadedFileData] = useState<{
    file_name: string;
    file_url: string;
    file_size: string;
  } | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [localPdfBlobUrl, setLocalPdfBlobUrl] = useState<string | null>(null);

  // Submission feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastCreatedPaper, setLastCreatedPaper] = useState<QuestionPaper | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered years based on selected course
  const availableYears = years.filter((y) => y.course_id === courseInput);

  // Filtered subjects based on course
  const availableSubjects = subjects.filter((s) => s.course_id === courseInput);

  // Handle PDF selection with real validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Strict PDF validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are accepted for examination papers.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Max size check
    const maxMb = settings.max_pdf_size_mb || 25;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(`The selected PDF exceeds the maximum allowed file size of ${maxMb} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const blobUrl = URL.createObjectURL(file);
    setLocalPdfBlobUrl(blobUrl);

    // Simulate clean upload progress
    setIsUploading(true);
    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 100);

    // Upload to server
    api.adminUploadPdf(file)
      .then((res) => {
        clearInterval(interval);
        setUploadProgress(100);
        setIsUploading(false);
        setUploadedFileData(res);
      })
      .catch((err) => {
        clearInterval(interval);
        setIsUploading(false);
        setUploadProgress(0);
        setErrorMsg(err.message || 'Failed to upload PDF file to server.');
      });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedFileData(null);
    setUploadProgress(0);
    if (localPdfBlobUrl) {
      URL.revokeObjectURL(localPdfBlobUrl);
      setLocalPdfBlobUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCourseSelect = (val: string) => {
    setCourseInput(val);
    if (val !== 'new') {
      setCustomCourseName('');
      // Auto-set stream if known
      const selected = courses.find((c) => c.id === val);
      if (selected) {
        if (selected.code.toLowerCase().includes('sc')) setStream('Science');
        else if (selected.code.toLowerCase().includes('com')) setStream('Commerce');
        else if (selected.code.toLowerCase().includes('ca')) setStream('Computer Applications');
        else if (selected.code.toLowerCase().includes('art') || selected.code.toLowerCase().includes('ba')) setStream('Arts');
      }
    }
  };

  const handleSubjectSelect = (val: string) => {
    setSubjectInput(val);
    if (val !== 'new') {
      const selected = subjects.find((s) => s.id === val);
      if (selected) {
        setSubjectCode(selected.code);
        if (!title || title.includes('Examination')) {
          setTitle(`${selected.name} - ${examYear} Examination`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validations
    if (!selectedFile && !uploadedFileData) {
      setErrorMsg('Please select a Question Paper PDF file.');
      return;
    }

    const finalCourse = courseInput === 'new' ? customCourseName.trim() : courseInput;
    if (!finalCourse) {
      setErrorMsg('Please select or specify a Course / Class.');
      return;
    }

    const finalSubject = subjectInput === 'new' ? customSubjectName.trim() : subjectInput;
    if (!finalSubject) {
      setErrorMsg('Please select or specify a Subject name.');
      return;
    }

    setSubmitting(true);

    try {
      // Build upload payload compatible with shared database
      const payload: Partial<QuestionPaper> & Record<string, any> = {
        title: title.trim() || `${finalSubject} - ${examYear} Examination`,
        course_id: courseInput !== 'new' ? courseInput : undefined,
        course: courseInput === 'new' ? customCourseName.trim() : undefined,
        stream,
        year_id: availableYears.find((y) => y.name === yearInput)?.id,
        year: yearInput,
        semester,
        subject_id: subjectInput !== 'new' ? subjectInput : undefined,
        subject: subjectInput === 'new' ? customSubjectName.trim() : undefined,
        subject_code: subjectCode.trim(),
        exam_type: examType,
        exam_session: examType,
        exam_year: Number(examYear),
        exam_date: examDate,
        paper_type: paperType,
        language,
        total_marks: Number(totalMarks),
        duration: examDuration,
        file_name: uploadedFileData?.file_name || selectedFile?.name || `Paper_${examYear}.pdf`,
        file_url: uploadedFileData?.file_url || `/uploads/papers/${uploadedFileData?.file_name}`,
        file_size: uploadedFileData?.file_size || `${(selectedFile!.size / (1024 * 1024)).toFixed(1)} MB`,
        thumbnail_url: thumbnailUrl.trim(),
        description: description.trim(),
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        featured,
        status,
        is_published: status === 'Published',
      };

      const created = await api.adminCreatePaper(payload);
      setLastCreatedPaper(created);
      onPaperUploaded(created);
      setSuccessMsg('Question paper uploaded successfully.');

      // Reset file selection for next upload
      handleRemoveFile();
      setTitle('');
      setSubjectCode('');
      setCustomSubjectName('');
    } catch (err: any) {
      console.error('Failed to upload question paper:', err);
      setErrorMsg(err.message || 'Failed to upload paper. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-blue-100">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Unified Database Sync</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
              Upload Question Paper
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Upload PDF question papers directly to the shared database. Papers set to Published will immediately appear in the corresponding Course → Year / Semester → Subject section of the public website.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('all-papers')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <span>View All Papers</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-sm text-emerald-900">
                {successMsg}
              </h3>
              <p className="text-xs text-emerald-700">
                The question paper has been stored in the shared database and auto-categorized into{' '}
                <span className="font-bold">
                  {lastCreatedPaper?.course_name || 'Course'} → {lastCreatedPaper?.year_name || 'Year'} → {lastCreatedPaper?.subject_name || 'Subject'}
                </span>
                .
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onViewPublicSite}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View on User Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('all-papers')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Open All Question Papers</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-500 hover:text-emerald-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-red-800 text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              1. Basic Paper Information
            </h2>
            <p className="text-xs text-slate-500">
              Provide complete academic hierarchy and examination identification details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paper Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Examination 2026 - Paper I: Inorganic Chemistry"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                required
              />
            </div>

            {/* Course / Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course / Class <span className="text-red-500">*</span>
              </label>
              <select
                value={courseInput}
                onChange={(e) => handleCourseSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
                <option value="new">+ Add / Type New Course</option>
              </select>

              {courseInput === 'new' && (
                <input
                  type="text"
                  value={customCourseName}
                  onChange={(e) => setCustomCourseName(e.target.value)}
                  placeholder="Enter Course name (e.g. B.Sc)"
                  className="mt-2 w-full px-3.5 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>

            {/* Stream */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stream / Discipline
              </label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="Science">Science (PCB / PCM)</option>
                <option value="Arts">Arts / Humanities</option>
                <option value="Commerce">Commerce & Accountancy</option>
                <option value="Computer Science">Computer Science / IT</option>
                <option value="Management">Management Studies</option>
                <option value="General">General / Vocational</option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Final Year">Final Year</option>
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester / Pattern <span className="text-red-500">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
                <option value="Annual Exam">Annual Exam (Non-Semester)</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={subjectInput}
                onChange={(e) => handleSubjectSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              >
                <option value="">-- Choose Subject --</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
                <option value="new">+ Add / Type New Subject</option>
              </select>

              {subjectInput === 'new' && (
                <input
                  type="text"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="Enter Subject name (e.g. Chemistry)"
                  className="mt-2 w-full px-3.5 py-2 bg-blue-50/50 border border-blue-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>

            {/* Subject Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. CHEM-201 or 105"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Exam & Classification */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              2. Examination Classification
            </h2>
            <p className="text-xs text-slate-500">
              Exam year, paper type, duration, and scoring specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Exam Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
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

            {/* Exam Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exam Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={examYear}
                onChange={(e) => setExamYear(Number(e.target.value))}
                min={2000}
                max={2035}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
            </div>

            {/* Exam Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Paper Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="Previous Year Paper">Previous Year Paper</option>
                <option value="Model Paper">Model Paper</option>
                <option value="Sample Paper">Sample Paper</option>
                <option value="Practice Paper">Practice Paper</option>
                <option value="Important Questions">Important Questions</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Language <span className="text-red-500">*</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Hindi + English">Hindi + English (Bilingual)</option>
              </select>
            </div>

            {/* Total Marks & Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Marks & Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  placeholder="Marks"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                <input
                  type="text"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  placeholder="Duration"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: PDF Upload Zone */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                3. Question Paper PDF File
              </h2>
              <p className="text-xs text-slate-500">
                Upload the authentic examination paper in PDF format (Max {settings.max_pdf_size_mb || 25} MB).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Only .PDF Accepted
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {!selectedFile && !uploadedFileData ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag & drop question paper PDF
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Standard institutional examinations document format (.pdf)
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {uploadedFileData?.file_name || selectedFile?.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {uploadedFileData?.file_size || (selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>PDF Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Uploading to server...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadedFileData && !isUploading && (
                <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PDF stored and verified on server</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Optional Metadata & Visibility */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              4. Optional Details & Publication Status
            </h2>
            <p className="text-xs text-slate-500">
              Set publication visibility, tags, and descriptive notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thumbnail / Cover Image URL (Optional)
              </label>
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://.../cover.png"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="inorganic, previous year, 2026, semester-3"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Exam Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Special notes or syllabus unit coverage for students..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="featuredPaperCheckbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="featuredPaperCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Mark as Featured Paper (highlight on website)
              </label>
            </div>

            {/* Publication Status Selector */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Publication Status <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${status === 'Published' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <input
                    type="radio"
                    name="paperStatus"
                    value="Published"
                    checked={status === 'Published'}
                    onChange={() => setStatus('Published')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Published (Live immediately on website)</span>
                </label>

                <label className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${status === 'Draft' ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <input
                    type="radio"
                    name="paperStatus"
                    value="Draft"
                    checked={status === 'Draft'}
                    onChange={() => setStatus('Draft')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Draft (Hidden from public website)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateTab('all-papers')}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || isUploading}
            className="inline-flex items-center space-x-2 px-7 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>UPLOAD QUESTION PAPER</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* PDF Preview Modal */}
      {previewModalOpen && (localPdfBlobUrl || uploadedFileData?.file_url) && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-800">
            <div className="px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className="font-bold text-sm">
                  PDF Preview: {uploadedFileData?.file_name || selectedFile?.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <PdfViewer
                url={localPdfBlobUrl || uploadedFileData?.file_url || ''}
                title={uploadedFileData?.file_name || selectedFile?.name || 'Uploaded PDF'}
                minHeight="100%"
                className="h-full rounded-none border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
