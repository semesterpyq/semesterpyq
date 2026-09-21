import React, { useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';
import { SiteSettings } from '../types';
import { InfoModalTab } from './InfoModal';

interface NavbarProps {
  settings: SiteSettings;
  onNavigateHome: () => void;
  onOpenInfoTab: (tab: InfoModalTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onNavigateHome,
  onOpenInfoTab,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: InfoModalTab) => {
    setMobileMenuOpen(false);
    if (!tab) {
      onNavigateHome();
    } else {
      onOpenInfoTab(tab);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Semester (PYQs) Logo & Brand */}
        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-3 text-left group focus:outline-none cursor-pointer"
          aria-label="Home"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs ring-2 ring-blue-100 bg-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <img
              src={settings.logo_url || '/assets/logos/logo.jpg'}
              alt={settings.site_name || 'Semester (PYQs)'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to text badge if image cannot load
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors font-serif">
              {settings.site_name ? (
                settings.site_name.includes('(PYQs)') ? (
                  <>
                    {settings.site_name.replace('(PYQs)', '').trim()}{' '}
                    <span className="text-blue-600 font-sans font-extrabold text-sm sm:text-base">
                      (PYQs)
                    </span>
                  </>
                ) : (
                  settings.site_name
                )
              ) : (
                <>
                  Semester <span className="text-blue-600 font-sans font-extrabold text-sm sm:text-base">(PYQs)</span>
                </>
              )}
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
              {settings.tagline || settings.site_tagline || 'Question Papers Archive'}
            </span>
          </div>
        </button>

        {/* Simple Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-7 text-xs sm:text-sm font-medium text-slate-600">
          <button
            onClick={() => handleNavClick(null)}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick(null)}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Courses
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top duration-150">
          <button
            onClick={() => handleNavClick(null)}
            className="w-full text-left py-2 px-3 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick(null)}
            className="w-full text-left py-2 px-3 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Courses
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="w-full text-left py-2 px-3 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="w-full text-left py-2 px-3 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>
      )}
    </header>
  );
};
