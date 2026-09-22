import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
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
    const token = localStorage.getItem('lbs_admin_token');
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
        localStorage.removeItem('lbs_admin_token');
        setAdminUser(null);
      }
    } catch {
      localStorage.removeItem('lbs_admin_token');
      setAdminUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    checkAuth();
  }, [loadSettings, checkAuth]);

  // Set Document Title
  useEffect(() => {
    document.title = `Admin Control Panel | ${settings.site_name || 'Semester (PYQs)'}`;
  }, [settings]);

  const handleLoginSuccess = (admin: AdminUser) => {
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
      localStorage.removeItem('lbs_admin_token');
      setAdminUser(null);
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
