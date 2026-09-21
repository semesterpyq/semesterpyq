import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Loader2,
  KeyRound,
  ShieldCheck,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  RotateCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api, setAdminToken } from '../api';
import { AdminUser } from '../types';

interface AdminLoginViewProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onCancel?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess, onCancel }) => {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('Ramishkji@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [challengeId, setChallengeId] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('Ramishkji@gmail.com');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resending, setResending] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Focus OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    if (!password) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.adminLoginStep1({
        email: cleanEmail,
        password,
      });

      if (res.requiresOtp && res.challengeId) {
        setChallengeId(res.challengeId);
        setMaskedEmail(res.sentToEmail || res.maskedEmail || 'Ramishkji@gmail.com');
        setResendCooldown(res.resendCooldown || 60);
        setOtp('');
        setStep('otp');
        setInfoMsg(`A 6-digit verification code has been dispatched to Ramishkji@gmail.com.`);
      } else if (res.token && res.admin) {
        setAdminToken(res.token);
        window.history.pushState({}, '', '/admin/dashboard');
        onLoginSuccess(res.admin);
      } else if (res.error) {
        setError(res.error);
      } else {
        setError('Authentication failed. Please verify credentials and email server settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials and server configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP Verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.adminVerifyOtp({
        challengeId,
        otp: cleanOtp,
      });

      if (res.success && res.token && res.admin) {
        setAdminToken(res.token);
        window.history.pushState({}, '', '/admin/dashboard');
        onLoginSuccess(res.admin);
      } else if (res.error) {
        setError(res.error);
      } else {
        setError('Verification failed. The code may be invalid or expired.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending || !challengeId) return;

    setError(null);
    setInfoMsg(null);
    setResending(true);

    try {
      const res = await api.adminResendOtp({ challengeId });
      if (res.success) {
        setResendCooldown(res.resendCooldown || 60);
        setInfoMsg(res.message || 'A fresh 6-digit verification code has been dispatched to Ramishkji@gmail.com.');
        setOtp('');
        otpInputRef.current?.focus();
      } else {
        setError(res.error || 'Failed to resend verification code. Please check SMTP settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setError(null);
    setInfoMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      {onCancel && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Website</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-xl ring-4 ring-blue-500/20 mb-4 bg-slate-900 flex items-center justify-center border border-blue-500/30">
          <img
            src="/assets/logos/logo.jpg"
            alt="Semester (PYQs) Logo"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
          Institutional Administrator Portal
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Semester (PYQs) • Examination Repository Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {/* Feedback messages */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 'credentials' ? (
            /* STEP 1: CREDENTIALS FORM */
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Authorized Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ramishkji@gmail.com"
                    autoComplete="email"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Access restricted strictly to Ramishkji@gmail.com.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Administrator Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 shadow-md cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials & Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to OTP Verification</span>
                    <ShieldCheck className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION FORM */
            <form className="space-y-5" onSubmit={handleOtpSubmit}>
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="inline-flex p-3 bg-blue-500/10 text-blue-400 rounded-full mb-3 border border-blue-500/20">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">2-Step OTP Verification</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Enter the 6-digit verification code sent to:
                </p>
                <p className="text-xs font-mono font-semibold text-blue-400 mt-0.5">
                  {maskedEmail}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Code expires in 5 minutes. Single use only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                      if (val.length === 6) {
                        // Auto-focus handled
                      }
                    }}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-mono font-bold tracking-[0.6em] py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.trim().length !== 6}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Enter Dashboard</span>
                    <ShieldCheck className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Resend and Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="text-slate-400 hover:text-slate-200 inline-flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || resending}
                  onClick={handleResendOtp}
                  className="text-blue-400 hover:text-blue-300 disabled:text-slate-500 inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Institutional Policy Notice */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Institutional Security</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Authorized administrator dashboard access for Ramishkji@gmail.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
