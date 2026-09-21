import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { QuestionPaper, SiteSettings } from '../types';
import { AdBanner } from '../components/AdBanner';
import { PdfViewer } from '../components/PdfViewer';

interface PaperDetailViewProps {
  paper: QuestionPaper;
  settings?: SiteSettings;
  onBack: () => void;
}

export const PaperDetailView: React.FC<PaperDetailViewProps> = ({
  paper,
  settings,
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

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-4 sm:py-6 px-3 sm:px-6">
      {/* Back Button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
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
        <a
          href={downloadUrl}
          download={downloadFilename}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Direct Download PDF ({paper.file_size || 'Original'})</span>
        </a>
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
