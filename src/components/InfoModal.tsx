import React from 'react';
import { X, Info, HelpCircle, FileCheck, ShieldAlert, Lock, Mail, Phone, MapPin } from 'lucide-react';
import { SiteSettings } from '../types';

export type InfoModalTab = 'about' | 'how-to-use' | 'guidelines' | 'privacy' | 'disclaimer' | 'contact' | null;

interface InfoModalProps {
  activeTab: InfoModalTab;
  onClose: () => void;
  settings: SiteSettings;
}

export const InfoModal: React.FC<InfoModalProps> = ({ activeTab, onClose, settings }) => {
  if (!activeTab) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">About Exam Repository</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              The {settings.site_name || 'Semester (PYQs)'} Question Papers Archive is an official digital initiative dedicated to providing undergraduate students with unrestricted, free access to authentic past examination question papers.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              Our aim is to support academic preparation, facilitate structured revision, and help students familiarize themselves with university question patterns, mark allocations, and examination formats across all accredited degree programs.
            </p>
          </div>
        );

      case 'how-to-use':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-emerald-600">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">How to Use</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p><strong className="text-slate-900 font-medium">Select Your Course:</strong> Choose your degree (B.Sc., B.A., B.Com., BCA) from the Available Courses cards on the homepage.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p><strong className="text-slate-900 font-medium">Select Academic Year:</strong> Choose 1st Year, 2nd Year, or 3rd Year.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p><strong className="text-slate-900 font-medium">Select Exam Year:</strong> Pick the examination session (e.g., 2026, 2025, 2024).</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p><strong className="text-slate-900 font-medium">Select Subject & Paper:</strong> Click your subject to view question papers, then click <span className="font-semibold text-blue-600">View PDF</span> or <span className="font-semibold text-blue-600">Download</span>.</p>
              </div>
            </div>
          </div>
        );

      case 'guidelines':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">Academic Guidelines</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600 list-disc list-inside leading-relaxed">
              <li>All question papers in this repository are strictly for private academic study and classroom revision.</li>
              <li>Students should refer to current university syllabi to cross-verify any changes in curriculum or marking schemes.</li>
              <li>Commercial reproduction, unauthorized re-publishing, or mass distribution of these papers without institutional authorization is strictly prohibited.</li>
            </ul>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-purple-600">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">Privacy Policy</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              We respect your privacy. Accessing, previewing, and downloading question papers does not require student registration, login credentials, or personal information.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              Anonymous usage metrics (such as view counts and download tallies) are maintained strictly to assess syllabus interest and maintain server performance.
            </p>
          </div>
        );

      case 'disclaimer':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">Disclaimer</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              The question papers archived on this portal are compiled from historical university examinations for educational reference only. While utmost care is taken to ensure authenticity, {settings.site_name || 'Semester (PYQs)'} assumes no liability for printing discrepancies or obsolete syllabus items.
            </p>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">Contact Examination Cell</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block">Examination Cell Email</span>
                  <a href={`mailto:${settings.contact_email || 'examination@semesterpyqs.edu'}`} className="text-blue-600 hover:underline font-medium">
                    {settings.contact_email || 'examination@semesterpyqs.edu'}
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block">Helpdesk Helpline</span>
                  <span className="text-slate-800 font-medium">{settings.contact_phone || '+91 522 2345678'}</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block">Campus Address</span>
                  <span className="text-slate-800 font-medium">{settings.college_address || settings.address || 'Academic Examination Center & Digital Repository'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-7 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {renderContent()}

        <div className="mt-6 pt-4 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
