import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Users,
  ExternalLink,
  Settings as SettingsIcon,
  LogOut,
  RefreshCw,
  Lock,
  X,
  Megaphone,
  Clock,
  ShieldCheck,
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
import { api, clearAdminToken, getAdminSessionRemainingMs } from '../api';
import { PdfViewerModal } from '../components/PdfViewerModal';

// Admin Tab Components
import { DashboardTab } from './tabs/DashboardTab';
import { UploadPaperTab } from './tabs/UploadPaperTab';
import { AllPapersTab } from './tabs/AllPapersTab';
import { UniversitiesTab } from './tabs/UniversitiesTab';
import { CoursesTab } from './tabs/CoursesTab';
import { YearsTab } from './tabs/YearsTab';
import { SemestersTab } from './tabs/SemestersTab';
import { SubjectsTab } from './tabs/SubjectsTab';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(admin);
  const [sessionRemainingSec, setSessionRemainingSec] = useState<number>(3600);

  // PDF Preview modal
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);

  // 1-Hour Session Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = getAdminSessionRemainingMs();
      setSessionRemainingSec(Math.max(0, Math.floor(remainingMs / 1000)));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const statsRes = await api.adminGetStats().catch(() => null);
      setStats(statsRes);
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload-paper', label: 'Upload Question Paper', icon: UploadCloud, highlight: true },
    { id: 'all-papers', label: 'All Question Papers', icon: FileText },
    { id: 'universities', label: 'Universities', icon: Building2 },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'years', label: 'Years', icon: Calendar },
    { id: 'semesters', label: 'Semesters', icon: Layers },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
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
                src={settings.logo_url || '/assets/logos/logo.jpg'}
                alt="Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white font-serif tracking-tight">
                  {settings.site_name || 'Semester (PYQs)'}
                </span>
                <span className="bg-blue-900/80 text-blue-200 border border-blue-700/50 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                  Admin Panel
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged in as {currentAdmin.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 1-Hour Session Timer Pill */}
            <div
              className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                sessionRemainingSec <= 300
                  ? 'bg-amber-950/60 border-amber-800/80 text-amber-300 animate-pulse'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
              }`}
              title="Admin session expires automatically in 1 hour"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Session: <strong className="font-mono">{formatSessionTime(sessionRemainingSec)}</strong></span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh Data"
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
              Every change made in Admin Panel immediately reflects on the User Website.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-h-[500px]">
          {/* 1. Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              courses={[]}
              years={[]}
              subjects={[]}
              papers={[]}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onPreviewPaper={(paper) => setPreviewPaper(paper)}
            />
          )}

          {/* 2. Upload Question Paper Tab */}
          {activeTab === 'upload-paper' && (
            <UploadPaperTab
              onPaperUploaded={handleManualRefresh}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onViewPublicSite={onViewPublicSite}
            />
          )}

          {/* 3. All Question Papers Tab */}
          {activeTab === 'all-papers' && (
            <AllPapersTab
              courses={[]}
              years={[]}
              subjects={[]}
              papers={[]}
              onRefresh={handleManualRefresh}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onPreviewPaper={(paper) => setPreviewPaper(paper)}
            />
          )}

          {/* 4. Universities Tab */}
          {activeTab === 'universities' && (
            <UniversitiesTab onRefresh={handleManualRefresh} />
          )}

          {/* 5. Courses Tab */}
          {activeTab === 'courses' && (
            <CoursesTab onRefresh={handleManualRefresh} />
          )}

          {/* 6. Years Tab */}
          {activeTab === 'years' && (
            <YearsTab onRefresh={handleManualRefresh} />
          )}

          {/* 7. Semesters Tab */}
          {activeTab === 'semesters' && (
            <SemestersTab onRefresh={handleManualRefresh} />
          )}

          {/* 8. Subjects Tab */}
          {activeTab === 'subjects' && (
            <SubjectsTab onRefresh={handleManualRefresh} />
          )}

          {/* 9. Users Tab */}
          {activeTab === 'users' && (
            <UsersTab
              currentAdmin={currentAdmin}
              onAdminUpdated={(updated) => setCurrentAdmin(updated)}
            />
          )}

          {/* 10. Advertisements Tab */}
          {activeTab === 'advertisements' && (
            <AdvertisementsTab
              settings={settings}
              onRefreshSettings={handleManualRefresh}
            />
          )}

          {/* 11. Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onRefreshSettings={handleManualRefresh}
            />
          )}
        </main>
      </div>

      {/* Admin PDF Viewer Modal */}
      {previewPaper && (
        <PdfViewerModal
          paper={previewPaper}
          onClose={() => setPreviewPaper(null)}
        />
      )}
    </div>
  );
};
