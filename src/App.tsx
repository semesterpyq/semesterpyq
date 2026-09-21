import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InfoModal, InfoModalTab } from './components/InfoModal';
import { HomeView } from './views/HomeView';
import { CourseView } from './views/CourseView';
import { YearView } from './views/YearView';
import { SubjectView } from './views/SubjectView';
import { PaperListView } from './views/PaperListView';
import { PaperDetailView } from './views/PaperDetailView';
import { api } from './api';
import {
  Course,
  Year,
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
  seo_description: 'Official repository of previous years semester question papers (PYQs). Browse, view, and download authentic past examination papers.',
  seo_keywords: 'Semester (PYQs), PYQ, question papers, semester exam papers, B.Sc., B.A., B.Com., BCA',
  contact_email: 'examination@semesterpyqs.edu',
  contact_phone: '+91 522 2345678',
  college_address: 'Academic Examination Center & Digital Repository',
  address: 'Academic Examination Center & Digital Repository',
  ad_banner_header: false,
  ad_banner_paper: false,
};

type PublicView = 'home' | 'course' | 'year' | 'subject' | 'paper-list' | 'paper';

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

  // Settings & global data
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Modal for Info pages (About, How to Use, Guidelines, Privacy, Disclaimer, Contact)
  const [infoModalTab, setInfoModalTab] = useState<InfoModalTab>(null);

  // Public Flow View State: 'home' | 'course' | 'year' | 'subject' | 'paper-list' | 'paper'
  const [view, setView] = useState<PublicView>('home');

  // Active selected entities
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [courseYears, setCourseYears] = useState<Year[]>([]);
  const [activeYear, setActiveYear] = useState<Year | null>(null);
  const [examYears, setExamYears] = useState<number[]>([]);
  const [activeExamYear, setActiveExamYear] = useState<number | null>(null);
  const [yearSubjects, setYearSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [subjectPapers, setSubjectPapers] = useState<QuestionPaper[]>([]);
  const [activePaper, setActivePaper] = useState<QuestionPaper | null>(null);

  const [loadingView, setLoadingView] = useState(false);

  // Load public initial settings & courses
  const loadPublicData = async () => {
    try {
      const [settingsRes, coursesRes] = await Promise.all([
        api.getSettings().catch(() => defaultSettings),
        api.getCourses().catch(() => []),
      ]);

      setSettings(settingsRes || defaultSettings);
      setCourses(coursesRes);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadPublicData();

    // Listen for tab focus to instantly refresh live papers and courses when switching back from Admin
    const handleFocus = () => {
      loadPublicData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Update document title for SEO dynamically
  useEffect(() => {
    if (view === 'paper' && activePaper) {
      document.title = `${activePaper.title} - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'paper-list' && activeSubject && activeExamYear) {
      document.title = `${activeSubject.name} (${activeExamYear}) - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'subject' && activeCourse && activeYear && activeExamYear) {
      document.title = `${activeCourse.code} ${activeYear.name} ${activeExamYear} Subjects - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'year' && activeCourse && activeYear) {
      document.title = `${activeCourse.code} ${activeYear.name} - ${settings.site_name || 'Semester (PYQs)'}`;
    } else if (view === 'course' && activeCourse) {
      document.title = `${activeCourse.name} (${activeCourse.code}) - ${settings.site_name || 'Semester (PYQs)'}`;
    } else {
      document.title = settings.seo_title || `${settings.site_name || 'Semester (PYQs)'} - Question Papers Archive`;
    }
  }, [view, activePaper, activeSubject, activeExamYear, activeYear, activeCourse, settings]);

  // COURSE FLOW HANDLERS
  // 1. Home -> Select Course
  const handleSelectCourse = async (courseId: string) => {
    setLoadingView(true);
    try {
      const [courseData, years] = await Promise.all([
        api.getCourse(courseId),
        api.getYears(courseId),
      ]);
      setActiveCourse(courseData);
      setCourseYears(years || []);
      setActiveYear(null);
      setExamYears([]);
      setActiveExamYear(null);
      setActiveSubject(null);
      setSubjectPapers([]);
      setActivePaper(null);
      setView('course');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load course details:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 2. Course -> Select Year (Academic Year, e.g. 1st Year)
  const handleSelectYear = async (yearId: string) => {
    if (!activeCourse) return;
    setLoadingView(true);
    try {
      const matchingYear = courseYears.find((y) => y.id === yearId);
      if (matchingYear) setActiveYear(matchingYear);

      // Fetch examination years available in DB for this course and year
      const years = await api.getExamYears(activeCourse.id, yearId);
      setExamYears(years || []);
      setActiveExamYear(null);
      setActiveSubject(null);
      setSubjectPapers([]);
      setActivePaper(null);
      setView('year');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load exam years:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 3. Year -> Select Exam Year (e.g. 2026, 2025, 2024...)
  const handleSelectExamYear = async (examYear: number) => {
    if (!activeCourse || !activeYear) return;
    setLoadingView(true);
    try {
      setActiveExamYear(examYear);
      // Fetch subjects for this course & academic year
      const subjects = await api.getSubjects({ course_id: activeCourse.id, year_id: activeYear.id });
      setYearSubjects(subjects);
      setActiveSubject(null);
      setSubjectPapers([]);
      setActivePaper(null);
      setView('subject');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 4. Subject -> Select Subject (e.g. Physics)
  const handleSelectSubject = async (subjectId: string) => {
    if (!activeCourse || !activeYear) return;
    setLoadingView(true);
    try {
      const matchingSubject = yearSubjects.find((s) => s.id === subjectId);
      if (matchingSubject) setActiveSubject(matchingSubject);

      // Fetch papers for this course, year, subject and exam year
      const papers = await api.getPapers({
        course_id: activeCourse.id,
        year_id: activeYear.id,
        subject_id: subjectId,
        exam_year: activeExamYear || undefined,
      });
      setSubjectPapers(papers);
      setActivePaper(null);
      setView('paper-list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load subject papers:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // 5. Paper List -> Select Paper (e.g. 2026 Paper) -> Open PDF
  const handleSelectPaper = async (paperId: string) => {
    setLoadingView(true);
    try {
      const paper = await api.getPaper(paperId);
      setActivePaper(paper);
      setView('paper');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load paper details:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // Jump directly from Live Search to a Subject
  const handleSearchSelectSubject = async (courseId: string, yearId: string, subjectId: string) => {
    setLoadingView(true);
    try {
      const [courseData, years, subjects] = await Promise.all([
        api.getCourse(courseId),
        api.getYears(courseId),
        api.getSubjects({ course_id: courseId, year_id: yearId }),
      ]);
      setActiveCourse(courseData);
      setCourseYears(years);
      const matchingYear = years.find((y) => y.id === yearId) || years[0] || null;
      setActiveYear(matchingYear);
      setYearSubjects(subjects);
      const matchingSubject = subjects.find((s) => s.id === subjectId) || subjects[0] || null;
      setActiveSubject(matchingSubject);

      if (matchingSubject && matchingYear) {
        const papers = await api.getPapers({
          course_id: courseId,
          year_id: matchingYear.id,
          subject_id: matchingSubject.id,
        });
        setSubjectPapers(papers);
        const latestExamYear = papers.length > 0 ? papers[0].exam_year : 2026;
        setActiveExamYear(latestExamYear);
        setView('paper-list');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to jump to subject:', err);
    } finally {
      setLoadingView(false);
    }
  };

  // Navigating back handlers
  const handleBackToHome = () => {
    setActiveCourse(null);
    setActiveYear(null);
    setExamYears([]);
    setActiveExamYear(null);
    setActiveSubject(null);
    setSubjectPapers([]);
    setActivePaper(null);
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCourse = () => {
    setActiveYear(null);
    setExamYears([]);
    setActiveExamYear(null);
    setActiveSubject(null);
    setSubjectPapers([]);
    setActivePaper(null);
    setView('course');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToYear = () => {
    setActiveExamYear(null);
    setActiveSubject(null);
    setSubjectPapers([]);
    setActivePaper(null);
    setView('year');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSubject = () => {
    setActiveSubject(null);
    setSubjectPapers([]);
    setActivePaper(null);
    setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToPaperList = () => {
    setActivePaper(null);
    setView('paper-list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render Admin Portal if route is #admin
  if (isAdmin) {
    return <AdminApp />;
  }

  // PUBLIC WEBSITE (Strictly zero admin links/buttons)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. Header with LBS Degree College logo and simple nav */}
      <Navbar
        settings={settings}
        onNavigateHome={handleBackToHome}
        onOpenInfoTab={(tab) => setInfoModalTab(tab)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {loadingInitial || loadingView ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Panel 1: Home View with colorful academic banner and available courses */}
            {view === 'home' && (
              <HomeView
                settings={settings}
                courses={courses}
                onSelectCourse={handleSelectCourse}
                onSelectPaper={handleSelectPaper}
                onSelectSubject={handleSearchSelectSubject}
              />
            )}

            {/* Panel 2: Course View (B.Sc. -> 1st Year, 2nd Year, 3rd Year) */}
            {view === 'course' && activeCourse && (
              <CourseView
                course={activeCourse}
                years={courseYears}
                onSelectYear={handleSelectYear}
                onBack={handleBackToHome}
              />
            )}

            {/* Panel 3: Year View (B.Sc. - 1st Year -> 2026, 2025, 2024...) */}
            {view === 'year' && activeCourse && activeYear && (
              <YearView
                course={activeCourse}
                year={activeYear}
                examYears={examYears}
                onSelectExamYear={handleSelectExamYear}
                onBack={handleBackToCourse}
              />
            )}

            {/* Panel 4: Subject View (B.Sc. - 1st Year - 2026 -> Mathematics, Physics, Chemistry, Biology...) */}
            {view === 'subject' && activeCourse && activeYear && activeExamYear && (
              <SubjectView
                course={activeCourse}
                year={activeYear}
                examYear={activeExamYear}
                subjects={yearSubjects}
                onSelectSubject={handleSelectSubject}
                onBack={handleBackToYear}
              />
            )}

            {/* Panel 5: Paper List View (Physics - 2026 -> Question papers list with [ View ]) */}
            {view === 'paper-list' && activeCourse && activeYear && activeExamYear && activeSubject && (
              <PaperListView
                course={activeCourse}
                year={activeYear}
                examYear={activeExamYear}
                subject={activeSubject}
                papers={subjectPapers}
                onSelectPaper={handleSelectPaper}
                onBack={handleBackToSubject}
              />
            )}

            {/* Panel 6: PDF Viewer View (B.Sc. Physics - 2026 -> Embedded PDF + Download PDF + View Full Screen) */}
            {view === 'paper' && activePaper && (
              <PaperDetailView
                paper={activePaper}
                settings={settings}
                onBack={handleBackToPaperList}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Footer with clean small links */}
      <Footer
        settings={settings}
        onOpenInfoTab={(tab) => setInfoModalTab(tab)}
      />

      {/* 4. Clean Modal for About, How to Use, Guidelines, Privacy, Disclaimer, Contact */}
      <InfoModal
        activeTab={infoModalTab}
        onClose={() => setInfoModalTab(null)}
        settings={settings}
      />
    </div>
  );
}
