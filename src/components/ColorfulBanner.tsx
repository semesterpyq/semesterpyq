import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, GraduationCap, Building2, FileText, ChevronRight, X, Loader2 } from 'lucide-react';
import { api } from '../api';
import { UniversityLogo } from './UniversityLogo';

interface SearchResults {
  universities?: Array<{
    id: string;
    name: string;
    code?: string;
    logo_url?: string;
  }>;
  courses?: Array<{
    id: string;
    university_id?: string;
    name: string;
    code: string;
    university_name?: string;
  }>;
  subjects?: Array<{
    id: string;
    course_id: string;
    university_id?: string;
    year_id?: string;
    semester_id?: string;
    name: string;
    code?: string;
    course_name?: string;
    university_name?: string;
  }>;
  papers?: Array<{
    id: string;
    title: string;
    exam_year: number;
    paper_year?: number;
    subject_name?: string;
    course_name?: string;
    university_name?: string;
    file_url?: string;
  }>;
}

interface ColorfulBannerProps {
  onSelectUniversity?: (universityId: string) => void;
  onSelectCourse: (courseId: string, universityId?: string) => void;
  onSelectSubject?: (subjectId: string, courseId?: string, universityId?: string) => void;
  onSelectPaper: (paper: any) => void;
}

export const ColorfulBanner: React.FC<ColorfulBannerProps> = ({
  onSelectUniversity,
  onSelectCourse,
  onSelectSubject,
  onSelectPaper,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query.trim());
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const universities = results?.universities || [];
  const courses = results?.courses || [];
  const subjects = results?.subjects || [];
  const papers = results?.papers || [];

  const totalResults = universities.length + courses.length + subjects.length + papers.length;

  return (
    <div className="relative w-full overflow-visible">
      {/* Colorful Academic Banner Card */}
      <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-sky-100/90 via-indigo-100/80 to-purple-100/90 border border-indigo-100 shadow-sm overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[160px] sm:min-h-[190px]">
        
        {/* Soft decorative background circles */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/40 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 right-20 w-48 h-48 bg-pink-200/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />

        {/* Left / Center: Search Bar Section */}
        <div className="w-full sm:max-w-xl z-10 space-y-3">
          <div ref={searchContainerRef} className="relative w-full group">
            {/* Animated Glowing Gradient Aura behind search input */}
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 via-sky-400 to-indigo-500 opacity-30 blur-md group-hover:opacity-60 group-focus-within:opacity-80 transition-opacity duration-300 animate-hue-shift" />

            {/* Search Input Box Container with Animated Gradient Border */}
            <div className="relative p-[2px] rounded-full bg-gradient-to-r from-indigo-500/80 via-purple-500/80 via-pink-500/80 to-sky-400/80 animate-hue-shift shadow-md group-hover:shadow-xl transition-all duration-300">
              <div className="relative flex items-center bg-white rounded-full">
                <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 group-hover:scale-110 transition-all duration-300 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    if (results) setIsOpen(true);
                  }}
                  placeholder="Search university, course, subject, or year..."
                  className="w-full pl-11 pr-10 py-3 sm:py-3.5 bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium rounded-full focus:outline-none transition-all"
                />
                {loading && (
                  <div className="absolute right-4 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  </div>
                )}
                {query && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults(null);
                      setIsOpen(false);
                    }}
                    className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Search Results Dropdown */}
            {isOpen && results && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs sm:text-sm">
                {totalResults === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No results found for &ldquo;<span className="font-semibold text-slate-700">{query}</span>&rdquo;
                  </div>
                ) : (
                  <>
                    {/* Universities */}
                    {universities.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-indigo-500" /> Universities ({universities.length})
                        </div>
                        {universities.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              if (onSelectUniversity) onSelectUniversity(u.id);
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50/80 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                <UniversityLogo
                                  logoUrl={u.logo_url}
                                  name={u.name}
                                  code={u.code}
                                  className="w-full h-full object-contain rounded-full"
                                  iconClassName="w-3.5 h-3.5 text-indigo-600"
                                />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 group-hover:text-indigo-600 block">{u.name}</span>
                                <span className="text-[10px] text-slate-400">{u.code || 'University'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">View</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Courses */}
                    {courses.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                          <GraduationCap className="w-3 h-3 text-blue-500" /> Courses ({courses.length})
                        </div>
                        {courses.map((c, idx) => (
                          <button
                            key={`${c.id}-${idx}`}
                            onClick={() => {
                              onSelectCourse(c.id, c.university_id);
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/80 text-left transition-colors cursor-pointer group"
                          >
                            <div>
                              <span className="font-semibold text-slate-800 group-hover:text-blue-600 block">
                                {c.name} ({c.code})
                              </span>
                              {c.university_name && (
                                <span className="text-[10px] text-slate-400 block">{c.university_name}</span>
                              )}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Subjects */}
                    {subjects.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-emerald-500" /> Subjects ({subjects.length})
                        </div>
                        {subjects.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              if (onSelectSubject) {
                                onSelectSubject(s.id, s.course_id, s.university_id);
                              } else {
                                onSelectCourse(s.course_id, s.university_id);
                              }
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/80 text-left transition-colors cursor-pointer group"
                          >
                            <div>
                              <span className="font-semibold text-slate-800 group-hover:text-emerald-600 block">
                                {s.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {s.code ? `${s.code} • ` : ''}
                                {s.course_name || ''}
                                {s.university_name ? ` (${s.university_name})` : ''}
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Question Papers */}
                    {papers.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-red-500" /> Question Papers ({papers.length})
                        </div>
                        {papers.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSelectPaper(p);
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-red-50/80 text-left transition-colors cursor-pointer group"
                          >
                            <div className="max-w-[75%]">
                              <span className="font-medium text-slate-800 group-hover:text-red-600 block truncate">
                                {p.title}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.subject_name || p.course_name || 'Paper'} • Year {p.paper_year || p.exam_year}
                                {p.university_name ? ` • ${p.university_name}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md shrink-0">
                              View PDF
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right / Top: Academic Illustration (Stacked Books, Cap & Plant) */}
        <div className="relative shrink-0 flex items-center justify-center pointer-events-none">
          <svg
            className="w-32 h-28 sm:w-44 sm:h-36 drop-shadow-md"
            viewBox="0 0 200 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft Shadow at base */}
            <ellipse cx="100" cy="148" rx="70" ry="8" fill="#cbd5e1" fillOpacity="0.4" />

            {/* Bottom Book (Teal / Emerald) */}
            <g transform="translate(30, 118)">
              <rect x="0" y="4" width="130" height="20" rx="3" fill="#0d9488" />
              <rect x="10" y="7" width="118" height="14" rx="2" fill="#f8fafc" />
              <path d="M0 4 Q65 1 130 4 L130 8 Q65 5 0 8 Z" fill="#14b8a6" />
              <rect x="18" y="2" width="10" height="23" fill="#f59e0b" />
            </g>

            {/* Middle Book (Orange / Coral) */}
            <g transform="translate(36, 96)">
              <rect x="0" y="4" width="118" height="20" rx="3" fill="#ea580c" />
              <rect x="8" y="7" width="108" height="14" rx="2" fill="#fff7ed" />
              <path d="M0 4 Q59 1 118 4 L118 8 Q59 5 0 8 Z" fill="#f97316" />
            </g>

            {/* Top Book (Navy / Blue) */}
            <g transform="translate(42, 74)">
              <rect x="0" y="4" width="106" height="20" rx="3" fill="#1e40af" />
              <rect x="8" y="7" width="96" height="14" rx="2" fill="#eff6ff" />
              <path d="M0 4 Q53 1 106 4 L106 8 Q53 5 0 8 Z" fill="#3b82f6" />
              <rect x="25" y="0" width="8" height="25" fill="#ef4444" />
            </g>

            {/* Graduation Cap */}
            <g transform="translate(68, 30)">
              {/* Cap Base */}
              <ellipse cx="28" cy="30" rx="20" ry="6" fill="#0f172a" />
              <path d="M12 28 C12 34 44 34 44 28 L44 32 C44 38 12 38 12 32 Z" fill="#1e293b" />
              
              {/* Diamond Top */}
              <polygon points="28,10 60,22 28,34 -4,22" fill="#1e3a8a" stroke="#2563eb" strokeWidth="1" />
              <circle cx="28" cy="22" r="3" fill="#f59e0b" />

              {/* Gold Tassel */}
              <path d="M28 22 Q46 22 48 35" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="48" cy="36" r="2.5" fill="#f59e0b" />
              <path d="M48 37 L46 44 L50 44 Z" fill="#d97706" />
            </g>

            {/* Little Plant on the right */}
            <g transform="translate(150, 92)">
              {/* Pot */}
              <polygon points="12,38 28,38 25,52 15,52" fill="#f97316" />
              <ellipse cx="20" cy="38" rx="8" ry="2" fill="#ea580c" />
              {/* Stem */}
              <path d="M20 38 Q20 25 16 16" stroke="#15803d" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Leaves */}
              <ellipse cx="14" cy="20" rx="6" ry="3" fill="#22c55e" transform="rotate(-30 14 20)" />
              <ellipse cx="24" cy="24" rx="7" ry="3.5" fill="#16a34a" transform="rotate(35 24 24)" />
              <ellipse cx="17" cy="14" rx="5" ry="2.5" fill="#4ade80" transform="rotate(-15 17 14)" />
            </g>

            {/* Sparkles / Stars */}
            <g opacity="0.8">
              <path d="M24 60 Q28 60 28 56 Q28 60 32 60 Q28 60 28 64 Q28 60 24 60 Z" fill="#fbbf24" />
              <path d="M165 40 Q168 40 168 37 Q168 40 171 40 Q168 40 168 43 Q168 40 165 40 Z" fill="#38bdf8" />
              <circle cx="18" cy="85" r="2" fill="#ec4899" />
              <circle cx="176" cy="75" r="2.5" fill="#a855f7" />
            </g>
          </svg>
        </div>

      </div>
    </div>
  );
};
