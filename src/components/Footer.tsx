import React from 'react';
import { SiteSettings } from '../types';
import { InfoModalTab } from './InfoModal';

interface FooterProps {
  settings: SiteSettings;
  onOpenInfoTab: (tab: InfoModalTab) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenInfoTab,
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
      </div>
    </footer>
  );
};
