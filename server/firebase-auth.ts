import fs from 'fs';
import path from 'path';

export const AUTHORIZED_ADMIN_EMAIL = 'Ramishkji@gmail.com';

function sanitize(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const clean = val.trim().replace(/^["']+|["']+$/g, '').trim();
  return clean || undefined;
}

export function getFirebaseConfig() {
  const config: {
    apiKey?: string;
    projectId?: string;
    authDomain?: string;
    appId?: string;
  } = {};

  const rawApiKey =
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY;
  if (rawApiKey) config.apiKey = sanitize(rawApiKey);

  const rawProjectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (rawProjectId) config.projectId = sanitize(rawProjectId);

  const rawAuthDomain =
    process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (rawAuthDomain) config.authDomain = sanitize(rawAuthDomain);

  try {
    const configFilePath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configFilePath)) {
      const raw = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && !config.apiKey) config.apiKey = sanitize(parsed.apiKey);
      if (parsed.projectId && !config.projectId) config.projectId = sanitize(parsed.projectId);
      if (parsed.authDomain && !config.authDomain) config.authDomain = sanitize(parsed.authDomain);
      if (parsed.appId && !config.appId) config.appId = sanitize(parsed.appId);
    }
  } catch (err) {
    console.warn('[Firebase Config] Could not parse firebase-applet-config.json:', err);
  }

  return config;
}

export function getAuthorizedAdminEmail(): string {
  const envEmail = sanitize(process.env.ADMIN_EMAIL);
  if (envEmail) return envEmail.toLowerCase();
  return AUTHORIZED_ADMIN_EMAIL.toLowerCase();
}

export function isAuthorizedAdminEmail(emailInput: string): boolean {
  const clean = (emailInput || '').trim().toLowerCase();
  if (!clean) return false;
  
  // Accept any case variation of Ramishkji@gmail.com
  if (clean === 'ramishkji@gmail.com') return true;
  if (clean === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) return true;
  
  const envEmail = sanitize(process.env.ADMIN_EMAIL)?.toLowerCase();
  if (envEmail && clean === envEmail) return true;
  
  return clean === getAuthorizedAdminEmail();
}

export async function verifyWithFirebaseAuth(
  email: string,
  password: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  idToken?: string;
  localId?: string;
}> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!isAuthorizedAdminEmail(normalizedEmail)) {
    return {
      success: false,
      status: 401,
      error: 'Unauthorized admin email. Access is strictly restricted to Ramishkji@gmail.com.',
    };
  }

  if (!password) {
    return {
      success: false,
      status: 400,
      error: 'Password is required.',
    };
  }

  const fbConfig = getFirebaseConfig();

  if (fbConfig.apiKey) {
    try {
      console.info(`[Firebase Auth] Initiating credential verification for ${normalizedEmail}...`);
      const fbUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${fbConfig.apiKey}`;
      const fbRes = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          returnSecureToken: true,
        }),
      });

      const data = await fbRes.json().catch(() => ({}));

      if (fbRes.ok && data.idToken) {
        console.info('[Firebase Auth] Firebase authentication successful.');
        return {
          success: true,
          status: 200,
          idToken: data.idToken,
          localId: data.localId,
        };
      }

      const fbErrorCode = data?.error?.message;
      console.info('[Firebase Auth] Provider responded with status code:', fbRes.status, fbErrorCode || '');

      if (
        fbErrorCode === 'INVALID_PASSWORD' ||
        fbErrorCode === 'INVALID_LOGIN_CREDENTIALS' ||
        fbErrorCode === 'EMAIL_NOT_FOUND'
      ) {
        return {
          success: false,
          status: 401,
          error: 'Invalid password. Please check your administrator credentials.',
        };
      }

      if (fbErrorCode === 'CONFIGURATION_NOT_FOUND') {
        return {
          success: false,
          status: 400,
          error:
            'Firebase Email/Password provider is not yet enabled on this Firebase project. Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.',
        };
      }

      if (fbErrorCode === 'USER_DISABLED') {
        return {
          success: false,
          status: 403,
          error: 'Administrator account has been disabled in Firebase.',
        };
      }

      if (fbErrorCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return {
          success: false,
          status: 429,
          error: 'Too many failed login attempts. Please try again later.',
        };
      }

      return {
        success: false,
        status: 401,
        error: fbErrorCode ? `Authentication rejected: ${fbErrorCode}` : 'Invalid administrator credentials.',
      };
    } catch (err: any) {
      console.error('[Firebase Auth] Connection error:', err?.message || err);
      return {
        success: false,
        status: 500,
        error: `Failed to connect to Firebase Authentication: ${err?.message || 'Network error'}`,
      };
    }
  }

  return {
    success: false,
    status: 500,
    error: 'Firebase Authentication is not configured.',
  };
}

export async function updateFirebasePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  status: number;
  error?: string;
  isFirebaseConfigured?: boolean;
}> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const targetAuthorizedEmail = getAuthorizedAdminEmail();

  if (normalizedEmail !== targetAuthorizedEmail) {
    return {
      success: false,
      status: 401,
      error: 'Unauthorized admin email. Only Ramishkji@gmail.com is permitted.',
    };
  }

  if (!currentPassword) {
    return {
      success: false,
      status: 400,
      error: 'Current password is required.',
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      status: 400,
      error: 'New password must be at least 8 characters long.',
    };
  }

  const fbConfig = getFirebaseConfig();

  if (fbConfig.apiKey) {
    try {
      console.info(`[Firebase Auth] Re-authenticating ${normalizedEmail} to update password...`);
      const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${fbConfig.apiKey}`;
      const signInRes = await fetch(signInUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: currentPassword,
          returnSecureToken: true,
        }),
      });

      const signInData = await signInRes.json().catch(() => ({}));

      if (signInRes.ok && signInData.idToken) {
        console.info('[Firebase Auth] Current password confirmed. Updating password in Firebase Auth...');
        const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${fbConfig.apiKey}`;
        const updateRes = await fetch(updateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: signInData.idToken,
            password: newPassword,
            returnSecureToken: true,
          }),
        });

        const updateData = await updateRes.json().catch(() => ({}));

        if (updateRes.ok) {
          console.info('[Firebase Auth] Administrator password updated successfully in Firebase Auth.');
          return {
            success: true,
            status: 200,
            isFirebaseConfigured: true,
          };
        }

        const updateError = updateData?.error?.message || 'Failed to update password in Firebase Auth.';
        console.warn('[Firebase Auth] Password update failed:', updateError);
        return {
          success: false,
          status: 400,
          error: updateError,
          isFirebaseConfigured: true,
        };
      }

      const fbErrorCode = signInData?.error?.message;
      console.info('[Firebase Auth] Re-authentication failed:', fbErrorCode || signInRes.status);

      if (
        fbErrorCode === 'INVALID_PASSWORD' ||
        fbErrorCode === 'INVALID_LOGIN_CREDENTIALS'
      ) {
        return {
          success: false,
          status: 401,
          error: 'Current password is incorrect. Please check your existing password.',
          isFirebaseConfigured: true,
        };
      }

      if (fbErrorCode === 'EMAIL_NOT_FOUND') {
        // User not yet created in Firebase Auth; create account with new password
        console.info('[Firebase Auth] Account not found in Firebase Auth; creating account with new credentials...');
        const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${fbConfig.apiKey}`;
        const signUpRes = await fetch(signUpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: newPassword,
            returnSecureToken: true,
          }),
        });

        if (signUpRes.ok) {
          console.info('[Firebase Auth] Administrator account registered in Firebase Auth with new password.');
          return {
            success: true,
            status: 200,
            isFirebaseConfigured: true,
          };
        }
      }

      return {
        success: false,
        status: 400,
        error: fbErrorCode ? `Firebase Auth error: ${fbErrorCode}` : 'Failed to verify current password.',
        isFirebaseConfigured: true,
      };
    } catch (err: any) {
      console.error('[Firebase Auth] Network error updating password:', err);
      return {
        success: false,
        status: 500,
        error: `Firebase Auth error: ${err?.message || 'Network error'}`,
        isFirebaseConfigured: true,
      };
    }
  }

  return {
    success: false,
    status: 200,
    isFirebaseConfigured: false,
    error: 'Firebase API key not configured.',
  };
}

