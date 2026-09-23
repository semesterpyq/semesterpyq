import React from 'react';
import { ArrowLeft, Calendar, GraduationCap, Building2 } from 'lucide-react';
import { Course, University, Year } from '../types';
import { UniversityLogo } from '../components/UniversityLogo';

interface YearViewProps {
  university: University | null;
  course: Course | null;
  years: Year[];
  onBack: () => void;
  onSelectYear: (yearId: string) => void;
}

export const YearView: React.FC<YearViewProps> = ({
  university,
  course,
  years,
  onBack,
  onSelectYear,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-5 py-4 sm:py-6 px-2.5 sm:px-6">
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

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 font-serif tracking-tight">
          Select Academic Year
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Select your year for {course?.name || 'course'}
        </p>
      </div>

      {/* Years Grid (3 cols mobile / 4 cols desktop matching design) */}
      {years.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Years Added Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            The Admin has not added any years for {course?.name} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {years.map((year) => (
            <button
              key={year.id}
              onClick={() => onSelectYear(year.id)}
              className="group relative flex flex-col items-center justify-center p-3.5 sm:p-5 md:p-6 bg-white hover:bg-blue-50/30 rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 text-center cursor-pointer hover:-translate-y-0.5"
            >
              {/* Circular light blue icon badge with graduation cap */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-blue-100/90 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-700" />
              </div>

              {/* Centered Year Name */}
              <h3 className="mt-2.5 sm:mt-3.5 font-bold text-xs sm:text-sm md:text-base text-slate-800 group-hover:text-blue-700 tracking-tight transition-colors line-clamp-1">
                {year.name}
              </h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
