import React, { useState } from 'react';
import { Save, Loader2, CheckCircle2, Globe, Shield, DollarSign } from 'lucide-react';
import { SiteSettings } from '../../types';
import { api } from '../../api';

interface BrandingSeoTabProps {
  settings: SiteSettings;
  onRefresh: () => void;
}

export const BrandingSeoTab: React.FC<BrandingSeoTabProps> = ({ settings, onRefresh }) => {
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || '');
  const [faviconUrl, setFaviconUrl] = useState(settings.favicon_url || '');
  const [seoTitle, setSeoTitle] = useState(settings.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(settings.seo_description || '');
  const [seoKeywords, setSeoKeywords] = useState(settings.seo_keywords || '');

  // AdSense
  const [adBannerHeader, setAdBannerHeader] = useState(settings.ad_banner_header ?? true);
  const [adBannerPaper, setAdBannerPaper] = useState(settings.ad_banner_paper ?? true);
  const [adSenseClient, setAdSenseClient] = useState(settings.adsense_client || 'ca-pub-XXXXXXXXXXXXXXXX');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await api.adminUpdateSettings({
        logo_url: logoUrl.trim(),
        favicon_url: faviconUrl.trim(),
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        seo_keywords: seoKeywords.trim(),
        ad_banner_header: adBannerHeader,
        ad_banner_paper: adBannerPaper,
        adsense_client: adSenseClient.trim(),
      });
      setSuccess(true);
      onRefresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update branding & SEO settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 font-serif">Branding, SEO & Google AdSense</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure institutional logo, favicon, search engine optimization meta tags, and monetization slots.
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Branding and SEO configurations saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        {/* Visual Brand Assets */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm font-serif">Visual Brand Assets</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                College Crest / Logo Image URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/logo.png or https://..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Leave blank or set custom URL to display college crest in navigation bar.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Favicon URL</label>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="/favicon.ico or https://..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Displays in browser tabs and bookmark shortcuts.
              </p>
            </div>
          </div>
        </div>

        {/* SEO Metadata */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-indigo-700" />
            <h3 className="font-bold text-slate-900 text-sm font-serif">
              Search Engine Optimization (SEO) Configuration
            </h3>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Default SEO Page Title</label>
            <input
              type="text"
              required
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900 font-semibold"
            />
            <p className="text-[10px] text-slate-400 mt-1">Recommended length: 50-60 characters.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meta Description</label>
            <textarea
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Appears in Google search snippets. Recommended length: 140-160 characters.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Keywords</label>
            <input
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="comma-separated keywords..."
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {/* Monetization & Google AdSense */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm font-serif">
              Google AdSense & Advertisement Slots
            </h3>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">AdSense Publisher ID</label>
            <input
              type="text"
              value={adSenseClient}
              onChange={(e) => setAdSenseClient(e.target.value)}
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adBannerHeader}
                onChange={(e) => setAdBannerHeader(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              <span className="font-semibold text-slate-700">
                Enable Top Header Advertisement Banner (728x90 / responsive)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adBannerPaper}
                onChange={(e) => setAdBannerPaper(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              <span className="font-semibold text-slate-700">
                Enable Question Paper Detail Page Ad Slots (Above & Below Document Viewer)
              </span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Branding & SEO'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
