import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Course, Year } from '../types';

interface YearViewProps {
  course: Course;
  year: Year;
  examYears: number[];
  onSelectExamYear: (examYear: number) => void;
  onBack: () => void;
}

export const YearView: React.FC<YearViewProps> = ({
  course,
  year,
  examYears,
  onSelectExamYear,
  onBack,
}) => {
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

      {/* Header matching Panel 3 */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
          {shortCourseName} - {year.name}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Select Year
        </p>
      </div>

      {/* Examination Years Grid */}
      {examYears.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          No question papers uploaded yet for this year.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {examYears.map((examYear, idx) => (
            <button
              key={examYear}
              onClick={() => onSelectExamYear(examYear)}
              className={`py-3.5 sm:py-5 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 shadow-xs hover:shadow-md border cursor-pointer text-center ${
                idx === 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/10'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-blue-400'
              }`}
            >
              {examYear}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
