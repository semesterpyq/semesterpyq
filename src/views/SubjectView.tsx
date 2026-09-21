import React from 'react';
import {
  ArrowLeft,
  Atom,
  FlaskConical,
  Leaf,
  BookOpen,
  Laptop,
  Flower2,
  BarChart3,
  ChevronRight,
  BookMarked,
} from 'lucide-react';
import { Course, Year, Subject } from '../types';

interface SubjectViewProps {
  course: Course;
  year: Year;
  examYear: number;
  subjects: Subject[];
  onSelectSubject: (subjectId: string) => void;
  onBack: () => void;
}

// Icon and color mapping matching the reference mockup Panel 4
const getSubjectTheme = (name: string, code?: string) => {
  const text = `${name} ${code || ''}`.toLowerCase();

  if (text.includes('math') || text.includes('sigma') || text.includes('calculus') || text.includes('algebra')) {
    return {
      bg: 'bg-rose-500 text-white',
      cardBg: 'bg-white hover:bg-rose-50/40 border-slate-200/90 hover:border-rose-200',
      icon: <span className="font-bold text-base sm:text-lg">Σ</span>,
      shortName: 'Mathematics',
    };
  }
  if (text.includes('phys') || text.includes('mechanic') || text.includes('wave')) {
    return {
      bg: 'bg-blue-600 text-white',
      cardBg: 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-200',
      icon: <Atom className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Physics',
    };
  }
  if (text.includes('chem') || text.includes('organic') || text.includes('inorganic')) {
    return {
      bg: 'bg-emerald-500 text-white',
      cardBg: 'bg-white hover:bg-emerald-50/40 border-slate-200/90 hover:border-emerald-200',
      icon: <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Chemistry',
    };
  }
  if (text.includes('bio') || text.includes('botany') || text.includes('zoology')) {
    return {
      bg: 'bg-purple-600 text-white',
      cardBg: 'bg-white hover:bg-purple-50/40 border-slate-200/90 hover:border-purple-200',
      icon: <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Biology',
    };
  }
  if (text.includes('eng') || text.includes('literature') || text.includes('communication')) {
    return {
      bg: 'bg-amber-500 text-white',
      cardBg: 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-200',
      icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'English',
    };
  }
  if (text.includes('comp') || text.includes('cs') || text.includes('prog') || text.includes('digital') || text.includes('dbms')) {
    return {
      bg: 'bg-cyan-500 text-white',
      cardBg: 'bg-white hover:bg-cyan-50/40 border-slate-200/90 hover:border-cyan-200',
      icon: <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Computer Science',
    };
  }
  if (text.includes('env') || text.includes('eco') || text.includes('ecology')) {
    return {
      bg: 'bg-pink-500 text-white',
      cardBg: 'bg-white hover:bg-pink-50/40 border-slate-200/90 hover:border-pink-200',
      icon: <Flower2 className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Environmental Science',
    };
  }
  if (text.includes('stat') || text.includes('prob') || text.includes('data')) {
    return {
      bg: 'bg-indigo-600 text-white',
      cardBg: 'bg-white hover:bg-indigo-50/40 border-slate-200/90 hover:border-indigo-200',
      icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />,
      shortName: 'Statistics',
    };
  }

  // Default fallback
  return {
    bg: 'bg-blue-500 text-white',
    cardBg: 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-200',
    icon: <BookMarked className="w-5 h-5 sm:w-6 sm:h-6" />,
    shortName: name.split(':')[0].trim(),
  };
};

export const SubjectView: React.FC<SubjectViewProps> = ({
  course,
  year,
  examYear,
  subjects,
  onSelectSubject,
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

      {/* Header matching Panel 4 */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
          {shortCourseName} - {year.name} - {examYear}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Select Subject
        </p>
      </div>

      {/* Subjects Grid (Desktop/Tablet: square cards, Mobile: clean adaptive rows/grid matching mockup) */}
      {subjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
          No subjects found for this program and year.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {subjects.map((sub) => {
            const theme = getSubjectTheme(sub.name, sub.code);
            const displayName = sub.name.includes(':') ? sub.name.split(':')[0].trim() : (theme.shortName || sub.name);

            return (
              <button
                key={sub.id}
                onClick={() => onSelectSubject(sub.id)}
                className={`group flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer text-center hover:-translate-y-0.5 ${theme.cardBg}`}
              >
                {/* Small colorful subject icon */}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform mb-3`}>
                  {theme.icon}
                </div>

                {/* Short subject name only - No long description */}
                <span className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight font-serif line-clamp-2">
                  {displayName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
