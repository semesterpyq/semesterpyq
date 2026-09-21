import React, { useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  Calendar,
  Save,
  Loader2,
  Code,
  Layout,
  Info,
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { api } from '../../api';

interface AdvertisementsTabProps {
  settings: SiteSettings;
  onRefreshSettings: () => void;
}

export const AdvertisementsTab: React.FC<AdvertisementsTabProps> = ({
  settings,
  onRefreshSettings,
}) => {
  // 1. Homepage Ad
  const [adHomeEnabled, setAdHomeEnabled] = useState(settings.ad_home_enabled !== false);
  const [adHomeCode, setAdHomeCode] = useState(
    settings.ad_home_code ||
      '<div class="p-4 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl text-xs">Sample Responsive Homepage Ad (728x90 / Mobile Banner)</div>'
  );
  const [adHomePlacement, setAdHomePlacement] = useState(
    settings.ad_home_placement || 'below_courses'
  );
  const [adHomeTarget, setAdHomeTarget] = useState<'all' | 'mobile' | 'desktop'>(
    settings.ad_home_target || 'all'
  );

  // 2. Course Page Ad
  const [adCourseEnabled, setAdCourseEnabled] = useState(settings.ad_course_enabled || false);
  const [adCourseCode, setAdCourseCode] = useState(
    settings.ad_course_code ||
      '<div class="p-4 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl text-xs">Course Explorer Ad Unit</div>'
  );
  const [adCoursePlacement, setAdCoursePlacement] = useState(
    settings.ad_course_placement || 'below_years'
  );
  const [adCourseTarget, setAdCourseTarget] = useState<'all' | 'mobile' | 'desktop'>(
    settings.ad_course_target || 'all'
  );

  // 3. Question Paper Page Ad
  const [adPaperEnabled, setAdPaperEnabled] = useState(settings.ad_paper_enabled !== false);
  const [adPaperCode, setAdPaperCode] = useState(
    settings.ad_paper_code ||
      '<div class="p-3 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl text-xs">Official Institutional Sponsor Banner</div>'
  );
  const [adPaperPlacement, setAdPaperPlacement] = useState(
    settings.ad_paper_placement || 'above_viewer'
  );
  const [adPaperTarget, setAdPaperTarget] = useState<'all' | 'mobile' | 'desktop'>(
    settings.ad_paper_target || 'all'
  );

  // 4. Download-Page Ad
  const [adDownloadEnabled, setAdDownloadEnabled] = useState(settings.ad_download_enabled || false);
  const [adDownloadCode, setAdDownloadCode] = useState(
    settings.ad_download_code ||
      '<div class="p-4 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl text-xs">Download Page Sponsor Unit</div>'
  );
  const [adDownloadPlacement, setAdDownloadPlacement] = useState(
    settings.ad_download_placement || 'below_viewer'
  );
  const [adDownloadTarget, setAdDownloadTarget] = useState<'all' | 'mobile' | 'desktop'>(
    settings.ad_download_target || 'all'
  );

  // Campaign Dates
  const [adsStartDate, setAdsStartDate] = useState(settings.ads_start_date || '');
  const [adsEndDate, setAdsEndDate] = useState(settings.ads_end_date || '');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      await api.adminUpdateSettings({
        ad_home_enabled: adHomeEnabled,
        ad_home_code: adHomeCode,
        ad_home_placement: adHomePlacement,
        ad_home_target: adHomeTarget,

        ad_course_enabled: adCourseEnabled,
        ad_course_code: adCourseCode,
        ad_course_placement: adCoursePlacement,
        ad_course_target: adCourseTarget,

        ad_paper_enabled: adPaperEnabled,
        ad_paper_code: adPaperCode,
        ad_paper_placement: adPaperPlacement,
        ad_paper_target: adPaperTarget,

        ad_download_enabled: adDownloadEnabled,
        ad_download_code: adDownloadCode,
        ad_download_placement: adDownloadPlacement,
        ad_download_target: adDownloadTarget,

        ads_start_date: adsStartDate,
        ads_end_date: adsEndDate,
      });

      setSuccessMsg(true);
      onRefreshSettings();
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save advertisement configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-amber-200">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Monetization & Banners</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
            Advertisements Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure, toggle, and place responsive ads across the portal. All ads are strictly labeled "Advertisement" and never mimic navigation or download buttons.
          </p>
        </div>

        {successMsg && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Compliance Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Ad Policy & User Protection Rules Active</p>
            <p className="text-blue-700 leading-relaxed">
              1. View & Download PDF buttons are 100% direct with zero waiting times.<br />
              2. Every ad is clearly labeled "Advertisement" and visually boxed away from academic buttons.<br />
              3. Ads automatically fit responsive viewports on Mobile, Tablet, and Desktop.
            </p>
          </div>
        </div>

        {/* 1. Homepage Advertisement */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                1. Homepage Advertisement
              </h2>
              <p className="text-xs text-slate-500">
                Banner displayed directly below the "Available Courses" grid on the homepage.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={adHomeEnabled}
                onChange={(e) => setAdHomeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700">
                {adHomeEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ad Placement
              </label>
              <select
                value={adHomePlacement}
                onChange={(e) => setAdHomePlacement(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              >
                <option value="below_courses">Directly Below Available Courses</option>
                <option value="below_banner">Below Hero Academic Banner</option>
                <option value="bottom_page">Footer Top Banner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Device Targeting
              </label>
              <select
                value={adHomeTarget}
                onChange={(e) => setAdHomeTarget(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              >
                <option value="all">Both Mobile & Desktop</option>
                <option value="mobile">Mobile & Tablet Only</option>
                <option value="desktop">Desktop Only</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ad Code (AdSense snippet, custom HTML, or image banner)
              </label>
              <textarea
                rows={3}
                value={adHomeCode}
                onChange={(e) => setAdHomeCode(e.target.value)}
                placeholder="<!-- Paste Google AdSense or HTML ad code here -->"
                className="w-full font-mono text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 2. Question Paper Page Ads */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                2. Question Paper Page Advertisement
              </h2>
              <p className="text-xs text-slate-500">
                Responsive ad banners above or below the official PDF viewer.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={adPaperEnabled}
                onChange={(e) => setAdPaperEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700">
                {adPaperEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ad Placement
              </label>
              <select
                value={adPaperPlacement}
                onChange={(e) => setAdPaperPlacement(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              >
                <option value="above_viewer">Above PDF Viewer (with spacious padding)</option>
                <option value="below_viewer">Below PDF Viewer</option>
                <option value="both">Both Above and Below PDF Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Device Targeting
              </label>
              <select
                value={adPaperTarget}
                onChange={(e) => setAdPaperTarget(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              >
                <option value="all">Both Mobile & Desktop</option>
                <option value="mobile">Mobile & Tablet Only</option>
                <option value="desktop">Desktop Only</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ad Code
              </label>
              <textarea
                rows={3}
                value={adPaperCode}
                onChange={(e) => setAdPaperCode(e.target.value)}
                placeholder="<!-- Paste Google AdSense or HTML ad code here -->"
                className="w-full font-mono text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 3. Course Page & Download Page Ads */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              3. Course & Download Page Ads
            </h2>
            <p className="text-xs text-slate-500">
              Optional banners on Course exploration and download pages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course Page Ad Toggle */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Course Page Ad</span>
                <input
                  type="checkbox"
                  checked={adCourseEnabled}
                  onChange={(e) => setAdCourseEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                />
              </div>
              <textarea
                rows={2}
                value={adCourseCode}
                onChange={(e) => setAdCourseCode(e.target.value)}
                className="w-full font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            {/* Download Page Ad Toggle */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Download Page Ad</span>
                <input
                  type="checkbox"
                  checked={adDownloadEnabled}
                  onChange={(e) => setAdDownloadEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                />
              </div>
              <textarea
                rows={2}
                value={adDownloadCode}
                onChange={(e) => setAdDownloadCode(e.target.value)}
                className="w-full font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Start Date
              </label>
              <input
                type="date"
                value={adsStartDate}
                onChange={(e) => setAdsStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign End Date
              </label>
              <input
                type="date"
                value={adsEndDate}
                onChange={(e) => setAdsEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Advertisement Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Advertisement Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
