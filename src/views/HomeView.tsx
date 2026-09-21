import React from 'react';
import {
  GraduationCap,
  BookOpen,
  BarChart3,
  Laptop,
  Atom,
  ArrowRight,
} from 'lucide-react';
import { Course, SiteSettings } from '../types';
import { ColorfulBanner } from '../components/ColorfulBanner';
import { AdBanner } from '../components/AdBanner';

interface HomeViewProps {
  settings: SiteSettings;
  courses: Course[];
  onSelectCourse: (courseId: string) => void;
  onSelectPaper: (paperId: string) => void;
  onSelectSubject?: (courseId: string, yearId: string, subjectId: string) => void;
}

// Visual theme configurations for courses based on degree code/type
const getCourseTheme = (code: string, index: number) => {
  const normalized = code.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('bsc') || normalized.includes('science')) {
    return {
      cardBg: 'bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/40 hover:from-blue-100/90 hover:to-indigo-100/60 border-blue-100/90 hover:border-blue-300',
      iconBg: 'bg-blue-500 text-white',
      btnBg: 'bg-blue-600 group-hover:bg-blue-700 text-white',
      icon: <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7" />,
    };
  }
  if (normalized.includes('ba') || normalized.includes('art')) {
    return {
      cardBg: 'bg-gradient-to-br from-emerald-50/90 via-green-50/50 to-teal-50/40 hover:from-emerald-100/90 hover:to-teal-100/60 border-emerald-100/90 hover:border-emerald-300',
      iconBg: 'bg-emerald-500 text-white',
      btnBg: 'bg-teal-600 group-hover:bg-teal-700 text-white',
      icon: <BookOpen className="w-5 h-5 sm:w-7 sm:h-7" />,
    };
  }
  if (normalized.includes('bcom') || normalized.includes('com')) {
    return {
      cardBg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/40 hover:from-amber-100/90 hover:to-orange-100/60 border-amber-100/90 hover:border-amber-300',
      iconBg: 'bg-amber-500 text-white',
      btnBg: 'bg-orange-600 group-hover:bg-orange-700 text-white',
      icon: <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7" />,
    };
  }
  if (normalized.includes('bca') || normalized.includes('cs') || normalized.includes('comp')) {
    return {
      cardBg: 'bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-purple-50/40 hover:from-purple-100/90 hover:to-indigo-100/60 border-purple-100/90 hover:border-purple-300',
      iconBg: 'bg-purple-500 text-white',
      btnBg: 'bg-purple-600 group-hover:bg-purple-700 text-white',
      icon: <Laptop className="w-5 h-5 sm:w-7 sm:h-7" />,
    };
  }

  // Fallbacks
  const fallbacks = [
    {
      cardBg: 'bg-gradient-to-br from-blue-50/90 to-sky-50/50 border-blue-100/90',
      iconBg: 'bg-blue-500 text-white',
      btnBg: 'bg-blue-600 text-white',
      icon: <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7" />,
    },
    {
      cardBg: 'bg-gradient-to-br from-rose-50/90 to-pink-50/50 border-rose-100/90',
      iconBg: 'bg-rose-500 text-white',
      btnBg: 'bg-rose-600 text-white',
      icon: <Atom className="w-5 h-5 sm:w-7 sm:h-7" />,
    },
  ];
  return fallbacks[index % fallbacks.length];
};

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  courses,
  onSelectCourse,
  onSelectPaper,
  onSelectSubject,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6 px-3 sm:px-6">
      {/* 1. Colorful Academic Banner with Search */}
      <ColorfulBanner
        onSelectCourse={onSelectCourse}
        onSelectPaper={onSelectPaper}
        onSelectSubject={onSelectSubject}
      />

      {/* 2. Available Courses Section */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-serif">
            Available Courses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose your course to view available years.
          </p>
        </div>

        {/* Responsive Layout:
            - Mobile: exactly 3 course cards in one row (grid-cols-3)
            - Tablet: 3-4 cards per row
            - Desktop: exactly 4 cards per row (lg:grid-cols-4)
        */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {courses.map((course, idx) => {
            const theme = getCourseTheme(course.code || course.name, idx);
            const shortName = course.code || course.name;

            return (
              <button
                key={course.id ? `${course.id}-${idx}` : idx}
                onClick={() => onSelectCourse(course.id)}
                className={`group relative flex flex-col justify-between p-3 sm:p-5 rounded-xl sm:rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5 ${theme.cardBg}`}
              >
                {/* Colorful Icon Container */}
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0 mb-3 sm:mb-5`}>
                  {theme.icon}
                </div>

                {/* Short Course Name and Circular Arrow Button */}
                <div className="flex items-center justify-between w-full mt-auto">
                  <span className="font-bold text-sm sm:text-lg text-slate-900 tracking-tight font-serif truncate pr-1">
                    {shortName}
                  </span>

                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${theme.btnBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:translate-x-0.5 transition-transform`}>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Responsive Homepage Advertisement Banner (Directly Below Available Courses) */}
      <AdBanner
        slot="home"
        enabled={settings.ad_home_enabled !== false}
        adCode={settings.ad_home_code}
        target={settings.ad_home_target || 'all'}
      />
    </div>
  );
};
