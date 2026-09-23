import React from 'react';
import { ArrowLeft, Layers, ArrowRight, Building2 } from 'lucide-react';
import { Course, Semester, University, Year } from '../types';
import { UniversityLogo } from '../components/UniversityLogo';

interface SemesterViewProps {
  university: University | null;
  course: Course | null;
  year: Year | null;
  semesters: Semester[];
  onBack: () => void;
  onSelectSemester: (semesterId: string) => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const SEMESTER_THEMES = [
  {
    cardBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white hover:from-emerald-100/90 hover:via-teal-100/40 hover:to-white',
    cardBorder: 'border-emerald-200/90 hover:border-emerald-300',
    badgeBg: 'bg-emerald-600 text-white shadow-xs',
    pillBg: 'bg-emerald-100/80 text-emerald-800',
    titleColor: 'text-emerald-950',
    arrowBg: 'bg-emerald-600 group-hover:bg-emerald-700 text-white',
    hoverShadow: 'hover:shadow-emerald-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/30 to-white hover:from-blue-100/90 hover:via-indigo-100/40 hover:to-white',
    cardBorder: 'border-blue-200/90 hover:border-blue-300',
    badgeBg: 'bg-blue-600 text-white shadow-xs',
    pillBg: 'bg-blue-100/80 text-blue-800',
    titleColor: 'text-blue-950',
    arrowBg: 'bg-blue-600 group-hover:bg-blue-700 text-white',
    hoverShadow: 'hover:shadow-blue-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-purple-50/90 via-violet-50/30 to-white hover:from-purple-100/90 hover:via-violet-100/40 hover:to-white',
    cardBorder: 'border-purple-200/90 hover:border-purple-300',
    badgeBg: 'bg-purple-600 text-white shadow-xs',
    pillBg: 'bg-purple-100/80 text-purple-800',
    titleColor: 'text-purple-950',
    arrowBg: 'bg-purple-600 group-hover:bg-purple-700 text-white',
    hoverShadow: 'hover:shadow-purple-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white hover:from-amber-100/90 hover:via-orange-100/40 hover:to-white',
    cardBorder: 'border-amber-200/90 hover:border-amber-300',
    badgeBg: 'bg-amber-600 text-white shadow-xs',
    pillBg: 'bg-amber-100/80 text-amber-800',
    titleColor: 'text-amber-950',
    arrowBg: 'bg-amber-600 group-hover:bg-amber-700 text-white',
    hoverShadow: 'hover:shadow-amber-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-rose-50/90 via-pink-50/30 to-white hover:from-rose-100/90 hover:via-pink-100/40 hover:to-white',
    cardBorder: 'border-rose-200/90 hover:border-rose-300',
    badgeBg: 'bg-rose-600 text-white shadow-xs',
    pillBg: 'bg-rose-100/80 text-rose-800',
    titleColor: 'text-rose-950',
    arrowBg: 'bg-rose-600 group-hover:bg-rose-700 text-white',
    hoverShadow: 'hover:shadow-rose-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-sky-50/90 via-cyan-50/30 to-white hover:from-sky-100/90 hover:via-cyan-100/40 hover:to-white',
    cardBorder: 'border-sky-200/90 hover:border-sky-300',
    badgeBg: 'bg-sky-600 text-white shadow-xs',
    pillBg: 'bg-sky-100/80 text-sky-800',
    titleColor: 'text-sky-950',
    arrowBg: 'bg-sky-600 group-hover:bg-sky-700 text-white',
    hoverShadow: 'hover:shadow-sky-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-fuchsia-50/90 via-pink-50/30 to-white hover:from-fuchsia-100/90 hover:via-pink-100/40 hover:to-white',
    cardBorder: 'border-fuchsia-200/90 hover:border-fuchsia-300',
    badgeBg: 'bg-fuchsia-600 text-white shadow-xs',
    pillBg: 'bg-fuchsia-100/80 text-fuchsia-800',
    titleColor: 'text-fuchsia-950',
    arrowBg: 'bg-fuchsia-600 group-hover:bg-fuchsia-700 text-white',
    hoverShadow: 'hover:shadow-fuchsia-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-teal-50/90 via-emerald-50/30 to-white hover:from-teal-100/90 hover:via-emerald-100/40 hover:to-white',
    cardBorder: 'border-teal-200/90 hover:border-teal-300',
    badgeBg: 'bg-teal-600 text-white shadow-xs',
    pillBg: 'bg-teal-100/80 text-teal-800',
    titleColor: 'text-teal-950',
    arrowBg: 'bg-teal-600 group-hover:bg-teal-700 text-white',
    hoverShadow: 'hover:shadow-teal-500/15',
  },
];

export const SemesterView: React.FC<SemesterViewProps> = ({
  university,
  course,
  year,
  semesters,
  onBack,
  onSelectSemester,
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
          Select Semester
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Select your semester for {year?.name || 'selected year'}
        </p>
      </div>

      {/* Semesters Grid with Unique, Distinct Theme for Each Button */}
      {semesters.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Semesters Added Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            The Admin has not added any semesters for {year?.name} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          {semesters.map((sem, idx) => {
            const theme = SEMESTER_THEMES[idx % SEMESTER_THEMES.length];
            const roman =
              sem.semester_number && sem.semester_number <= 10
                ? ROMAN_NUMERALS[sem.semester_number - 1]
                : `${sem.semester_number || idx + 1}`;

            return (
              <button
                key={sem.id}
                onClick={() => onSelectSemester(sem.id)}
                className={`group relative flex flex-col justify-between p-3 sm:p-4 ${theme.cardBg} rounded-2xl border ${theme.cardBorder} shadow-2xs hover:shadow-md ${theme.hoverShadow} transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5 min-h-[96px] sm:min-h-[110px]`}
              >
                {/* Top row: Unique Roman / Number badge + Layers tag */}
                <div className="flex items-center justify-between w-full">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${theme.badgeBg} flex items-center justify-center font-serif font-black text-xs sm:text-sm tracking-wider shrink-0`}>
                    {roman}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${theme.pillBg} flex items-center gap-1`}>
                    <Layers className="w-2.5 h-2.5" />
                    <span>SEM {sem.semester_number || idx + 1}</span>
                  </span>
                </div>

                {/* Bottom row: Semester title + Coordinated Arrow */}
                <div className="flex items-center justify-between gap-1.5 w-full mt-3">
                  <h3 className={`font-serif font-bold text-xs sm:text-sm md:text-base ${theme.titleColor} tracking-tight line-clamp-1`}>
                    {sem.name}
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
