import React from 'react';
import { ArrowLeft, CalendarDays, FileText, ArrowRight, Building2 } from 'lucide-react';
import { Course, Semester, University, Year } from '../types';

interface PaperYearViewProps {
  university: University | null;
  course: Course | null;
  year: Year | null;
  semester: Semester | null;
  paperYears: number[];
  onBack: () => void;
  onSelectPaperYear: (paperYear: number) => void;
}

const PAPER_YEAR_THEMES = [
  {
    cardBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white hover:from-emerald-100/90 hover:via-teal-100/40 hover:to-white',
    cardBorder: 'border-emerald-200/90 hover:border-emerald-300',
    iconBg: 'bg-emerald-600 text-white shadow-xs',
    titleColor: 'text-emerald-950',
    arrowBg: 'bg-emerald-600 group-hover:bg-emerald-700 text-white',
    hoverShadow: 'hover:shadow-emerald-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/30 to-white hover:from-blue-100/90 hover:via-indigo-100/40 hover:to-white',
    cardBorder: 'border-blue-200/90 hover:border-blue-300',
    iconBg: 'bg-blue-600 text-white shadow-xs',
    titleColor: 'text-blue-950',
    arrowBg: 'bg-blue-600 group-hover:bg-blue-700 text-white',
    hoverShadow: 'hover:shadow-blue-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-purple-50/90 via-violet-50/30 to-white hover:from-purple-100/90 hover:via-violet-100/40 hover:to-white',
    cardBorder: 'border-purple-200/90 hover:border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-xs',
    titleColor: 'text-purple-950',
    arrowBg: 'bg-purple-600 group-hover:bg-purple-700 text-white',
    hoverShadow: 'hover:shadow-purple-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white hover:from-amber-100/90 hover:via-orange-100/40 hover:to-white',
    cardBorder: 'border-amber-200/90 hover:border-amber-300',
    iconBg: 'bg-amber-600 text-white shadow-xs',
    titleColor: 'text-amber-950',
    arrowBg: 'bg-amber-600 group-hover:bg-amber-700 text-white',
    hoverShadow: 'hover:shadow-amber-500/15',
  },
];

export const PaperYearView: React.FC<PaperYearViewProps> = ({
  university,
  course,
  year,
  semester,
  paperYears,
  onBack,
  onSelectPaperYear,
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
              {university.logo_url ? (
                <img
                  src={university.logo_url}
                  alt={university.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              )}
            </div>
            <span className="truncate font-medium text-slate-800">{university.name}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 font-serif tracking-tight">
          Select Examination Paper Year
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Showing years with uploaded question papers for {semester?.name || 'this semester'}
        </p>
      </div>

      {/* Paper Years List (3 cols mobile / 4 cols desktop) */}
      {paperYears.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Question Papers Uploaded Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The Admin has not uploaded any question papers for {semester?.name} yet. As soon as papers are uploaded in the Admin panel, the paper years will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          {paperYears.map((pYear, idx) => {
            const theme = PAPER_YEAR_THEMES[idx % PAPER_YEAR_THEMES.length];
            return (
              <button
                key={pYear}
                onClick={() => onSelectPaperYear(pYear)}
                className={`group relative flex flex-col justify-between p-2.5 sm:p-3.5 ${theme.cardBg} rounded-xl sm:rounded-2xl border ${theme.cardBorder} shadow-2xs hover:shadow-md ${theme.hoverShadow} transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5 min-h-[82px] sm:min-h-[94px]`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0`}>
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>

                <div className="flex items-center justify-between gap-1.5 w-full mt-2 sm:mt-2.5">
                  <h3 className={`font-serif font-bold text-xs sm:text-sm ${theme.titleColor} tracking-tight line-clamp-1`}>
                    {pYear}
                  </h3>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${theme.arrowBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-all`}>
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
