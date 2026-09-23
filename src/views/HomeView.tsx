import React from 'react';
import { Building2, BookOpen, ArrowRight } from 'lucide-react';
import { University, SiteSettings } from '../types';
import { ColorfulBanner } from '../components/ColorfulBanner';

interface HomeViewProps {
  settings: SiteSettings;
  universities: University[];
  onSelectUniversity: (universityId: string) => void;
  onSelectCourse?: (courseId: string, universityId?: string) => void;
  onSelectSubject?: (subjectId: string, courseId?: string, universityId?: string) => void;
  onSelectPaper?: (paper: any) => void;
  onOpenSearch?: () => void;
}

const UNIVERSITY_THEMES = [
  // 0: Blue / Cyan (LU)
  {
    gradient: 'conic-gradient(from 0deg, #3b82f6, #06b6d4, #6366f1, #3b82f6)',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    borderHover: 'hover:border-blue-300',
    textHover: 'group-hover:text-blue-600',
    arrowBg: 'bg-blue-600 group-hover:bg-blue-700',
    iconColor: 'text-blue-600',
  },
  // 1: Emerald / Mint (MPU)
  {
    gradient: 'conic-gradient(from 0deg, #10b981, #14b8a6, #22c55e, #10b981)',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    borderHover: 'hover:border-emerald-300',
    textHover: 'group-hover:text-emerald-600',
    arrowBg: 'bg-emerald-600 group-hover:bg-emerald-700',
    iconColor: 'text-emerald-600',
  },
  // 2: Purple / Pink (DU)
  {
    gradient: 'conic-gradient(from 0deg, #a855f7, #ec4899, #8b5cf6, #a855f7)',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    borderHover: 'hover:border-purple-300',
    textHover: 'group-hover:text-purple-600',
    arrowBg: 'bg-purple-600 group-hover:bg-purple-700',
    iconColor: 'text-purple-600',
  },
  // 3: Orange / Gold (KU)
  {
    gradient: 'conic-gradient(from 0deg, #f97316, #eab308, #ef4444, #f97316)',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    borderHover: 'hover:border-orange-300',
    textHover: 'group-hover:text-orange-600',
    arrowBg: 'bg-orange-600 group-hover:bg-orange-700',
    iconColor: 'text-orange-600',
  },
  // 4: Rose / Magenta
  {
    gradient: 'conic-gradient(from 0deg, #ec4899, #f43f5e, #a855f7, #ec4899)',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    borderHover: 'hover:border-pink-300',
    textHover: 'group-hover:text-pink-600',
    arrowBg: 'bg-pink-600 group-hover:bg-pink-700',
    iconColor: 'text-pink-600',
  },
  // 5: Cyan / Sky
  {
    gradient: 'conic-gradient(from 0deg, #06b6d4, #38bdf8, #0284c7, #06b6d4)',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    borderHover: 'hover:border-cyan-300',
    textHover: 'group-hover:text-cyan-600',
    arrowBg: 'bg-cyan-600 group-hover:bg-cyan-700',
    iconColor: 'text-cyan-600',
  },
  // 6: Amber / Yellow
  {
    gradient: 'conic-gradient(from 0deg, #f59e0b, #fbbf24, #d97706, #f59e0b)',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    borderHover: 'hover:border-amber-300',
    textHover: 'group-hover:text-amber-600',
    arrowBg: 'bg-amber-600 group-hover:bg-amber-700',
    iconColor: 'text-amber-600',
  },
  // 7: Crimson / Red
  {
    gradient: 'conic-gradient(from 0deg, #ef4444, #f43f5e, #b91c1c, #ef4444)',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    borderHover: 'hover:border-red-300',
    textHover: 'group-hover:text-red-600',
    arrowBg: 'bg-red-600 group-hover:bg-red-700',
    iconColor: 'text-red-600',
  },
  // 8: Indigo / Violet
  {
    gradient: 'conic-gradient(from 0deg, #6366f1, #818cf8, #4f46e5, #6366f1)',
    glowColor: 'rgba(99, 102, 241, 0.45)',
    borderHover: 'hover:border-indigo-300',
    textHover: 'group-hover:text-indigo-600',
    arrowBg: 'bg-indigo-600 group-hover:bg-indigo-700',
    iconColor: 'text-indigo-600',
  },
  // 9: Lime / Chartreuse
  {
    gradient: 'conic-gradient(from 0deg, #84cc16, #a3e635, #65a30d, #84cc16)',
    glowColor: 'rgba(132, 204, 22, 0.45)',
    borderHover: 'hover:border-lime-300',
    textHover: 'group-hover:text-lime-600',
    arrowBg: 'bg-lime-600 group-hover:bg-lime-700',
    iconColor: 'text-lime-600',
  },
  // 10: Teal / Jade
  {
    gradient: 'conic-gradient(from 0deg, #14b8a6, #2dd4bf, #0f766e, #14b8a6)',
    glowColor: 'rgba(20, 184, 166, 0.45)',
    borderHover: 'hover:border-teal-300',
    textHover: 'group-hover:text-teal-600',
    arrowBg: 'bg-teal-600 group-hover:bg-teal-700',
    iconColor: 'text-teal-600',
  },
  // 11: Deep Violet / Fuchsia
  {
    gradient: 'conic-gradient(from 0deg, #d946ef, #c084fc, #a21caf, #d946ef)',
    glowColor: 'rgba(217, 70, 239, 0.45)',
    borderHover: 'hover:border-fuchsia-300',
    textHover: 'group-hover:text-fuchsia-600',
    arrowBg: 'bg-fuchsia-600 group-hover:bg-fuchsia-700',
    iconColor: 'text-fuchsia-600',
  },
];

const getThemeForUniv = (univId: string, code: string, index: number) => {
  const c = code.toUpperCase();
  if (c.includes('LU')) return UNIVERSITY_THEMES[0];
  if (c.includes('MPU') || c.includes('MP')) return UNIVERSITY_THEMES[1];
  if (c.includes('DU')) return UNIVERSITY_THEMES[2];
  if (c.includes('KU')) return UNIVERSITY_THEMES[3];

  // Hash univId + code + index so every newly added university automatically gets a unique theme
  let hash = 0;
  const key = `${univId}_${code}_${index}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const themeIndex = Math.abs(hash) % UNIVERSITY_THEMES.length;
  return UNIVERSITY_THEMES[themeIndex];
};

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  universities,
  onSelectUniversity,
  onSelectCourse,
  onSelectSubject,
  onSelectPaper,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 sm:py-6 px-2.5 sm:px-6">
      {/* 1. Search Banner */}
      <ColorfulBanner
        onSelectUniversity={onSelectUniversity}
        onSelectCourse={(courseId, univId) => {
          if (onSelectCourse) onSelectCourse(courseId, univId);
        }}
        onSelectSubject={(subjectId, courseId, univId) => {
          if (onSelectSubject) onSelectSubject(subjectId, courseId, univId);
        }}
        onSelectPaper={(paper) => {
          if (onSelectPaper) onSelectPaper(paper);
        }}
      />

      {/* 2. Universities Section */}
      <div className="space-y-3">
        <div className="inline-block">
          <h2 className="text-base sm:text-lg font-bold tracking-wider font-sans uppercase bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-emerald-500 bg-clip-text text-transparent animate-hue-shift">
            UNIVERSITIES
          </h2>
          {/* Colorful 3-Part Line Effect that Enters from Left and Exits to Right */}
          <div className="flex items-center gap-1.5 w-full mt-1">
            <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-sweep-1 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 animate-sweep-2 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
            <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-500 animate-sweep-3 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          </div>
        </div>

        {universities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Universities Added Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Universities added by the Admin will appear here automatically.
            </p>
          </div>
        ) : (
          /* Mobile: 3 columns (grid-cols-3), Desktop: 4 columns (md:grid-cols-4) */
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
            {universities.map((univ, index) => {
              const shortName = (
                univ.code ||
                (univ.name
                  ? univ.name
                      .split(/\s+/)
                      .filter((w) => !['of', 'and', 'in', 'the', '&'].includes(w.toLowerCase()))
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                  : 'UNIV')
              ).trim();

              const theme = getThemeForUniv(univ.id, shortName, index);

              return (
                <button
                  key={univ.id}
                  onClick={() => onSelectUniversity(univ.id)}
                  className={`group relative flex flex-col items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-white via-slate-50/30 to-white hover:from-white hover:to-indigo-50/20 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl ${theme.borderHover} transition-all duration-300 text-center cursor-pointer hover:-translate-y-1 min-h-[120px] sm:min-h-[135px] overflow-hidden`}
                >
                  {/* Subtle Background Glow Accent on Hover */}
                  <div
                    className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 pointer-events-none"
                    style={{ background: theme.glowColor }}
                  />

                  {/* Outer Animated Ring Container - Border & Corners Effect Only */}
                  <div className="relative flex items-center justify-center p-[3px] rounded-full my-auto">
                    {/* Outer Glowing Neon Aura (Corners/Outside only) */}
                    <div
                      className="absolute -inset-1 rounded-full opacity-75 group-hover:opacity-100 blur-[5px] transition-all duration-300 animate-spin group-hover:[animation-duration:1.5s] animate-hue-shift"
                      style={{
                        background: theme.gradient,
                        animationDuration: '3.5s',
                      }}
                    />

                    {/* Clockwise Outer Gradient Ring (Outside/Border only) */}
                    <div
                      className="absolute inset-0 rounded-full animate-spin group-hover:[animation-duration:1.5s] transition-all duration-300 animate-hue-shift"
                      style={{
                        background: theme.gradient,
                        animationDuration: '3.5s',
                      }}
                    />

                    {/* Counter-Clockwise Inner Accent Ring (Outside/Border only) */}
                    <div
                      className="absolute inset-[1px] rounded-full animate-spin [animation-direction:reverse] opacity-80 group-hover:opacity-100 transition-all duration-300 animate-hue-shift"
                      style={{
                        background: theme.gradient,
                        animationDuration: '2.8s',
                      }}
                    />

                    {/* Static Clean Inner Circular Logo Container (No color shift/animation in center, 100% original logo) */}
                    <div className="relative z-10 w-13 h-13 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs border border-slate-100">
                      {univ.logo_url ? (
                        <img
                          src={univ.logo_url}
                          alt={shortName}
                          className="w-full h-full object-contain rounded-full scale-100 group-hover:scale-105 transition-transform duration-300"
                          style={{ filter: 'none' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Building2 className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.iconColor} shrink-0 group-hover:scale-105 transition-transform duration-300`} />
                      )}
                    </div>
                  </div>

                  {/* Short Form Name + Matching Color Button */}
                  <div className="flex items-center justify-between gap-1 w-full mt-2 pt-1 border-t border-slate-100/60">
                    <span className={`font-extrabold text-xs sm:text-sm md:text-base text-slate-800 ${theme.textHover} transition-colors uppercase tracking-wider line-clamp-1 truncate`}>
                      {shortName}
                    </span>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${theme.arrowBg} text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-all duration-200`}>
                      <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
