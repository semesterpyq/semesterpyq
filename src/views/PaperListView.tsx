import React from 'react';
import { ArrowLeft, FileText, Eye, Download } from 'lucide-react';
import { Course, Year, Subject, QuestionPaper } from '../types';

interface PaperListViewProps {
  course: Course;
  year: Year;
  examYear: number;
  subject: Subject;
  papers: QuestionPaper[];
  onSelectPaper: (paperId: string) => void;
  onBack: () => void;
}

export const PaperListView: React.FC<PaperListViewProps> = ({
  course,
  year,
  examYear,
  subject,
  papers,
  onSelectPaper,
  onBack,
}) => {
  const shortSubjectName = subject.name.includes(':') ? subject.name.split(':')[0].trim() : subject.name;
  const shortCourseName = course.code || course.name;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 sm:py-6 px-3 sm:px-6">
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

      {/* Header matching Panel 5 */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
          {shortSubjectName} - {examYear}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Select Question Paper
        </p>
      </div>

      {/* Clean Question Papers List */}
      {papers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          No question papers uploaded yet for {shortSubjectName} in {examYear}.
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <div
              key={paper.id}
              onClick={() => onSelectPaper(paper.id)}
              className="group bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer"
            >
              {/* Left: Red PDF Icon + Paper Titles */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                    {paper.exam_year} Paper
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {shortCourseName} {shortSubjectName} - {paper.exam_year}
                  </p>
                </div>
              </div>

              {/* Right: View Button */}
              <div className="flex items-center space-x-2">
                <a
                  href={`/api/papers/${paper.id}/download`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Direct Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => onSelectPaper(paper.id)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
