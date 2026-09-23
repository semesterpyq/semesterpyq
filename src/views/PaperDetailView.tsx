import React, { useState } from 'react';
import { ArrowLeft, Download, Loader2, Building2 } from 'lucide-react';
import { QuestionPaper, SiteSettings, University } from '../types';
import { AdBanner } from '../components/AdBanner';
import { PdfViewer } from '../components/PdfViewer';
import { downloadPaperPdf } from '../utils/pdfViewer';
import { UniversityLogo } from '../components/UniversityLogo';

interface PaperDetailViewProps {
  paper: QuestionPaper;
  settings?: SiteSettings;
  university?: University | null;
  onBack: () => void;
}

export const PaperDetailView: React.FC<PaperDetailViewProps> = ({
  paper,
  settings,
  university,
  onBack,
}) => {
  const shortCourseName = paper.course_code || 'Degree';
  const shortSubjectName = paper.subject_name?.includes(':')
    ? paper.subject_name.split(':')[0].trim()
    : (paper.subject_name || paper.title);

  // Ad placement logic
  const paperAdPlacement = settings?.ad_paper_placement || 'above_viewer';
  const showTopAd = settings?.ad_paper_enabled !== false && (paperAdPlacement === 'above_viewer' || paperAdPlacement === 'both');
  const showBottomAd = settings?.ad_paper_enabled !== false && (paperAdPlacement === 'below_viewer' || paperAdPlacement === 'both');

  const fileUrl = paper.file_url || `/api/papers/${paper.id}/file`;
  const downloadUrl = `/api/papers/${paper.id}/download`;
  const downloadFilename = paper.file_name || `${paper.title.replace(/\s+/g, '_')}.pdf`;

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDownloading(true);
    try {
      await downloadPaperPdf(paper);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-4 sm:py-6 px-3 sm:px-6">
      {/* Top Header with Back Button and Circular University Logo + Name */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Back</span>
        </button>

        {university && (
          <div className="flex items-center gap-2 pl-1.5 pr-3 py-1 sm:pl-2 sm:pr-3.5 sm:py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-800 text-xs font-semibold max-w-[240px] sm:max-w-none truncate">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
              <UniversityLogo
                logoUrl={university.logo_url}
                name={university.name}
                code={university.code}
                className="w-full h-full object-contain rounded-full"
                iconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600"
              />
            </div>
            <span className="truncate font-medium text-slate-800">{university.name}</span>
          </div>
        )}
      </div>

      {/* Header matching Panel 6 */}
      <div className="space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
          {shortCourseName} {shortSubjectName} - {paper.exam_year}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Question Paper • {paper.duration || '3 Hours'} • {paper.total_marks || 75} Marks
        </p>
      </div>

      {/* 1. Responsive Ad Area Above PDF Viewer with Enough Spacing */}
      {showTopAd && (
        <div className="pt-1 pb-2">
          <AdBanner
            slot="paper-top"
            enabled={true}
            adCode={settings?.ad_paper_code}
            target={settings?.ad_paper_target || 'all'}
          />
        </div>
      )}

      {/* High-Fidelity Canvas PDF Viewer (Renders 100% reliably in iframes and mobile webviews) */}
      <div className="w-full">
        <PdfViewer
          url={fileUrl}
          title={`${shortCourseName} ${shortSubjectName} (${paper.exam_year})`}
          paperDetails={{
            collegeName: settings?.site_name || 'SEMESTER (PYQs)',
            courseName: paper.course_name || shortCourseName,
            courseCode: paper.course_code || shortCourseName,
            yearName: paper.year_name || 'Academic Year',
            subjectName: paper.subject_name || shortSubjectName,
            subjectCode: paper.subject_code || paper.paper_code,
            paperTitle: paper.title,
            examYear: paper.exam_year,
            examSession: paper.exam_session,
            paperCode: paper.paper_code,
            totalMarks: paper.total_marks,
            duration: paper.duration,
          }}
          downloadUrl={downloadUrl}
          downloadFilename={downloadFilename}
          minHeight="580px"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>
            {downloading
              ? 'Downloading...'
              : `Direct Download PDF (${paper.file_size || 'Original'})`}
          </span>
        </button>
      </div>

      {/* 2. Optional Responsive Ad Area Below PDF Viewer */}
      {showBottomAd && (
        <div className="pt-4">
          <AdBanner
            slot="paper-bottom"
            enabled={true}
            adCode={settings?.ad_paper_code}
            target={settings?.ad_paper_target || 'all'}
          />
        </div>
      )}
    </div>
  );
};
