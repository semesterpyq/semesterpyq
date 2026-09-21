import React from 'react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Course, Year } from '../types';

interface CourseViewProps {
  course: Course;
  years: Year[];
  onSelectYear: (yearId: string) => void;
  onBack: () => void;
}

export const CourseView: React.FC<CourseViewProps> = ({
  course,
  years,
  onSelectYear,
  onBack,
}) => {
  const shortName = course.code || course.name;
  const programTitle = course.description || `${course.name} Program`;

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

      {/* Course Info Card matching Panel 2 */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-sky-50/70 border border-blue-100/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4 sm:space-x-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
              {shortName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {programTitle}
            </p>
          </div>
        </div>

        {/* Book stack illustration on the right */}
        <div className="hidden sm:block shrink-0 pointer-events-none opacity-90">
          <svg className="w-24 h-20" viewBox="0 0 120 100" fill="none">
            <rect x="20" y="70" width="80" height="14" rx="2" fill="#0284c7" />
            <rect x="25" y="72" width="70" height="10" rx="1" fill="#f8fafc" />
            <rect x="25" y="52" width="70" height="14" rx="2" fill="#ea580c" />
            <rect x="30" y="54" width="60" height="10" rx="1" fill="#fff7ed" />
            <rect x="30" y="34" width="60" height="14" rx="2" fill="#2563eb" />
            <rect x="35" y="36" width="50" height="10" rx="1" fill="#eff6ff" />
          </svg>
        </div>
      </div>

      {/* Select Year Section */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
          Select Year
        </h2>

        {years.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            No academic years configured yet for this course.
          </div>
        ) : (
          /* Simple attractive square/rounded buttons */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {years.map((yr, idx) => (
              <button
                key={yr.id}
                onClick={() => onSelectYear(yr.id)}
                className={`p-4 sm:p-5 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 shadow-xs hover:shadow-md border cursor-pointer text-center ${
                  idx === 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/10'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-blue-400'
                }`}
              >
                {yr.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
