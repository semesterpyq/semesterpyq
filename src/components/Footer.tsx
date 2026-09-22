import React from 'react';
import { Lock } from 'lucide-react';
import { SiteSettings } from '../types';
import { InfoModalTab } from './InfoModal';

interface FooterProps {
  settings: SiteSettings;
  onNavigateHome?: () => void;
  onOpenInfoTab: (tab: InfoModalTab) => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenInfoTab,
  onOpenAdmin,
}) => {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 py-8 mt-16 text-center text-xs text-slate-500">
      <div className="max-w-4xl mx-auto px-4 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
          <button
            onClick={() => onOpenInfoTab('about')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            About
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onOpenInfoTab('how-to-use')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            How to Use
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onOpenInfoTab('guidelines')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Guidelines
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onOpenInfoTab('contact')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>

        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <span>© {new Date().getFullYear()} {settings.site_name || 'Semester (PYQs)'}. All rights reserved.</span>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-slate-300 hover:text-slate-500 transition-colors p-0.5 rounded cursor-pointer opacity-30 hover:opacity-100"
              title="Staff Access"
              aria-label="Staff Access"
            >
              <Lock className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
