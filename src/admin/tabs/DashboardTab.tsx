import React from 'react';
import {
  FileText,
  GraduationCap,
  BookOpen,
  Eye,
  Download,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Course, Year, Subject, QuestionPaper, DashboardStats } from '../../types';

interface DashboardTabProps {
  stats: DashboardStats | null;
  courses: Course[];
  years?: Year[];
  subjects: Subject[];
  papers: QuestionPaper[];
  onNavigateTab: (tabId: string) => void;
  onEditPaper?: (paper: QuestionPaper) => void;
  onPreviewPaper: (paper: QuestionPaper) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  courses,
  years,
  subjects,
  papers,
  onNavigateTab,
  onEditPaper,
  onPreviewPaper,
}) => {
  // Sort papers by created_at or exam_year descending
  const recentPapers = [...papers]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 6);

  const statCards = [
    {
      label: 'Total Question Papers',
      value: stats?.total_papers ?? papers.length,
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      tab: 'all-papers',
    },
    {
      label: 'Total Courses',
      value: stats?.total_courses ?? courses.length,
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      tab: 'courses',
    },
    {
      label: 'Total Subjects',
      value: stats?.total_subjects ?? subjects.length,
      icon: BookOpen,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-600 text-white',
      tab: 'subjects',
    },
    {
      label: 'Total Views',
      value: stats?.total_views ?? papers.reduce((acc, p) => acc + (p.view_count || 0), 0),
      icon: Eye,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-600 text-white',
      tab: 'all-papers',
    },
    {
      label: 'Total Downloads',
      value: stats?.total_downloads ?? papers.reduce((acc, p) => acc + (p.download_count || 0), 0),
      icon: Download,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-600 text-white',
      tab: 'all-papers',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-400/30">
            <span>Admin Control Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
            Administrative Dashboard
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Manage institutional question papers, degree courses, academic subjects, and portal advertisements with instant synchronization to the public website.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('upload-paper')}
          className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Question Paper</span>
        </button>
      </div>

      {/* 1. Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(card.tab)}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 line-clamp-1">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-xl ${card.iconBg} flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
                {card.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Recent Uploaded Papers */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
              Recent Uploaded Papers
            </h2>
            <p className="text-xs text-slate-500">
              Latest papers uploaded to the shared database
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('all-papers')}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            <span>View All Papers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPapers.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No question papers uploaded yet. Click "Upload Question Paper" to add the first paper.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-medium text-xs">
                <tr>
                  <th className="px-4 py-3">Paper Name</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Year / Semester</th>
                  <th className="px-4 py-3">Upload Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPapers.map((paper) => {
                  const uploadDateStr = paper.created_at
                    ? new Date(paper.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recently';

                  const isPublished = paper.is_published && paper.status !== 'Draft';

                  return (
                    <tr key={paper.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                          {paper.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {paper.exam_year} • {paper.paper_code || 'No Code'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">
                          {paper.course_code || paper.course_name || 'Course'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {paper.subject_name || 'Subject'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {paper.year_name || 'Year'} {paper.semester ? `• ${paper.semester}` : ''}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {uploadDateStr}
                      </td>
                      <td className="px-4 py-3.5">
                        {isPublished ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Published</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => onPreviewPaper(paper)}
                          title="View PDF Preview"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditPaper ? onEditPaper(paper) : onNavigateTab('all-papers')}
                          title="Edit Paper"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Quick Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('upload-paper')}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 font-serif">Upload Question Paper</h3>
          <p className="text-xs text-slate-500 mt-1">
            Add a new PDF paper with auto-categorization to Course, Year, and Subject.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('advertisements')}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <ExternalLink className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 font-serif">Advertisements</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure homepage, course page, paper page, and download banners.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('settings')}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 font-serif">Portal Settings</h3>
          <p className="text-xs text-slate-500 mt-1">
            Customize college branding, maximum PDF upload size, and preferences.
          </p>
        </div>
      </div>
    </div>
  );
};
