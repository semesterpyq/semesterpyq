import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Building2 } from 'lucide-react';
import { Course, University } from '../types';

interface CourseViewProps {
  university: University | null;
  courses: Course[];
  onBack: () => void;
  onSelectCourse: (courseId: string) => void;
}

const COURSE_THEMES = [
  {
    cardBg: 'bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-slate-50 hover:from-indigo-100/90 hover:via-blue-100/50 hover:to-slate-100',
    cardBorder: 'border-indigo-200/90 hover:border-indigo-300',
    iconBg: 'bg-indigo-600 text-white shadow-xs',
    titleColor: 'text-indigo-950',
    arrowBg: 'bg-indigo-600 group-hover:bg-indigo-700 text-white',
    hoverShadow: 'hover:shadow-indigo-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 hover:from-emerald-100/90 hover:via-teal-100/50 hover:to-slate-100',
    cardBorder: 'border-emerald-200/90 hover:border-emerald-300',
    iconBg: 'bg-emerald-600 text-white shadow-xs',
    titleColor: 'text-emerald-950',
    arrowBg: 'bg-emerald-600 group-hover:bg-emerald-700 text-white',
    hoverShadow: 'hover:shadow-emerald-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-slate-50 hover:from-rose-100/90 hover:via-pink-100/50 hover:to-slate-100',
    cardBorder: 'border-rose-200/90 hover:border-rose-300',
    iconBg: 'bg-rose-600 text-white shadow-xs',
    titleColor: 'text-rose-950',
    arrowBg: 'bg-rose-600 group-hover:bg-rose-700 text-white',
    hoverShadow: 'hover:shadow-rose-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 hover:from-amber-100/90 hover:via-orange-100/50 hover:to-slate-100',
    cardBorder: 'border-amber-200/90 hover:border-amber-300',
    iconBg: 'bg-amber-600 text-white shadow-xs',
    titleColor: 'text-amber-950',
    arrowBg: 'bg-amber-600 group-hover:bg-amber-700 text-white',
    hoverShadow: 'hover:shadow-amber-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-purple-50/90 via-violet-50/40 to-slate-50 hover:from-purple-100/90 hover:via-violet-100/50 hover:to-slate-100',
    cardBorder: 'border-purple-200/90 hover:border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-xs',
    titleColor: 'text-purple-950',
    arrowBg: 'bg-purple-600 group-hover:bg-purple-700 text-white',
    hoverShadow: 'hover:shadow-purple-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-sky-50/90 via-cyan-50/40 to-slate-50 hover:from-sky-100/90 hover:via-cyan-100/50 hover:to-slate-100',
    cardBorder: 'border-sky-200/90 hover:border-sky-300',
    iconBg: 'bg-sky-600 text-white shadow-xs',
    titleColor: 'text-sky-950',
    arrowBg: 'bg-sky-600 group-hover:bg-sky-700 text-white',
    hoverShadow: 'hover:shadow-sky-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-slate-50 hover:from-teal-100/90 hover:via-emerald-100/50 hover:to-slate-100',
    cardBorder: 'border-teal-200/90 hover:border-teal-300',
    iconBg: 'bg-teal-600 text-white shadow-xs',
    titleColor: 'text-teal-950',
    arrowBg: 'bg-teal-600 group-hover:bg-teal-700 text-white',
    hoverShadow: 'hover:shadow-teal-500/15',
  },
  {
    cardBg: 'bg-gradient-to-br from-fuchsia-50/90 via-pink-50/40 to-slate-50 hover:from-fuchsia-100/90 hover:via-pink-100/50 hover:to-slate-100',
    cardBorder: 'border-fuchsia-200/90 hover:border-fuchsia-300',
    iconBg: 'bg-fuchsia-600 text-white shadow-xs',
    titleColor: 'text-fuchsia-950',
    arrowBg: 'bg-fuchsia-600 group-hover:bg-fuchsia-700 text-white',
    hoverShadow: 'hover:shadow-fuchsia-500/15',
  },
];

export const CourseView: React.FC<CourseViewProps> = ({
  university,
  courses,
  onBack,
  onSelectCourse,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-5 py-4 sm:py-6 px-2.5 sm:px-6">
      {/* Top Header with Back Button */}
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
          Select Course
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Available courses for {university?.name || 'selected university'}
        </p>
      </div>

      {/* Courses List Grid (Normal Small Size, Beautiful & Different Color Themes, Same Layout) */}
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Courses Added Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            The Admin has not added any courses for {university?.name} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {courses.map((course, idx) => {
            const rawCode = (course.code || course.name || 'COURSE').trim();
            // Ensure proper dot formatting e.g. B.A. or B.Sc. if short code
            const displayTitle =
              rawCode.length <= 6 && !rawCode.includes('.')
                ? rawCode.split('').join('.') + '.'
                : rawCode;

            const theme = COURSE_THEMES[idx % COURSE_THEMES.length];

            return (
              <button
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={`group relative flex flex-col justify-between p-2.5 sm:p-3.5 ${theme.cardBg} rounded-xl sm:rounded-2xl border ${theme.cardBorder} shadow-2xs hover:shadow-md ${theme.hoverShadow} transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5 min-h-[82px] sm:min-h-[92px] max-w-[210px] w-full`}
              >
                {/* Top-left rounded icon container */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0`}>
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>

                {/* Bottom row: Course title + Circular arrow button */}
                <div className="flex items-center justify-between gap-1.5 w-full mt-2 sm:mt-2.5">
                  <h3 className={`font-serif font-bold text-xs sm:text-sm ${theme.titleColor} tracking-tight line-clamp-1`}>
                    {displayTitle}
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
