import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InfoModal, InfoModalTab } from './components/InfoModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { HomeView } from './views/HomeView';
import { CourseView } from './views/CourseView';
import { YearView } from './views/YearView';
import { SemesterView } from './views/SemesterView';
import { PaperYearView } from './views/PaperYearView';
import { SubjectView } from './views/SubjectView';
import { PaperListView } from './views/PaperListView';
import { PdfViewerModal } from './components/PdfViewerModal';
import { api } from './api';
import {
  University,
  Course,
  Year,
  Semester,
  Subject,
  QuestionPaper,
  SiteSettings,
} from './types';
import { Loader2 } from 'lucide-react';
import AdminApp from './AdminApp';

const defaultSettings: SiteSettings = {
  site_name: 'Semester (PYQs)',
  site_tagline: 'Question Papers Archive',
  tagline: 'Question Papers Archive',
  logo_url: '/assets/logos/logo.jpg',
  favicon_url: '/assets/icons/favicon.jpg',
  hero_title: 'Semester Question Papers (PYQs)',
  hero_subtitle: 'Official repository of past examination question papers for undergraduate semester students.',
  about_text: 'Official question papers repository of Semester (PYQs).',
  seo_title: 'Semester (PYQs) - Question Papers Portal',
  seo_description: 'Official repository of previous years semester question papers (PYQs).',
  contact_email: 'examination@semesterpyqs.edu',
  contact_phone: '+91 522 2345678',
  college_address: 'Academic Examination Center & Digital Repository',
  address: 'Academic Examination Center & Digital Repository',
  ad_banner_header: false,
  ad_banner_paper: false,
};

type PublicView = 'home' | 'course' | 'year' | 'semester' | 'paper-year' | 'subject' | 'paper-list';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return window.location.hash.toLowerCase().includes('admin') || window.location.pathname.toLowerCase().endsWith('/admin');
  });

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(window.location.hash.toLowerCase().includes('admin') || window.location.pathname.toLowerCase().endsWith('/admin'));
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Settings & global data with instant cache hydration
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem('lbs_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return defaultSettings;
  });
  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);

  // Search modal state
  const [searchOpen, setSearchOpen] = useState(false);

  // Modal for Info pages
  const [infoModalTab, setInfoModalTab] = useState<InfoModalTab>(null);

  // Navigation flow view state
  const [view, setView] = useState<PublicView>('home');

  // Hierarchy entities
  const [universities, setUniversities] = useState<University[]>(() => {
    try {
      const cached = localStorage.getItem('lbs_cached_universities');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  });
  const [activeUniversity, setActiveUniversity] = useState<University | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  const [years, setYears] = useState<Year[]>([]);
  const [activeYear, setActiveYear] = useState<Year | null>(null);

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);

  const [paperYears, setPaperYears] = useState<number[]>([]);
  const [activePaperYear, setActivePaperYear] = useState<number | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedPaperForModal, setSelectedPaperForModal] = useState<QuestionPaper | null>(null);

  const [loadingView, setLoadingView] = useState(false);

  // References for live silent sync without stale closures
  const viewRef = useRef(view);
  viewRef.current = view;
  const activeUnivRef = useRef(activeUniversity);
  activeUnivRef.current = activeUniversity;
  const activeCourseRef = useRef(activeCourse);
  activeCourseRef.current = activeCourse;
  const activeYearRef = useRef(activeYear);
  activeYearRef.current = activeYear;
  const activeSemRef = useRef(activeSemester);
  activeSemRef.current = activeSemester;
  const activePYearRef = useRef(activePaperYear);
  activePYearRef.current = activePaperYear;
  const activeSubRef = useRef(activeSubject);
  activeSubRef.current = activeSubject;

  const lastServerSyncRef = useRef<number>(0);

  // Load public initial settings & universities
  const loadPublicData = useCallback(async () => {
    try {
      const [settingsRes, univRes] = await Promise.all([
        api.getSettings().catch(() => defaultSettings),
        api.getUniversities().catch(() => []),
      ]);

      if (settingsRes) {
        setSettings(settingsRes);
        try {
          localStorage.setItem('lbs_cached_settings', JSON.stringify(settingsRes));
        } catch {
          // ignore
        }
      }

      if (univRes && univRes.length > 0) {
        setUniversities(univRes);
        try {
          localStorage.setItem('lbs_cached_universities', JSON.stringify(univRes));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  // Silent real-time update function that preserves scroll and active view
  const refreshCurrentView = useCallback(async () => {
    try {
      const [settingsRes, univRes] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getUniversities().catch(() => null),
      ]);
      if (settingsRes) setSettings(settingsRes);
      if (univRes) setUniversities(univRes);

      const curView = viewRef.current;
      const curUniv = activeUnivRef.current;
      const curCourse = activeCourseRef.current;
      const curYear = activeYearRef.current;
      const curSem = activeSemRef.current;
      const curPYear = activePYearRef.current;
      const curSub = activeSubRef.current;

      if (curView === 'paper-list' && curSub) {
        const pList = await api.getPapers({
          universityId: curUniv?.id,
          courseId: curCourse?.id,
          yearId: curYear?.id,
          semesterId: curSem?.id,
          subjectId: curSub.id,
          paperYear: curPYear || undefined,
        });
        if (pList) setPapers(pList);
      } else if (curView === 'subject' && curSem) {
        const [subList, pyList] = await Promise.all([
          api.getSubjects({
            universityId: curUniv?.id,
            courseId: curCourse?.id,
            yearId: curYear?.id,
            semesterId: curSem.id,
            paperYear: curPYear || undefined,
          }),
          api.getPaperYears({
            universityId: curUniv?.id,
            courseId: curCourse?.id,
            yearId: curYear?.id,
            semesterId: curSem.id,
          }),
        ]);
        if (subList) setSubjects(subList);
        if (pyList) setPaperYears(pyList);
      } else if (curView === 'paper-year' && curSem) {
        const pyList = await api.getPaperYears({
          universityId: curUniv?.id,
          courseId: curCourse?.id,
          yearId: curYear?.id,
          semesterId: curSem.id,
        });
        if (pyList) setPaperYears(pyList);
      } else if (curView === 'semester' && curYear) {
        const semList = await api.getSemesters({
          universityId: curUniv?.id,
          courseId: curCourse?.id,
          yearId: curYear.id,
        });
        if (semList) setSemesters(semList);
      } else if (curView === 'year' && curCourse) {
        const yrList = await api.getYears({
          universityId: curUniv?.id,
          courseId: curCourse.id,
        });
        if (yrList) setYears(yrList);
      } else if (curView === 'course' && curUniv) {
        const cList = await api.getCourses(curUniv.id);
        if (cList) setCourses(cList);
      }
    } catch (err) {
      console.warn('Real-time sync refresh notice:', err);
    }
  }, []);

  useEffect(() => {
    loadPublicData();

    // 1. Custom event listener (within same window/tab)
    const handleSync = () => {
      refreshCurrentView();
    };
    window.addEventListener('lbs_sync_updated', handleSync);

    // 2. Storage event listener (cross-tab in same browser)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lbs_sync_timestamp') {
        refreshCurrentView();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Tab focus listener
    window.addEventListener('focus', handleSync);

    // 4. Modern BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('lbs_realtime_sync');
        bc.onmessage = () => {
          refreshCurrentView();
        };
      } catch {
        // ignore
      }
    }

    // 5. Lightweight server sync polling check every 8 seconds (cross-device real-time sync)
    const interval = setInterval(async () => {
      try {
        const status = await api.getSyncStatus();
        if (status && status.lastModified) {
          if (lastServerSyncRef.current === 0) {
            lastServerSyncRef.current = status.lastModified;
          } else if (status.lastModified > lastServerSyncRef.current) {
            lastServerSyncRef.current = status.lastModified;
            refreshCurrentView();
          }
        }
      } catch {
        // quiet error on network glitch
      }
    }, 8000);

    return () => {
      window.removeEventListener('lbs_sync_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [loadPublicData, refreshCurrentView]);

  // Update document title dynamically
  useEffect(() => {
    if (view === 'paper-list' && activeSubject) {
      document.title = `${activeSubject.name} (${activePaperYear || 'All Years'}) - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'subject' && activeSemester && activePaperYear) {
      document.title = `${activeSemester.name} (${activePaperYear}) Subjects - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'paper-year' && activeSemester) {
      document.title = `${activeSemester.name} Paper Years - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'semester' && activeYear) {
      document.title = `${activeYear.name} Semesters - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'year' && activeCourse) {
      document.title = `${activeCourse.name} Academic Years - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'course' && activeUniversity) {
      document.title = `${activeUniversity.name} Courses - ${settings.site_name || 'Semester (PYQs)'}`;
    } else {
      document.title = settings.seo_title || `${settings.site_name || 'Semester (PYQs)'} - Question Papers Archive`;
    }
  }, [view, activeSubject, activePaperYear, activeSemester, activeYear, activeCourse, activeUniversity, settings]);

  // NAVIGATION FLOW HANDLERS
  // 1. Home -> Select University
  const handleSelectUniversity = async (universityId: string) => {
    setLoadingView(true);
    try {
      const univ = universities.find((u) => u.id === universityId) || await api.getUniversityById(universityId);
      const cList = await api.getCourses(universityId);

      setActiveUniversity(univ);
      setCourses(cList || []);
      setActiveCourse(null);
      setYears([]);
      setActiveYear(null);
      setSemesters([]);
      setActiveSemester(null);
      setPaperYears([]);
      setActivePaperYear(null);
      setSubjects([]);
      setActiveSubject(null);
      setPapers([]);

      setView('course');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load university courses:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 2. Course -> Select Course -> Load Years
  const handleSelectCourse = async (courseId: string, directUnivId?: string) => {
    setLoadingView(true);
    try {
      const course = courses.find((c) => c.id === courseId) || await api.getCourseById(courseId);
      const univId = directUnivId || course.university_id || activeUniversity?.id;
      if (univId && (!activeUniversity || activeUniversity.id !== univId)) {
        const univ = universities.find((u) => u.id === univId) || await api.getUniversityById(univId);
        setActiveUniversity(univ);
      }
      const yList = await api.getYears({ courseId, universityId: univId });

      setActiveCourse(course);
      setYears(yList || []);
      setActiveYear(null);
      setSemesters([]);
      setActiveSemester(null);
      setPaperYears([]);
      setActivePaperYear(null);
      setSubjects([]);
      setActiveSubject(null);
      setPapers([]);

      setView('year');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load course years:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 3. Year -> Select Year -> Load Semesters
  const handleSelectYear = async (yearId: string) => {
    setLoadingView(true);
    try {
      const yearObj = years.find((y) => y.id === yearId) || null;
      const sList = await api.getSemesters({
        yearId,
        courseId: activeCourse?.id,
        universityId: activeUniversity?.id,
      });

      setActiveYear(yearObj);
      setSemesters(sList || []);
      setActiveSemester(null);
      setPaperYears([]);
      setActivePaperYear(null);
      setSubjects([]);
      setActiveSubject(null);
      setPapers([]);

      setView('semester');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load semesters:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 4. Semester -> Select Semester -> Load Paper Years (ONLY years with uploaded papers)
  const handleSelectSemester = async (semesterId: string) => {
    setLoadingView(true);
    try {
      const semObj = semesters.find((s) => s.id === semesterId) || null;
      const pYears = await api.getPaperYears({
        semesterId,
        yearId: activeYear?.id,
        courseId: activeCourse?.id,
        universityId: activeUniversity?.id,
      });

      setActiveSemester(semObj);
      setPaperYears(pYears || []);
      setActivePaperYear(null);
      setSubjects([]);
      setActiveSubject(null);
      setPapers([]);

      setView('paper-year');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load paper years:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 5. Paper Year -> Select Paper Year -> Load Subjects
  const handleSelectPaperYear = async (pYear: number) => {
    setLoadingView(true);
    try {
      const subList = await api.getSubjects({
        universityId: activeUniversity?.id,
        courseId: activeCourse?.id,
        yearId: activeYear?.id,
        semesterId: activeSemester?.id,
        paperYear: pYear,
      });

      setActivePaperYear(pYear);
      setSubjects(subList || []);
      setActiveSubject(null);
      setPapers([]);

      setView('subject');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 6. Subject -> Select Subject -> Load Papers
  const handleSelectSubject = async (subjectId: string) => {
    setLoadingView(true);
    try {
      const subObj = subjects.find((s) => s.id === subjectId) || null;
      const paperList = await api.getPapers({
        universityId: activeUniversity?.id,
        courseId: activeCourse?.id,
        yearId: activeYear?.id,
        semesterId: activeSemester?.id,
        subjectId,
        paperYear: activePaperYear || undefined,
      });

      setActiveSubject(subObj);
      setPapers(paperList || []);

      setView('paper-list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load question papers:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // Search Selection Handlers
  const handleSelectSubjectFromSearch = async (subjectId: string, courseId?: string, univId?: string) => {
    setLoadingView(true);
    try {
      let sub = subjects.find((s) => s.id === subjectId);
      if (!sub) {
        sub = await api.getSubjectById(subjectId);
      }
      if (!sub) return;

      const effectiveUnivId = univId || sub.university_id;
      const effectiveCourseId = courseId || sub.course_id;

      let univ = universities.find((u) => u.id === effectiveUnivId);
      if (!univ && effectiveUnivId) {
        univ = await api.getUniversityById(effectiveUnivId);
      }
      setActiveUniversity(univ || null);

      let crs = courses.find((c) => c.id === effectiveCourseId);
      if (!crs && effectiveCourseId) {
        crs = await api.getCourseById(effectiveCourseId);
      }
      setActiveCourse(crs || null);

      if (sub.year_id) {
        const yList = await api.getYears({ courseId: effectiveCourseId, universityId: effectiveUnivId });
        setYears(yList || []);
        setActiveYear(yList?.find((y: any) => y.id === sub?.year_id) || null);
      }

      if (sub.semester_id) {
        const sList = await api.getSemesters({
          yearId: sub.year_id,
          courseId: effectiveCourseId,
          universityId: effectiveUnivId,
        });
        setSemesters(sList || []);
        setActiveSemester(sList?.find((s: any) => s.id === sub?.semester_id) || null);
      }

      setActivePaperYear(null);
      setActiveSubject(sub);

      const paperList = await api.getPapers({
        universityId: effectiveUnivId,
        courseId: effectiveCourseId,
        subjectId: sub.id,
      });
      setPapers(paperList || []);
      setView('paper-list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load subject from search:', err);
    } finally {
      setLoadingView(false);
    }
  };

  const handleSelectPaperFromSearch = (paper: any) => {
    setSelectedPaperForModal(paper);
  };

  // BACK NAVIGATION HANDLERS
  const handleNavigateHome = () => {
    setView('home');
    setActiveUniversity(null);
    setActiveCourse(null);
    setActiveYear(null);
    setActiveSemester(null);
    setActivePaperYear(null);
    setActiveSubject(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmin = () => {
    setIsAdmin(true);
    window.location.hash = 'admin';
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) ||
        (e.altKey && (e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        handleOpenAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAdmin) {
    return (
      <AdminApp
        onExit={() => {
          setIsAdmin(false);
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Navbar - ONLY shown on Home page per user instructions */}
      {view === 'home' && (
        <Navbar
          settings={settings}
          onNavigateHome={handleNavigateHome}
          onOpenInfoTab={(tab) => setInfoModalTab(tab)}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {/* Loading Overlay when switching views */}
      {loadingView && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-slate-700 font-medium text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {loadingInitial ? (
          <div className="max-w-5xl mx-auto py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading examination archives...</p>
          </div>
        ) : (
          <>
            {/* 1. HOMEPAGE: Show University Cards & Available Courses */}
            {view === 'home' && (
              <HomeView
                settings={settings}
                universities={universities}
                onSelectUniversity={handleSelectUniversity}
                onSelectCourse={(courseId, univId) => handleSelectCourse(courseId, univId)}
                onSelectSubject={handleSelectSubjectFromSearch}
                onSelectPaper={handleSelectPaperFromSearch}
                onOpenSearch={() => setSearchOpen(true)}
              />
            )}

            {/* 2. COURSE LEVEL */}
            {view === 'course' && (
              <CourseView
                university={activeUniversity}
                courses={courses}
                onBack={handleNavigateHome}
                onSelectCourse={handleSelectCourse}
              />
            )}

            {/* 3. YEAR LEVEL */}
            {view === 'year' && (
              <YearView
                university={activeUniversity}
                course={activeCourse}
                years={years}
                onBack={() => setView('course')}
                onSelectYear={handleSelectYear}
              />
            )}

            {/* 4. SEMESTER LEVEL */}
            {view === 'semester' && (
              <SemesterView
                university={activeUniversity}
                course={activeCourse}
                year={activeYear}
                semesters={semesters}
                onBack={() => setView('year')}
                onSelectSemester={handleSelectSemester}
              />
            )}

            {/* 5. PAPER YEAR LEVEL */}
            {view === 'paper-year' && (
              <PaperYearView
                university={activeUniversity}
                course={activeCourse}
                year={activeYear}
                semester={activeSemester}
                paperYears={paperYears}
                onBack={() => setView('semester')}
                onSelectPaperYear={handleSelectPaperYear}
              />
            )}

            {/* 6. SUBJECT LEVEL */}
            {view === 'subject' && (
              <SubjectView
                university={activeUniversity}
                course={activeCourse}
                year={activeYear}
                semester={activeSemester}
                paperYear={activePaperYear}
                subjects={subjects}
                onBack={() => setView('paper-year')}
                onSelectSubject={handleSelectSubject}
              />
            )}

            {/* 7. QUESTION PAPER LEVEL */}
            {view === 'paper-list' && (
              <PaperListView
                university={activeUniversity}
                course={activeCourse}
                year={activeYear}
                semester={activeSemester}
                paperYear={activePaperYear}
                subject={activeSubject}
                papers={papers}
                onBack={() => setView('subject')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onNavigateHome={handleNavigateHome}
        onOpenInfoTab={(tab) => setInfoModalTab(tab)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Info Pages Modal (About, Contact, Privacy, Disclaimer) */}
      <InfoModal
        activeTab={infoModalTab}
        onClose={() => setInfoModalTab(null)}
        settings={settings}
      />

      {/* Global Search Modal */}
      {searchOpen && (
        <GlobalSearchModal
          onClose={() => setSearchOpen(false)}
          onSelectUniversity={handleSelectUniversity}
          onSelectCourse={(courseId, univId) => handleSelectCourse(courseId, univId)}
          onSelectSubject={handleSelectSubjectFromSearch}
          onSelectPaper={handleSelectPaperFromSearch}
        />
      )}

      {/* Direct Search Paper PDF Viewer Modal */}
      {selectedPaperForModal && (
        <PdfViewerModal
          paper={selectedPaperForModal}
          onClose={() => setSelectedPaperForModal(null)}
        />
      )}
    </div>
  );
}
