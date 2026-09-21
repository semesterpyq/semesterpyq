import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  GraduationCap,
  BookOpen,
  Layers,
  Users,
  ExternalLink,
  Settings as SettingsIcon,
  LogOut,
  RefreshCw,
  Lock,
  X,
  Megaphone,
} from 'lucide-react';
import {
  AdminUser,
  Course,
  Year,
  Subject,
  QuestionPaper,
  SiteSettings,
  DashboardStats,
} from '../types';
import { api, clearAdminToken } from '../api';
import { PdfViewer } from '../components/PdfViewer';

// Admin Tab Components
import { DashboardTab } from './tabs/DashboardTab';
import { UploadPaperTab } from './tabs/UploadPaperTab';
import { AllPapersTab } from './tabs/AllPapersTab';
import { CoursesTab } from './tabs/CoursesTab';
import { SubjectsTab } from './tabs/SubjectsTab';
import { FlowExplorerTab } from './tabs/FlowExplorerTab';
import { UsersTab } from './tabs/UsersTab';
import { AdvertisementsTab } from './tabs/AdvertisementsTab';
import { SettingsTab } from './tabs/SettingsTab';

interface AdminDashboardProps {
  admin: AdminUser;
  settings: SiteSettings;
  onLogout: () => void;
  onViewPublicSite: () => void;
  onRefreshSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  settings,
  onLogout,
  onViewPublicSite,
  onRefreshSettings,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(admin);

  // PDF Preview modal for any paper
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [statsRes, coursesRes, yearsRes, subsRes, papersRes] = await Promise.all([
        api.adminGetStats().catch(() => null),
        api.adminGetCourses().catch(() => []),
        api.adminGetYears().catch(() => []),
        api.adminGetSubjects().catch(() => []),
        api.adminGetPapers().catch(() => []),
      ]);

      setStats(statsRes);
      setCourses(coursesRes);
      setYears(yearsRes);
      setSubjects(subsRes);
      setPapers(papersRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualRefresh = () => {
    loadData(true);
    onRefreshSettings();
  };

  // User-specified sidebar menu
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload-paper', label: 'Upload Question Paper', icon: UploadCloud, highlight: true },
    { id: 'all-papers', label: 'All Question Papers', count: papers.length, icon: FileText },
    { id: 'courses', label: 'Courses', count: courses.length, icon: GraduationCap },
    { id: 'subjects', label: 'Subjects', count: subjects.length, icon: BookOpen },
    { id: 'categories', label: 'Categories / Flow', icon: Layers },
    { id: 'users', label: 'Users & Security', icon: Users },
    { id: 'advertisements', label: 'Advertisements', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Admin Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-blue-400/30 bg-slate-800 flex items-center justify-center shrink-0">
              <img
                src="/assets/logos/logo.jpg"
                alt="Semester (PYQs) Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white font-serif tracking-tight">
                  Semester (PYQs)
                </span>
                <span className="bg-blue-900/80 text-blue-200 border border-blue-700/50 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                  Institutional Admin Panel
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Single Owner: {currentAdmin.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh Data from Shared Database"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={onViewPublicSite}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>User Website</span>
            </button>

            <button
              onClick={() => {
                clearAdminToken();
                onLogout();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-200 text-xs font-bold rounded-lg transition-colors border border-red-800/40 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : item.highlight
                      ? 'bg-blue-50/70 text-blue-800 hover:bg-blue-100/70'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active
                          ? 'text-white'
                          : item.highlight
                          ? 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : item.highlight ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  ) : null}
                </button>
              );
            })}

            {/* Logout item in sidebar */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  clearAdminToken();
                  onLogout();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          </nav>

          {/* Quick Info Box */}
          <div className="mt-4 p-4 bg-white border border-slate-200/90 rounded-2xl text-xs space-y-2 text-slate-500 shadow-2xs">
            <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Unified Database Sync</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every upload and edit connects directly to the shared repository and automatically updates the public User Website.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-h-[500px]">
          {loading ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3 shadow-2xs">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading Repository Data...</p>
            </div>
          ) : (
            <>
              {/* 1. Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <DashboardTab
                  stats={stats}
                  courses={courses}
                  years={years}
                  subjects={subjects}
                  papers={papers}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onPreviewPaper={(paper) => setPreviewPaper(paper)}
                />
              )}

              {/* 2. Upload Question Paper Tab */}
              {activeTab === 'upload-paper' && (
                <UploadPaperTab
                  courses={courses}
                  years={years}
                  subjects={subjects}
                  settings={settings}
                  onPaperUploaded={(newPaper) => {
                    handleManualRefresh();
                  }}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onViewPublicSite={onViewPublicSite}
                />
              )}

              {/* 3. All Question Papers Tab */}
              {activeTab === 'all-papers' && (
                <AllPapersTab
                  courses={courses}
                  years={years}
                  subjects={subjects}
                  papers={papers}
                  onRefresh={handleManualRefresh}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onPreviewPaper={(paper) => setPreviewPaper(paper)}
                />
              )}

              {/* 4. Courses Tab */}
              {activeTab === 'courses' && (
                <CoursesTab
                  courses={courses}
                  years={years}
                  subjects={subjects}
                  papers={papers}
                  onRefresh={handleManualRefresh}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {/* 5. Subjects Tab */}
              {activeTab === 'subjects' && (
                <SubjectsTab
                  courses={courses}
                  years={years}
                  subjects={subjects}
                  papers={papers}
                  onRefresh={handleManualRefresh}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {/* 6. Categories / Flow Explorer Tab */}
              {activeTab === 'categories' && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
                  <FlowExplorerTab
                    courses={courses}
                    years={years}
                    subjects={subjects}
                    papers={papers}
                    onRefresh={handleManualRefresh}
                    onOpenCreatePaperModal={() => {
                      setActiveTab('upload-paper');
                    }}
                    onOpenEditPaperModal={() => {
                      setActiveTab('all-papers');
                    }}
                  />
                </div>
              )}

              {/* 7. Users Tab */}
              {activeTab === 'users' && (
                <UsersTab
                  currentAdmin={currentAdmin}
                  onAdminUpdated={(updated) => setCurrentAdmin(updated)}
                />
              )}

              {/* 8. Advertisements Tab */}
              {activeTab === 'advertisements' && (
                <AdvertisementsTab
                  settings={settings}
                  onRefreshSettings={handleManualRefresh}
                />
              )}

              {/* 9. Settings Tab */}
              {activeTab === 'settings' && (
                <SettingsTab
                  settings={settings}
                  onRefreshSettings={handleManualRefresh}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Admin PDF Viewer Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-800">
            <div className="px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className="font-bold text-sm truncate max-w-md">
                  {previewPaper.title} ({previewPaper.exam_year})
                </span>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <PdfViewer
                url={previewPaper.file_url}
                title={previewPaper.title}
                paperDetails={{
                  courseName: previewPaper.course_name,
                  courseCode: previewPaper.course_code,
                  yearName: previewPaper.year_name,
                  subjectName: previewPaper.subject_name || previewPaper.title,
                  subjectCode: previewPaper.subject_code || previewPaper.paper_code,
                  paperTitle: previewPaper.title,
                  examYear: previewPaper.exam_year,
                  examSession: previewPaper.exam_session,
                  paperCode: previewPaper.paper_code,
                  totalMarks: previewPaper.total_marks,
                  duration: previewPaper.duration,
                }}
                downloadUrl={`/api/papers/${previewPaper.id}/download`}
                downloadFilename={previewPaper.file_name}
                minHeight="100%"
                className="h-full rounded-none border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
