import React, { useState } from 'react';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { SiteSettings } from '../../types';
import { api } from '../../api';

interface HomepageTabProps {
  settings: SiteSettings;
  onRefresh: () => void;
}

export const HomepageTab: React.FC<HomepageTabProps> = ({ settings, onRefresh }) => {
  const [siteName, setSiteName] = useState(settings.site_name || '');
  const [siteTagline, setSiteTagline] = useState(settings.site_tagline || '');
  const [heroTitle, setHeroTitle] = useState(settings.hero_title || '');
  const [heroSubtitle, setHeroSubtitle] = useState(settings.hero_subtitle || '');
  const [announcementNotice, setAnnouncementNotice] = useState(settings.announcement_notice || '');
  const [aboutText, setAboutText] = useState(settings.about_text || '');
  const [contactEmail, setContactEmail] = useState(settings.contact_email || '');
  const [contactPhone, setContactPhone] = useState(settings.contact_phone || '');
  const [address, setAddress] = useState(settings.address || '');

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
        site_name: siteName.trim(),
        site_tagline: siteTagline.trim(),
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        announcement_notice: announcementNotice.trim(),
        about_text: aboutText.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
      });
      setSuccess(true);
      onRefresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update homepage settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 font-serif">Homepage & Institutional Content</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Customize the landing banner, hero headlines, scrolling announcements ticker, and college contact details.
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Homepage content updated successfully! Public website reflected immediately.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        {/* Notice Ticker */}
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-800">
            Top Announcement Notice (Scrolling Ticker on Public Website)
          </label>
          <input
            type="text"
            value={announcementNotice}
            onChange={(e) => setAnnouncementNotice(e.target.value)}
            placeholder="Official examination notice text..."
            className="w-full p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium"
          />
          <p className="text-[11px] text-slate-400">
            Appears prominently in amber notification banner at the top of the home page.
          </p>
        </div>

        {/* Hero Banner Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm font-serif">Hero Section Customization</h3>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Main Title</label>
            <input
              type="text"
              required
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Subtitle</label>
            <textarea
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {/* Institutional Identity */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm font-serif">Institutional Identity</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institution Name</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Site Tagline / Subheading</label>
              <input
                type="text"
                value={siteTagline}
                onChange={(e) => setSiteTagline(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">About the Question Paper Archive</label>
            <textarea
              rows={3}
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {/* Contact info in footer */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm font-serif">Contact Information (Footer & Inquiries)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Examination Helpline Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Homepage Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
