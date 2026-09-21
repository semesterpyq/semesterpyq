import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Mail, AlertTriangle, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { AdminUser } from '../../types';
import { api } from '../../api';

interface SecurityTabProps {
  admin: AdminUser | null;
  onAdminUpdated: (admin: AdminUser) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ admin, onAdminUpdated }) => {
  const [email, setEmail] = useState(admin?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword && newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const res = await api.adminChangeCredentials({
        email: email.trim(),
        currentPassword,
        newPassword: newPassword || undefined,
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (res.admin) {
        onAdminUpdated(res.admin);
      }
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update administrative credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 font-serif">
          Sole Institutional Owner & Security Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Update the institutional master credentials. There is strictly only ONE administrator account permitted by college policy.
        </p>
      </div>

      {/* Architecture Enforcement Notice */}
      <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Lock className="w-4 h-4" />
          <span>Strict Single-Admin Architecture Active</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Public registration, multiple sub-administrators, and user signups are permanently disabled in this deployment. All database operations and repository modifications are authorized strictly under this single master account.
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Master credentials updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Owner Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block font-semibold text-slate-700 mb-1">Current Password (Required to authorize changes)</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password (Optional)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep unchanged"
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{saving ? 'Updating...' : 'Update Master Security Credentials'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
