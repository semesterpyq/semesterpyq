import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, BookOpen, FileText, Loader2, ChevronRight, GraduationCap } from 'lucide-react';
import { api } from '../api';

interface GlobalSearchModalProps {
  onClose: () => void;
  onSelectUniversity?: (universityId: string) => void;
  onSelectCourse?: (courseId: string, universityId?: string) => void;
  onSelectSubject?: (subjectId: string, courseId?: string, universityId?: string) => void;
  onSelectPaper?: (paper: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  onClose,
  onSelectUniversity,
  onSelectCourse,
  onSelectSubject,
  onSelectPaper,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({
    universities: [],
    courses: [],
    subjects: [],
    papers: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ universities: [], courses: [], subjects: [], papers: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasAnyResults =
    (results.universities && results.universities.length > 0) ||
    (results.courses && results.courses.length > 0) ||
    (results.subjects && results.subjects.length > 0) ||
    (results.papers && results.papers.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="relative border-b border-slate-200 p-4 flex items-center bg-slate-50">
          <Search className="w-5 h-5 text-indigo-600 absolute left-6 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search university, course, subject, or paper title..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-14 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="ml-2 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Searching examination records...</span>
            </div>
          ) : !query.trim() ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Type keywords above to search across all universities, courses, subjects, and question papers.
            </div>
          ) : (
            <>
              {/* Universities */}
              {results.universities && results.universities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Universities ({results.universities.length})
                  </h4>
                  <div className="space-y-1">
                    {results.universities.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          if (onSelectUniversity) onSelectUniversity(u.id);
                          onClose();
                        }}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {u.logo_url ? (
                              <img src={u.logo_url} alt={u.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <Building2 className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">{u.name}</p>
                            <p className="text-[10px] text-slate-500">{u.code || 'University'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">View</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Courses */}
              {results.courses && results.courses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Courses ({results.courses.length})
                  </h4>
                  <div className="space-y-1">
                    {results.courses.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (onSelectCourse) onSelectCourse(c.id, c.university_id);
                          onClose();
                        }}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.university_name || 'Course'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {results.subjects && results.subjects.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Subjects ({results.subjects.length})
                  </h4>
                  <div className="space-y-1">
                    {results.subjects.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (onSelectSubject) {
                            onSelectSubject(s.id, s.course_id, s.university_id);
                          } else if (onSelectCourse) {
                            onSelectCourse(s.course_id, s.university_id);
                          }
                          onClose();
                        }}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-600">{s.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {s.code ? `${s.code} • ` : ''}
                              {s.course_name || 'Course'}
                              {s.university_name ? ` (${s.university_name})` : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Papers */}
              {results.papers && results.papers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-500" /> Question Papers ({results.papers.length})
                  </h4>
                  <div className="space-y-1">
                    {results.papers.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (onSelectPaper) {
                            onSelectPaper(p);
                          }
                          onClose();
                        }}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-red-50/60 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 max-w-[75%]">
                          <FileText className="w-4 h-4 text-red-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-xs text-slate-900 group-hover:text-red-600 truncate">{p.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {p.subject_name || p.course_name || 'Paper'} • Year {p.paper_year || p.exam_year}
                              {p.university_name ? ` • ${p.university_name}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md shrink-0">
                          View PDF
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!hasAnyResults && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No matching records found for "{query}".
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
