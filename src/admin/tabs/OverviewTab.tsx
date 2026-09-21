import React from 'react';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  Download,
  Eye,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Layers,
  CalendarDays
} from 'lucide-react';
import { DashboardStats, Course, QuestionPaper, Year, Subject } from '../../types';

interface OverviewTabProps {
  stats: DashboardStats | null;
  courses: Course[];
  years?: Year[];
  subjects?: Subject[];
  papers: QuestionPaper[];
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  courses,
  years = [],
  subjects = [],
  papers,
  onNavigateTab,
}) => {
  // Calculate distinct exam years in repository
  const examYearsSet = new Set<number>();
  papers.forEach((p) => examYearsSet.add(p.exam_year));
  const examYearsList = Array.from(examYearsSet).sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      {/* 6-Step Flow Spotlight Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold uppercase tracking-wider border border-blue-400/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Curriculum Hierarchy</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
            6-Step Examination Architecture
          </h2>
          <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
            Students navigate the portal through: Course → Academic Year → Examination Year → Subject → Question Papers → Embedded PDF. Manage each stage cleanly or use the 6-Step Flow Explorer.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('flow-explorer')}
          className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex-shrink-0"
        >
          <span>Open 6-Step Flow Explorer</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 1: Courses</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-serif">
            {stats?.total_courses || courses.length}
          </p>
          <button
            onClick={() => onNavigateTab('courses')}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 mt-1 block"
          >
            Manage Courses →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 2: Years/Terms</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-serif">
            {years.length || 12}
          </p>
          <button
            onClick={() => onNavigateTab('years')}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 mt-1 block"
          >
            Manage Years →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 3: Exam Years</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-serif">
            {examYearsList.length || 6}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            {examYearsList[0] || 2026} to {examYearsList[examYearsList.length - 1] || 2021}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 4: Subjects</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-serif">
            {stats?.total_subjects || subjects.length || 19}
          </p>
          <button
            onClick={() => onNavigateTab('subjects')}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 mt-1 block"
          >
            Manage Subjects →
          </button>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 5: Papers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-serif">
            {stats?.total_papers || papers.length}
          </p>
          <button
            onClick={() => onNavigateTab('papers')}
            className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 mt-1 block"
          >
            Manage Papers →
          </button>
        </div>
      </div>

      {/* Curriculum Matrix Breakdown per Course */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Degree Curriculum & Question Paper Inventory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of question papers and student downloads across each undergraduate course.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('flow-explorer')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Explore Interactive Tree →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.map((course) => {
            const coursePapers = papers.filter((p) => p.course_id === course.id);
            const courseDownloads = coursePapers.reduce((sum, p) => sum + (p.download_count || 0), 0);
            const courseYearsCount = course.years_count || 3;
            const courseSubsCount = course.subjects_count || 0;

            return (
              <div
                key={course.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-900 font-serif">{course.code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold font-mono">
                    {coursePapers.length} {coursePapers.length === 1 ? 'Paper' : 'Papers'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{course.name}</p>

                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Academic Years:</span>
                    <span className="font-semibold">{courseYearsCount} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Curriculum Subjects:</span>
                    <span className="font-semibold">{courseSubsCount} Subjects</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Downloads:</span>
                    <span className="font-semibold text-emerald-700">{courseDownloads.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('flow-explorer')}
                  className="w-full text-center py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  View in Flow Explorer
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold font-serif text-white">Repository Administrative Actions</h3>
          <p className="text-xs text-slate-400 mt-1">
            Easily upload a new examination question paper or configure courses, years, and subjects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigateTab('flow-explorer')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
          >
            <Layers className="w-4 h-4" />
            <span>6-Step Flow Explorer</span>
          </button>
          <button
            onClick={() => onNavigateTab('papers')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Question Paper</span>
          </button>
          <button
            onClick={() => onNavigateTab('courses')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>Courses</span>
          </button>
          <button
            onClick={() => onNavigateTab('subjects')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>Subjects</span>
          </button>
        </div>
      </div>

      {/* Recent Question Papers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm font-serif">Recent Question Papers in Repository</h3>
          <button
            onClick={() => onNavigateTab('papers')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
          >
            View All ({papers.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Title & Subject</th>
                <th className="p-3.5">Course / Year</th>
                <th className="p-3.5">Exam Year</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {papers.slice(0, 6).map((paper) => (
                <tr key={paper.id} className="hover:bg-slate-50/70">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900">{paper.title}</p>
                    <p className="text-[11px] text-slate-500">{paper.subject_name} ({paper.paper_code})</p>
                  </td>
                  <td className="p-3.5">
                    <span className="font-medium text-slate-800">{paper.course_code}</span>
                    <span className="text-slate-400"> • </span>
                    <span>{paper.year_name}</span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {paper.exam_year}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        paper.is_published
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {paper.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-semibold text-slate-800">
                    {paper.download_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
