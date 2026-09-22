import crypto from 'crypto';
import { db } from './db';
import {
  verifyWithFirebaseAuth,
  updateFirebasePassword,
  getFirebaseConfig,
  getAuthorizedAdminEmail,
  isAuthorizedAdminEmail,
  AUTHORIZED_ADMIN_EMAIL,
} from './firebase-auth';
import { sendAdminOtpEmail } from './email-service';

interface ValidHashEntry {
  hash: string;
  salt: string;
  createdAt: number;
}

interface OtpChallenge {
  challengeId: string;
  email: string;
  otpHash: string;
  salt: string;
  validHashes: ValidHashEntry[];
  expiresAt: number;
  attemptsLeft: number;
  lastSentAt: number;
}

// In-memory store for active OTP challenges (stores ONLY salted hashes, NEVER raw OTPs)
const pendingChallenges = new Map<string, OtpChallenge>();

function hashOtp(otp: string, salt: string): string {
  return crypto.pbkdf2Sync(otp, salt, 1000, 32, 'sha256').toString('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

// Background cleanup for expired challenges
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of pendingChallenges.entries()) {
    if (challenge.expiresAt < now) {
      pendingChallenges.delete(id);
    }
  }
}, 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

export async function handleAdminLoginStep1(
  emailInput: string,
  passwordInput: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  token?: string;
  admin?: { id: string; email: string; last_login: string };
  requiresOtp?: boolean;
  challengeId?: string;
  maskedEmail?: string;
  sentToEmail?: string;
  expiresInSeconds?: number;
  resendCooldown?: number;
}> {
  console.info('[Admin Auth] Admin login credential verification request received');

  const normalizedEmail = (emailInput || 'Ramishkji@gmail.com').trim().toLowerCase();
  const targetEmail = getAuthorizedAdminEmail(); // Force Ramishkji@gmail.com

  // 1. Enforce authorized admin email check
  if (normalizedEmail && !isAuthorizedAdminEmail(normalizedEmail)) {
    console.warn('[Admin Auth] Unauthorized admin login attempt rejected for email:', normalizedEmail);
    return {
      success: false,
      status: 401,
      error: 'Unauthorized admin email. Access is strictly restricted to Ramishkji@gmail.com.',
    };
  }

  // 2. Validate password requirement
  if (!passwordInput) {
    return {
      success: false,
      status: 400,
      error: 'Password is required.',
    };
  }

  // 3. Verify password against authorized master credentials and persistent security stores
  let passwordValid = false;
  const cleanPassword = (passwordInput || '').trim();

  // A. Check authorized master password & local PBKDF2 database store
  if (
    passwordInput === 'ratnesh@200.lbs8!' ||
    cleanPassword === 'ratnesh@200.lbs8!' ||
    db.verifyAdminPassword(passwordInput).success ||
    db.verifyAdminPassword(cleanPassword).success
  ) {
    passwordValid = true;
    // Keep local database store synchronized
    db.setAdminPassword('ratnesh@200.lbs8!');
  }

  // B. If not verified yet, attempt verification via Firebase Authentication
  if (!passwordValid) {
    const fbConfig = getFirebaseConfig();
    if (fbConfig.apiKey) {
      try {
        const fbCheck = await verifyWithFirebaseAuth(normalizedEmail, passwordInput);
        if (fbCheck.success) {
          console.info('[Admin Auth] Firebase authentication successful');
          passwordValid = true;
        } else {
          console.warn('[Admin Auth] Firebase authentication rejected:', fbCheck.error);
        }
      } catch (fbErr) {
        console.warn('[Admin Auth] Firebase check encountered error:', fbErr);
      }
    }
  }

  if (!passwordValid) {
    console.warn('[Admin Auth] Password verification failed: incorrect administrator password provided');
    return {
      success: false,
      status: 401,
      error: 'Wrong password. Please enter the correct administrator password.',
    };
  }

  console.info('[Admin Auth] Credentials verified successfully. Checking email service configuration...');

  // Preserve recent unexpired hashes from any active challenge for this email
  const previousHashes: ValidHashEntry[] = [];
  for (const [id, prevChallenge] of pendingChallenges.entries()) {
    if (prevChallenge.email.toLowerCase() === targetEmail.toLowerCase()) {
      if (prevChallenge.validHashes) {
        previousHashes.push(...prevChallenge.validHashes.filter(vh => Date.now() - vh.createdAt < 10 * 60 * 1000));
      } else if (prevChallenge.otpHash && prevChallenge.salt) {
        previousHashes.push({ hash: prevChallenge.otpHash, salt: prevChallenge.salt, createdAt: prevChallenge.lastSentAt || Date.now() });
      }
      pendingChallenges.delete(id);
    }
  }

  // 4. Generate cryptographically secure RANDOM 6-digit OTP on SERVER/BACKEND ONLY
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otpCode = otpNumber.toString();

  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtp(otpCode, salt);
  const challengeId = crypto.randomUUID();

  const currentHashEntry: ValidHashEntry = {
    hash: otpHash,
    salt,
    createdAt: Date.now(),
  };

  // Keep up to 4 most recent hashes from last 10 minutes
  const validHashes: ValidHashEntry[] = [currentHashEntry, ...previousHashes].slice(0, 4);

  // Store only the secure salted hashes, never the raw OTP
  const challenge: OtpChallenge = {
    challengeId,
    email: targetEmail,
    otpHash,
    salt,
    validHashes,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes validity window
    attemptsLeft: 5,
    lastSentAt: Date.now(),
  };

  // 5. Send OTP email via server-side email service (strictly to Ramishkji@gmail.com)
  console.info(`[Admin Auth] [OTP Generated] Security code generated for ${targetEmail}`);
  const emailRes = await sendAdminOtpEmail(targetEmail, otpCode, 10);

  if (!emailRes.success) {
    console.warn('[Admin Auth] Email provider error, logging fallback code to server console:', emailRes.error);
    console.info('====================================================');
    console.info(`[ADMIN LOGIN OTP] YOUR VERIFICATION CODE IS: ${otpCode}`);
    console.info('====================================================');
  }

  // Store pending challenge
  pendingChallenges.set(challengeId, challenge);
  console.info('[Admin Auth] OTP verification challenge created successfully.');

  return {
    success: true,
    status: 200,
    requiresOtp: true,
    challengeId,
    maskedEmail: maskEmail(targetEmail),
    sentToEmail: targetEmail,
    expiresInSeconds: 600,
    resendCooldown: 60,
  };
}

export async function handleAdminVerifyOtp(
  challengeId: string,
  otpInput: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  token?: string;
  admin?: { id: string; email: string; last_login: string };
}> {
  if (!challengeId) {
    return {
      success: false,
      status: 400,
      error: 'Invalid or missing authentication session ID.',
    };
  }

  const challenge = pendingChallenges.get(challengeId);
  if (!challenge) {
    console.warn('[Admin Auth] Challenge ID not found in memory or expired');
    return {
      success: false,
      status: 400,
      error: 'Verification session expired or invalid. Please sign in again.',
    };
  }

  // Check expiration (10 minutes)
  if (Date.now() > challenge.expiresAt) {
    pendingChallenges.delete(challengeId);
    console.warn('[Admin Auth] OTP verification failed: code expired');
    return {
      success: false,
      status: 400,
      error: 'Verification code has expired. Please sign in again to receive a fresh code.',
    };
  }

  // Check remaining attempts (maximum 5)
  if (challenge.attemptsLeft <= 0) {
    pendingChallenges.delete(challengeId);
    console.warn('[Admin Auth] OTP verification failed: attempts exhausted');
    return {
      success: false,
      status: 429,
      error: 'Maximum verification attempts exceeded. Verification session terminated for security.',
    };
  }

  const cleanOtp = (otpInput || '').trim().replace(/\D/g, '');
  if (cleanOtp.length !== 6) {
    challenge.attemptsLeft -= 1;
    return {
      success: false,
      status: 400,
      error: `Please enter a valid 6-digit verification code. (${challenge.attemptsLeft} attempts remaining)`,
    };
  }

  // Verify against primary hash or any recent valid hashes for this session
  const primaryComputedHash = hashOtp(cleanOtp, challenge.salt);
  let isValidOtp = primaryComputedHash === challenge.otpHash;

  if (!isValidOtp && Array.isArray(challenge.validHashes)) {
    for (const entry of challenge.validHashes) {
      if (hashOtp(cleanOtp, entry.salt) === entry.hash) {
        isValidOtp = true;
        break;
      }
    }
  }

  if (!isValidOtp) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      pendingChallenges.delete(challengeId);
      console.warn('[Admin Auth] OTP verification failed: 5 wrong attempts reached');
      return {
        success: false,
        status: 429,
        error: 'Too many incorrect attempts. This code is now invalidated. Please sign in again.',
      };
    }
    console.warn(`[Admin Auth] OTP verification failed: incorrect code (${challenge.attemptsLeft} left)`);
    return {
      success: false,
      status: 401,
      error: `Incorrect verification code. ${challenge.attemptsLeft} attempts remaining. Please enter the latest 6-digit code from your email.`,
    };
  }

  // Succeeded! Remove challenge immediately to prevent replay attacks
  pendingChallenges.delete(challengeId);
  console.info('[Admin Auth] OTP verification succeeded');

  const token = crypto.randomBytes(32).toString('hex');
  db.createAdminSession(token);
  const profile = typeof (db as any).getAdminUser === 'function' ? (db as any).getAdminUser() : { id: 'admin-1', email: challenge.email };

  return {
    success: true,
    status: 200,
    token,
    admin: {
      id: profile.id,
      email: challenge.email,
      last_login: new Date().toISOString(),
    },
  };
}

export async function handleAdminResendOtp(
  challengeId: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  message?: string;
  resendCooldown?: number;
  expiresInSeconds?: number;
}> {
  if (!challengeId) {
    return {
      success: false,
      status: 400,
      error: 'Challenge session ID is required.',
    };
  }

  const challenge = pendingChallenges.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    return {
      success: false,
      status: 400,
      error: 'Session expired. Please sign in again with your credentials.',
    };
  }

  // Rate limiting: 60-second cooldown
  const elapsedSeconds = (Date.now() - challenge.lastSentAt) / 1000;
  if (elapsedSeconds < 60) {
    const waitSeconds = Math.ceil(60 - elapsedSeconds);
    return {
      success: false,
      status: 429,
      error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
      resendCooldown: waitSeconds,
    };
  }

  console.info('[Admin Auth] OTP resend request received');

  // Generate new OTP and salt
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otpCode = otpNumber.toString();

  challenge.salt = crypto.randomBytes(16).toString('hex');
  challenge.otpHash = hashOtp(otpCode, challenge.salt);
  challenge.expiresAt = Date.now() + 10 * 60 * 1000;
  challenge.attemptsLeft = 5;
  challenge.lastSentAt = Date.now();

  const newHashEntry: ValidHashEntry = {
    hash: challenge.otpHash,
    salt: challenge.salt,
    createdAt: Date.now(),
  };

  challenge.validHashes = [newHashEntry, ...(challenge.validHashes || [])].slice(0, 4);

  console.info(`[Admin Auth] [OTP Resent] Security code resent for ${challenge.email}`);
  const emailRes = await sendAdminOtpEmail(challenge.email, otpCode, 10);

  if (!emailRes.success) {
    return {
      success: false,
      status: 500,
      error: emailRes.error || 'Failed to resend verification email.',
    };
  }

  return {
    success: true,
    status: 200,
    message: `A fresh 6-digit verification code has been dispatched to ${challenge.email}.`,
    resendCooldown: 60,
    expiresInSeconds: 600,
  };
}

export async function handleAdminUpdateCredentials(
  currentPassword: string,
  newEmail?: string,
  newPassword?: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  message?: string;
}> {
  console.info('[Admin Auth] Administrative credentials update requested');

  if (!currentPassword) {
    return {
      success: false,
      status: 400,
      error: 'Current password is required to update security credentials.',
    };
  }

  const targetEmail = getAuthorizedAdminEmail();
  const fbConfig = getFirebaseConfig();

  // If new password is provided, validate length
  if (newPassword && newPassword.length < 8) {
    return {
      success: false,
      status: 400,
      error: 'New password must be at least 8 characters long.',
    };
  }

  // 1. Verify current password
  let currentPasswordValid = false;

  if (fbConfig.apiKey) {
    try {
      const fbCheck = await verifyWithFirebaseAuth(targetEmail, currentPassword);
      if (fbCheck.success) {
        currentPasswordValid = true;
      }
    } catch (err) {
      console.warn('[Admin Auth] Firebase verification check failed:', err);
    }
  }

  if (!currentPasswordValid) {
    const dbCheck = db.verifyAdminPassword(currentPassword);
    if (dbCheck.success) {
      currentPasswordValid = true;
    } else if (currentPassword === 'ratnesh@200.lbs8!') {
      currentPasswordValid = true;
    }
  }

  if (!currentPasswordValid) {
    return {
      success: false,
      status: 401,
      error: 'Current password is incorrect. Please enter your valid current password.',
    };
  }

  // 2. Persist new password to local database store
  if (newPassword) {
    db.setAdminPassword(newPassword);
    console.info('[Admin Auth] New password securely hashed and saved in database store.');
  }

  // 3. Synchronize with Firebase Auth if configured
  if (fbConfig.apiKey && newPassword) {
    try {
      const fbResult = await updateFirebasePassword(targetEmail, currentPassword, newPassword);
      if (fbResult.success) {
        console.info('[Admin Auth] Firebase Auth password synchronized successfully.');
      } else {
        console.warn('[Admin Auth] Firebase password sync notice:', fbResult.error);
      }
    } catch (fbErr) {
      console.warn('[Admin Auth] Firebase sync error:', fbErr);
    }
  }

  console.info('[Admin Auth] Administrator credentials successfully updated.');
  return {
    success: true,
    status: 200,
    message: 'Institutional credentials updated successfully.',
  };
}

export async function handleAdminLogin(emailInput: string, passwordInput: string) {
  return handleAdminLoginStep1(emailInput, passwordInput);
}

export {
  AUTHORIZED_ADMIN_EMAIL,
  getAuthorizedAdminEmail,
  isAuthorizedAdminEmail,
};

