import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { api } from '../../api';

interface UsersTabProps {
  currentAdmin: AdminUser;
  onAdminUpdated: (updated: AdminUser) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentAdmin, onAdminUpdated }) => {
  const [email] = useState(currentAdmin?.email || 'Ramishkji@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Current password is required to make administrative changes.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter a new password to rotate credentials.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.adminChangeCredentials({
        email: currentAdmin?.email || email,
        currentPassword,
        newPassword: newPassword,
      });

      setSuccessMsg('Administrator credentials successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onAdminUpdated(res.admin);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="inline-flex items-center space-x-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-purple-100">
          <Users className="w-3.5 h-3.5" />
          <span>Access & Security</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
          Administrator Accounts & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage institutional administrator access, authenticate sessions, and rotate master credentials.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
          Active Administrative Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Email</span>
            </div>
            <div className="font-bold text-slate-900 text-sm truncate">
              {currentAdmin.email}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Role / Privilege</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Single Owner / Master Admin
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Active Session</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Secured (PBKDF2 SHA-512)
            </div>
          </div>
        </div>
      </div>

      {/* Change Credentials Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-serif border-b border-slate-100 pb-3">
          Update Institutional Credentials
        </h2>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Authorized Administrator Email
              </label>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Strict Single Owner (Locked)
              </span>
            </div>
            <input
              type="email"
              value={email}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed select-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Only authorized institutional administrator account can access this administration panel.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password to authorize changes"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Updating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
