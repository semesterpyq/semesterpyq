import React, { useState } from 'react';
import {
  Settings,
  Globe,
  FileText,
  Palette,
  Languages,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { api } from '../../api';

interface SettingsTabProps {
  settings: SiteSettings;
  onRefreshSettings: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onRefreshSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'website' | 'papers' | 'appearance' | 'language'>('website');

  // Website settings
  const [siteName, setSiteName] = useState(settings.site_name || 'Semester (PYQs)');
  const [tagline, setTagline] = useState(settings.site_tagline || settings.tagline || 'Question Papers Archive');
  const [collegeAddress, setCollegeAddress] = useState(settings.college_address || settings.address || 'Academic Examination Center & Digital Repository');
  const [contactEmail, setContactEmail] = useState(settings.contact_email || 'examination@semesterpyqs.edu');
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || '+91 5262 222 345');
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || '');
  const [faviconUrl, setFaviconUrl] = useState(settings.favicon_url || '');
  const [aboutText, setAboutText] = useState(settings.about_text || '');

  // Question Papers settings
  const [maxPdfSizeMb, setMaxPdfSizeMb] = useState<number>(settings.max_pdf_size_mb || 25);
  const [defaultPaperStatus, setDefaultPaperStatus] = useState<'Published' | 'Draft'>(
    settings.default_paper_status || 'Published'
  );
  const [enableDownloads, setEnableDownloads] = useState<boolean>(
    settings.enable_downloads !== false
  );
  const [enableViews, setEnableViews] = useState<boolean>(settings.enable_views !== false);
  const [enableSearch, setEnableSearch] = useState<boolean>(settings.enable_search !== false);
  const [enableFilters, setEnableFilters] = useState<boolean>(settings.enable_filters !== false);

  // Appearance
  const [appearanceTheme, setAppearanceTheme] = useState<'light' | 'dark'>(
    settings.appearance_theme || 'light'
  );
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || 'blue');

  // Language
  const [siteLanguage, setSiteLanguage] = useState<'English' | 'Hindi'>(
    settings.site_language || 'English'
  );

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
        site_name: siteName.trim(),
        site_tagline: tagline.trim(),
        tagline: tagline.trim(),
        college_address: collegeAddress.trim(),
        address: collegeAddress.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        logo_url: logoUrl.trim(),
        favicon_url: faviconUrl.trim(),
        about_text: aboutText.trim(),

        max_pdf_size_mb: Number(maxPdfSizeMb),
        default_paper_status: defaultPaperStatus,
        enable_downloads: enableDownloads,
        enable_views: enableViews,
        enable_search: enableSearch,
        enable_filters: enableFilters,

        appearance_theme: appearanceTheme,
        primary_color: primaryColor,
        site_language: siteLanguage,
      });

      setSuccessMsg(true);
      onRefreshSettings();
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-slate-200">
            <Settings className="w-3.5 h-3.5" />
            <span>Institutional Configuration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
            Portal Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage website identity, PDF question paper policies, appearance themes, and bilingual languages.
          </p>
        </div>

        {successMsg && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Changes Saved!</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sub-tab Pills */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('website')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'website'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Website Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('papers')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'papers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Question Papers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('appearance')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'appearance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Appearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('language')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'language'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>Language (EN / HI)</span>
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Sub-tab 1: Website Details */}
        {activeSubTab === 'website' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
              College & Website Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website / College Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tagline / Sub-heading
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={collegeAddress}
                  onChange={(e) => setCollegeAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Favicon URL (Optional)
                </label>
                <input
                  type="text"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://.../favicon.ico"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  About Portal Description
                </label>
                <textarea
                  rows={3}
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Question Papers Settings */}
        {activeSubTab === 'papers' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
              Question Paper Controls & Constraints
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum PDF File Upload Size (MB)
                </label>
                <input
                  type="number"
                  value={maxPdfSizeMb}
                  onChange={(e) => setMaxPdfSizeMb(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default: 25 MB per examination paper PDF.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Paper Status on Upload
                </label>
                <select
                  value={defaultPaperStatus}
                  onChange={(e) => setDefaultPaperStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="Published">Published (Live immediately)</option>
                  <option value="Draft">Draft (Requires admin approval)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">Feature Switches</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableDownloads}
                    onChange={(e) => setEnableDownloads(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable PDF Downloads</div>
                    <div className="text-[11px] text-slate-500">Allow students to download PDFs directly</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableViews}
                    onChange={(e) => setEnableViews(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Show Views & Downloads Counter</div>
                    <div className="text-[11px] text-slate-500">Display view and download counts publicly</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSearch}
                    onChange={(e) => setEnableSearch(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable Live Search</div>
                    <div className="text-[11px] text-slate-500">Fast auto-suggest search bar on home view</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFilters}
                    onChange={(e) => setEnableFilters(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable Multi-Level Filters</div>
                    <div className="text-[11px] text-slate-500">Filter by Course, Year, and Subject</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 3: Appearance */}
        {activeSubTab === 'appearance' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
              Theme & Branding Colors
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Theme Mode
                </label>
                <div className="flex items-center space-x-3 pt-1">
                  <label className={`flex items-center space-x-2 px-4 py-2 rounded-xl border cursor-pointer ${appearanceTheme === 'light' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <input
                      type="radio"
                      name="themeMode"
                      value="light"
                      checked={appearanceTheme === 'light'}
                      onChange={() => setAppearanceTheme('light')}
                    />
                    <span>Light Mode (Academic Standard)</span>
                  </label>

                  <label className={`flex items-center space-x-2 px-4 py-2 rounded-xl border cursor-pointer ${appearanceTheme === 'dark' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <input
                      type="radio"
                      name="themeMode"
                      value="dark"
                      checked={appearanceTheme === 'dark'}
                      onChange={() => setAppearanceTheme('dark')}
                    />
                    <span>Dark Mode</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Academic Color Palette
                </label>
                <select
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="blue">Classic Royal Blue (LBS Standard)</option>
                  <option value="indigo">Deep Indigo</option>
                  <option value="emerald">Academic Emerald</option>
                  <option value="slate">Sleek Modern Slate</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 4: Language */}
        {activeSubTab === 'language' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
              Portal Language Settings
            </h2>
            <p className="text-xs text-slate-500">
              Select standard institutional language support (English and Hindi).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer ${siteLanguage === 'English' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <input
                  type="radio"
                  name="siteLang"
                  value="English"
                  checked={siteLanguage === 'English'}
                  onChange={() => setSiteLanguage('English')}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-bold">English (Default)</div>
                  <div className="text-xs text-slate-500 font-normal mt-0.5">
                    Universal academic and university examination standard
                  </div>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer ${siteLanguage === 'Hindi' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <input
                  type="radio"
                  name="siteLang"
                  value="Hindi"
                  checked={siteLanguage === 'Hindi'}
                  onChange={() => setSiteLanguage('Hindi')}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-bold">हिंदी (Hindi)</div>
                  <div className="text-xs text-slate-500 font-normal mt-0.5">
                    उत्तर प्रदेश राज्य विश्वविद्यालय परीक्षा माध्यम
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-7 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
