import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, clearAdminToken, getAdminToken, getAdminSessionRemainingMs } from './api';
import { AdminLoginView } from './admin/AdminLoginView';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminUser, SiteSettings } from './types';
import { Loader2 } from 'lucide-react';

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

interface AdminAppProps {
  onExit?: () => void;
}

export default function AdminApp({ onExit }: AdminAppProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleExit = () => {
    window.location.hash = '';
    if (onExit) {
      onExit();
    } else {
      window.location.href = '/';
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const publicSettings = await api.getSettings();
      if (publicSettings) {
        setSettings(publicSettings);
      }
    } catch {
      // Use defaults if fetch fails
    }
  }, []);

  const checkAuth = useCallback(async () => {
    setCheckingAuth(true);
    const token = getAdminToken();
    if (!token) {
      setAdminUser(null);
      setCheckingAuth(false);
      return;
    }

    try {
      const profile = await api.adminGetProfile();
      if (profile && profile.email) {
        setAdminUser(profile);
      } else {
        clearAdminToken();
        setAdminUser(null);
      }
    } catch {
      clearAdminToken();
      setAdminUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    checkAuth();
  }, [loadSettings, checkAuth]);

  // Track user activity & check for 1-hour session expiration
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    // Periodic 1-hour session watcher (checks every 5 seconds)
    const interval = setInterval(() => {
      if (adminUser) {
        const token = getAdminToken();
        const remainingMs = getAdminSessionRemainingMs();
        
        // Auto log out if 1 hour has elapsed
        if (!token || remainingMs <= 0) {
          clearAdminToken();
          setAdminUser(null);
          setSessionExpiredNotice('Your administrator session has automatically expired after 1 hour of security timeout. Please log in again.');
          try {
            api.adminLogout().catch(() => {});
          } catch {}
          window.history.replaceState({}, '', '/admin.html');
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, [adminUser]);

  // Set Document Title
  useEffect(() => {
    document.title = `Admin Control Panel | ${settings.site_name || 'Semester (PYQs)'}`;
  }, [settings]);

  const handleLoginSuccess = (admin: AdminUser) => {
    setSessionExpiredNotice(null);
    setAdminUser(admin);
    if (window.location.pathname.toLowerCase() === '/admin.html') {
      window.history.replaceState({}, '', '/admin/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      clearAdminToken();
      setAdminUser(null);
      setSessionExpiredNotice(null);
      window.history.replaceState({}, '', '/admin.html');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg ring-4 ring-blue-500/20 font-serif font-bold text-base tracking-wider animate-pulse">
          PYQ
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Verifying Institutional Security Credentials...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <AdminLoginView
        onLoginSuccess={handleLoginSuccess}
        onCancel={handleExit}
        sessionExpiredNotice={sessionExpiredNotice}
      />
    );
  }

  return (
    <AdminDashboard
      admin={adminUser}
      settings={settings}
      onRefreshSettings={loadSettings}
      onLogout={handleLogout}
      onViewPublicSite={handleExit}
    />
  );
}
