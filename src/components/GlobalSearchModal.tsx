import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Calendar, FileText, ArrowRight, Loader2, Command } from 'lucide-react';
import { api } from '../api';
import { SearchResult } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (courseId: string) => void;
  onSelectYear: (courseId: string, yearId: string) => void;
  onSelectSubject: (courseId: string, yearId: string, subjectId: string) => void;
  onSelectPaper: (paperId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCourse,
  onSelectYear,
  onSelectSubject,
  onSelectPaper,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ courses: [], years: [], subjects: [], papers: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ courses: [], years: [], subjects: [], papers: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ courses: [], years: [], subjects: [], papers: [] });
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
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults =
    results.courses.length + results.years.length + results.subjects.length + results.papers.length;

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 sm:pt-20 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="search-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modern Search Input Bar */}
        <div className="relative border-b border-slate-200/80 p-3 sm:p-4 flex items-center bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 absolute left-5 sm:left-6" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type course, subject, or exam year to search..."
            className="w-full pl-9 sm:pl-10 pr-12 py-2 text-sm sm:text-base bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-2xs"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-5 sm:right-6 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center absolute right-6 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Searching archives...</p>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500">
              <p className="font-semibold text-slate-800">No matching question papers found</p>
              <p className="text-xs mt-1 text-slate-400">
                Try searching by degree (e.g. "B.Sc", "BA"), subject title, or year.
              </p>
            </div>
          )}

          {!loading && !query && (
            <div className="py-6 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-700">Quick Portal Search</p>
              <p className="mt-1 text-slate-500">
                Type B.Sc, BA, B.Com, Mathematics, Physics, or an exam year to quickly jump directly to papers.
              </p>
            </div>
          )}

          {/* Courses */}
          {results.courses.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Degree Programs ({results.courses.length})
              </div>
              <div className="space-y-1.5">
                {results.courses.map((course, idx) => (
                  <button
                    key={`${course.id}-${idx}`}
                    onClick={() => {
                      onSelectCourse(course.id);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100/80 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {course.code}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                          {course.name}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{course.description}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subjects */}
          {results.subjects.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Subjects ({results.subjects.length})
              </div>
              <div className="space-y-1.5">
                {results.subjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onSelectSubject(sub.course_id, sub.year_id, sub.id);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-medium text-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                          {sub.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sub.code} • {sub.course_code || 'Course'} • {sub.year_name || 'Year'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question Papers */}
          {results.papers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Question Papers ({results.papers.length})
              </div>
              <div className="space-y-1.5">
                {results.papers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => {
                      onSelectPaper(paper.id);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100/80 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 truncate">
                          {paper.title}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center space-x-2">
                          <span>{paper.subject_name}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">Exam {paper.exam_year}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Press ESC to close</span>
          <span>College Academic Archives</span>
        </div>
      </div>
    </div>
  );
};
