import React, { useState } from 'react';
import { ArrowLeft, Download, Eye, FileText, CheckCircle, Loader2, Building2 } from 'lucide-react';
import { Course, QuestionPaper, Semester, Subject, University, Year } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { downloadPaperPdf } from '../utils/pdfViewer';
import { UniversityLogo } from '../components/UniversityLogo';

interface PaperListViewProps {
  university: University | null;
  course: Course | null;
  year: Year | null;
  semester: Semester | null;
  paperYear: number | null;
  subject: Subject | null;
  papers: QuestionPaper[];
  onBack: () => void;
}

const PAPER_THEMES = [
  {
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    cardBorder: 'hover:border-indigo-300',
    viewBtn: 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300',
    downloadBtn: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/20',
  },
  {
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    cardBorder: 'hover:border-emerald-300',
    viewBtn: 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300',
    downloadBtn: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:via-teal-700 hover:to-teal-800 text-white shadow-emerald-500/20',
  },
  {
    tagBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    cardBorder: 'hover:border-purple-300',
    viewBtn: 'bg-purple-50/90 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300',
    downloadBtn: 'bg-gradient-to-r from-purple-600 via-violet-600 to-violet-700 hover:from-purple-700 hover:via-violet-700 hover:to-violet-800 text-white shadow-purple-500/20',
  },
  {
    tagBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    cardBorder: 'hover:border-amber-300',
    viewBtn: 'bg-amber-50/90 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300',
    downloadBtn: 'bg-gradient-to-r from-amber-600 via-orange-600 to-orange-700 hover:from-amber-700 hover:via-orange-700 hover:to-orange-800 text-white shadow-amber-500/20',
  },
  {
    tagBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    cardBorder: 'hover:border-rose-300',
    viewBtn: 'bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300',
    downloadBtn: 'bg-gradient-to-r from-rose-600 via-pink-600 to-pink-700 hover:from-rose-700 hover:via-pink-700 hover:to-pink-800 text-white shadow-rose-500/20',
  },
];

export const PaperListView: React.FC<PaperListViewProps> = ({
  university,
  course,
  year,
  semester,
  paperYear,
  subject,
  papers,
  onBack,
}) => {
  const [selectedPdf, setSelectedPdf] = useState<QuestionPaper | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (paper: QuestionPaper) => {
    setDownloadingId(paper.id);
    try {
      await downloadPaperPdf(paper);
    } finally {
      setTimeout(() => setDownloadingId(null), 800);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 py-4 sm:py-6 px-3 sm:px-6">
      {/* Top Header with Back Button and Circular University Logo + Name */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Back to Subjects</span>
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

      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
              <span>{subject?.code || 'SUBJECT'}</span>
              <span>•</span>
              <span>Year {paperYear || 'All'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              {subject?.name || 'Question Papers'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Official past examination papers available for online reading or PDF download.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {papers.length} {papers.length === 1 ? 'Paper Available' : 'Papers Available'}
          </span>
        </div>
      </div>

      {/* Papers List */}
      {papers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Papers Uploaded for this Subject</h3>
          <p className="text-xs text-slate-500 mt-1">
            Question papers uploaded by Admin will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map((paper, idx) => {
            const theme = PAPER_THEMES[idx % PAPER_THEMES.length];
            return (
              <div
                key={paper.id}
                className={`bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md ${theme.cardBorder} transition-all duration-200 flex flex-col justify-between gap-3.5`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] sm:text-xs font-bold ${theme.tagBg} border px-2.5 py-0.5 rounded-full shadow-2xs`}>
                      Year {paper.paper_year || paper.exam_year || 2024}
                    </span>
                    {paper.paper_code && (
                      <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Code: {paper.paper_code}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 font-serif leading-snug">
                    {paper.title}
                  </h3>

                  <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-slate-500 pt-0.5">
                    {paper.total_marks && (
                      <span>Max Marks: <strong className="text-slate-700">{paper.total_marks}</strong></span>
                    )}
                    {paper.total_marks && paper.duration && <span>•</span>}
                    {paper.duration && (
                      <span>Time: <strong className="text-slate-700">{paper.duration}</strong></span>
                    )}
                  </div>
                </div>

                {/* Small & Unique Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedPdf(paper)}
                    className={`group/btn inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full ${theme.viewBtn} font-semibold text-xs transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                    <span>View Paper</span>
                  </button>

                  <button
                    onClick={() => handleDownload(paper)}
                    disabled={downloadingId === paper.id}
                    className={`group/btn inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full ${theme.downloadBtn} font-semibold text-xs transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer disabled:opacity-75`}
                  >
                    {downloadingId === paper.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Download className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/btn:-translate-y-0.5" />
                    )}
                    <span>{downloadingId === paper.id ? 'Downloading...' : 'Download PDF'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Modal */}
      {selectedPdf && (
        <PdfViewerModal
          paper={selectedPdf}
          onClose={() => setSelectedPdf(null)}
        />
      )}
    </div>
  );
};
