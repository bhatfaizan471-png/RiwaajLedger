'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, setupRecaptcha, sendPhoneOtp } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  isDemoUser?: boolean;
  isTwoFactorEnabled?: boolean;
  twoFactorPhoneNumber?: string | null;
}

export interface PendingTwoFactorState {
  user: AuthUser;
  phoneHint: string;
  confirmationResult: ConfirmationResult | null;
}


interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  pendingTwoFactor: PendingTwoFactorState | null;
  signIn: (
    identifier: string,
    pass: string
  ) => Promise<{ requires2FA?: boolean }>;
  signInEmail: (
    identifier: string,
    pass: string
  ) => Promise<{ requires2FA?: boolean }>;
  signUp: (
    email: string,
    pass: string,
    name: string,
    phone: string
  ) => Promise<void>;
  signUpEmail: (
    email: string,
    pass: string,
    name: string,
    phone?: string
  ) => Promise<{ emailVerified: boolean; emailSent: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendOtpToPhone: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logOut: () => Promise<void>;
  loginAsDemoUser: (name?: string, email?: string) => void;
  // Two-Step Verification methods
  setupTwoFactor: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  confirmTwoFactorSetup: (
    confirmationResult: ConfirmationResult,
    code: string,
    phoneNumber: string
  ) => Promise<void>;
  disableTwoFactor: () => Promise<void>;
  verifyTwoFactorLogin: (code: string) => Promise<void>;
  cancelTwoFactorLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_SESSION_KEY = 'riwaaj_active_user_session';
const ACCOUNTS_REGISTRY_KEY = 'riwaaj_registered_accounts_registry';
const TWO_FACTOR_CONFIG_PREFIX = 'riwaaj_2fa_config_';

/**
 * Normalizes phone numbers by stripping whitespace, hyphens, brackets, dots.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

/**
 * Validates international or standard phone number formats.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  return /^\+?[0-9]{8,16}$/.test(norm);
}

/**
 * Validates basic email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return phone || '•••';
  const clean = phone.trim();
  const last4 = clean.slice(-4);
  const start = clean.slice(0, 3);
  return `${start} ••••• ••${last4}`;
}

/**
 * Resolves a phone number to its corresponding registered account email via the backend API route.
 * Does not store, encrypt, or look up a persistent phone-to-email directory in client localStorage.
 */
export async function resolvePhoneToEmail(phone: string): Promise<string | null> {
  const rawPhone = phone.trim();
  if (!rawPhone) return null;

  try {
    const res = await fetch('/api/auth/resolve-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rawPhone }),
    });
    const data = await res.json();
    if (res.ok && data?.email) {
      return data.email;
    }
    if (data?.error === 'PHONE_LOOKUP_REQUIRES_ADMIN') {
      const err = new Error(
        'Phone number login on a new device requires signing in with your registered Email address and Password once, or configuring Firebase Admin credentials on the backend.'
      );
      (err as any).code = 'auth/phone-lookup-admin-required';
      throw err;
    }
  } catch (err: any) {
    if (err?.code === 'auth/phone-lookup-admin-required') throw err;
  }

  return null;
}

function getStored2FAConfig(uid: string): { enabled: boolean; phone: string } | null {
  if (typeof window === 'undefined' || !uid) return null;
  const raw = localStorage.getItem(`${TWO_FACTOR_CONFIG_PREFIX}${uid}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save2FAConfig(uid: string, enabled: boolean, phone: string) {
  if (typeof window === 'undefined' || !uid) return;
  if (!enabled) {
    localStorage.removeItem(`${TWO_FACTOR_CONFIG_PREFIX}${uid}`);
  } else {
    localStorage.setItem(
      `${TWO_FACTOR_CONFIG_PREFIX}${uid}`,
      JSON.stringify({ enabled: true, phone, updatedAt: Date.now() })
    );
  }
}


/**
 * Translate Firebase Authentication error codes into clear, actionable messages
 */
export function formatFirebaseAuthError(err: any): string {
  if (!err) return 'Authentication failed. Please try again.';
  const code =
    err.code ||
    (typeof err.message === 'string' && err.message.match(/auth\/[a-z0-9-]+/)?.[0]) ||
    '';
  const message = err.message || '';

  if (
    code === 'auth/configuration-not-found' ||
    message.includes('configuration-not-found') ||
    message.includes('CONFIGURATION_NOT_FOUND')
  ) {
    return 'Firebase Authentication is not activated for project "lodge-5ad85". Please go to Firebase Console (https://console.firebase.google.com/project/lodge-5ad85/authentication), click "Get Started", and enable the "Email/Password" provider under Sign-in method.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'This sign-in provider is disabled in Firebase Console. Please open Firebase Console > Authentication > Sign-in method and enable Email/Password.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email/phone or password. Please check your credentials or create a new account.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid phone number format. Please provide full international format with country code (e.g. +91 94190 12345).';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Access has been temporarily restricted. Please try again in a few minutes.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  return message || 'Authentication failed. Please verify credentials.';
}

export interface FormattedAuthError {
  code: string;
  message: string;
  rawMessage: string;
}

export function getFirebaseErrorMessageAndCode(err: any): FormattedAuthError {
  if (!err) {
    return {
      code: 'auth/unknown',
      message: 'Authentication failed. Please try again.',
      rawMessage: 'Unknown error',
    };
  }

  const code: string =
    err.code ||
    (typeof err.message === 'string' && err.message.match(/auth\/[a-z0-9-]+/)?.[0]) ||
    'auth/unknown';
  const rawMessage: string = typeof err.message === 'string' ? err.message : '';
  const friendly: string = formatFirebaseAuthError(err);

  return {
    code,
    message: friendly,
    rawMessage,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactorState | null>(null);

  useEffect(() => {
    // Proactively purge any legacy insecure account registry or phone map keys
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ACCOUNTS_REGISTRY_KEY);
        localStorage.removeItem('riwaaj_phone_to_email_map');
      } catch {}
    }

    // 1. Check if Firebase Auth is initialized and has an active session
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
        if (firebaseUser) {
          const twoFactorConfig = getStored2FAConfig(firebaseUser.uid);
          let userPhone = firebaseUser.phoneNumber;
          if (!userPhone) {
            try {
              const stored = localStorage.getItem(CURRENT_USER_SESSION_KEY);
              if (stored) {
                const parsed: AuthUser = JSON.parse(stored);
                if (parsed?.uid === firebaseUser.uid && parsed?.phoneNumber) {
                  userPhone = parsed.phoneNumber;
                }
              }
            } catch {}
          }
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            phoneNumber: userPhone,
            emailVerified: true, // No mandatory email verification required
            isDemoUser: false,
            isTwoFactorEnabled: Boolean(twoFactorConfig?.enabled),
            twoFactorPhoneNumber: twoFactorConfig?.phone || null,
          };
          setUser(authUser);
          localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(authUser));
        } else {
          // Check for local demo session only
          const stored = localStorage.getItem(CURRENT_USER_SESSION_KEY);
          if (stored) {
            try {
              const parsed: AuthUser = JSON.parse(stored);
              if (parsed?.isDemoUser) {
                setUser(parsed);
              } else {
                localStorage.removeItem(CURRENT_USER_SESSION_KEY);
                setUser(null);
              }
            } catch {
              localStorage.removeItem(CURRENT_USER_SESSION_KEY);
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline / unconfigured environment: Only restore explicit demo sessions
      const stored = localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (stored) {
        try {
          const parsed: AuthUser = JSON.parse(stored);
          if (parsed?.isDemoUser) {
            setUser(parsed);
          } else {
            localStorage.removeItem(CURRENT_USER_SESSION_KEY);
            setUser(null);
          }
        } catch {
          localStorage.removeItem(CURRENT_USER_SESSION_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, []);

  /**
   * Universal Login using either:
   * - Email Address + Password
   * - Phone Number + Password
   */
  const signIn = async (
    identifier: string,
    pass: string
  ): Promise<{ requires2FA?: boolean }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Please enter your email address or phone number.');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }

    let targetEmail: string;

    if (cleanId.includes('@')) {
      targetEmail = cleanId.toLowerCase();
    } else {
      // Phone number login
      const cleanPhone = cleanId;
      const resolved = await resolvePhoneToEmail(cleanPhone);
      if (!resolved) {
        throw new Error(
          `No registered account found with phone number "${cleanPhone}". If this is your first time logging in on this device, please sign in with your registered Email address and Password.`
        );
      }
      targetEmail = resolved;
    }

    // Authenticate with Firebase using resolved email + password
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, targetEmail, pass);
        if (cred.user) {
          const twoFactorConfig = getStored2FAConfig(cred.user.uid);
          let userPhone = cred.user.phoneNumber;
          if (!userPhone) {
            if (!cleanId.includes('@')) {
              userPhone = cleanId;
            } else {
              try {
                const stored = localStorage.getItem(CURRENT_USER_SESSION_KEY);
                if (stored) {
                  const parsed: AuthUser = JSON.parse(stored);
                  if (parsed?.uid === cred.user.uid && parsed?.phoneNumber) {
                    userPhone = parsed.phoneNumber;
                  }
                }
              } catch {}
            }
          }

          const baseUser: AuthUser = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName,
            phoneNumber: userPhone,
            emailVerified: true,
            isDemoUser: false,
            isTwoFactorEnabled: Boolean(twoFactorConfig?.enabled),
            twoFactorPhoneNumber: twoFactorConfig?.phone || null,
          };

          if (twoFactorConfig?.enabled && twoFactorConfig.phone) {
            setPendingTwoFactor({
              user: baseUser,
              phoneHint: maskPhoneNumber(twoFactorConfig.phone),
              confirmationResult: null,
            });
            return { requires2FA: true };
          }

          setUser(baseUser);
          localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(baseUser));
          return { requires2FA: false };
        }
      } catch (err: any) {
        console.error('Firebase sign-in error:', err);
        const formatted = getFirebaseErrorMessageAndCode(err);
        const customError = new Error(formatted.message);
        (customError as any).code = formatted.code;
        (customError as any).rawMessage = formatted.rawMessage;
        throw customError;
      }
    }

    throw new Error(
      'Authentication service is unavailable or not configured. Please ensure Firebase configuration in .env.local is present, or explore the Sandbox Demo.'
    );
  };

  /**
   * Backward-compatible alias for signIn
   */
  const signInEmail = async (identifier: string, pass: string) => {
    return await signIn(identifier, pass);
  };

  /**
   * Signup with Full Name, Email, Phone Number, and Password.
   * All fields required. No email verification links sent.
   */
  const signUp = async (
    email: string,
    pass: string,
    name: string,
    phone: string
  ): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      throw new Error('Please enter your full name (at least 2 characters).');
    }
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. name@example.com).');
    }
    if (!cleanPhone || !isValidPhoneNumber(cleanPhone)) {
      throw new Error('Please enter a valid phone number with 8-16 digits (e.g. +91 94190 12345).');
    }
    if (!pass || pass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check if phone number is already registered via backend resolver
    try {
      const existingEmail = await resolvePhoneToEmail(cleanPhone);
      if (existingEmail && existingEmail.toLowerCase() !== cleanEmail) {
        throw new Error(
          'This phone number is already registered with an existing account. Please log in instead.'
        );
      }
    } catch (checkErr: any) {
      if (checkErr?.message?.includes('already registered with an existing account')) {
        throw checkErr;
      }
      // Non-blocking if cross-device resolver is unconfigured
    }

    if (isFirebaseConfigured && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        if (cred.user) {
          if (cleanName) {
            try {
              await updateProfile(cred.user, { displayName: cleanName });
            } catch {
              // Non-blocking
            }
          }

          // Save profile in Firestore at /users/{uid}
          if (db) {
            try {
              await setDoc(
                doc(db, 'users', cred.user.uid),
                {
                  uid: cred.user.uid,
                  email: cleanEmail,
                  displayName: cleanName,
                  phone: cleanPhone,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
            } catch (fsErr) {
              console.warn('Could not save user profile doc to Firestore:', fsErr);
            }
          }


          const authUser: AuthUser = {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cleanName || cred.user.displayName,
            phoneNumber: cleanPhone,
            emailVerified: true,
            isDemoUser: false,
            isTwoFactorEnabled: false,
          };
          setUser(authUser);
          localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(authUser));
          return;
        }
      } catch (err: any) {
        console.error('Firebase sign-up error:', err);
        const formatted = getFirebaseErrorMessageAndCode(err);
        const customError = new Error(formatted.message);
        (customError as any).code = formatted.code;
        (customError as any).rawMessage = formatted.rawMessage;
        throw customError;
      }
    }

    throw new Error(
      'Account registration requires active Firebase Authentication. Please configure Firebase credentials in .env.local or explore the Sandbox Demo.'
    );
  };

  /**
   * Backward-compatible alias for signUp
   */
  const signUpEmail = async (
    email: string,
    pass: string,
    name: string,
    phone?: string
  ) => {
    await signUp(email, pass, name, phone || '');
    return { emailVerified: true, emailSent: false };
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. name@example.com).');
    }

    if (isFirebaseConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return;
      } catch (err: any) {
        console.error('Firebase password reset error:', err);
        const friendlyMessage = formatFirebaseAuthError(err);
        const customError = new Error(friendlyMessage);
        (customError as any).code = err?.code;
        throw customError;
      }
    }
    throw new Error(
      'Password reset is unavailable because Firebase Authentication is not configured.'
    );
  };

  const verifyTwoFactorLogin = async (code: string): Promise<void> => {
    if (!pendingTwoFactor) {
      throw new Error('No pending Two-Step Verification session found.');
    }
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      throw new Error('Please enter the 6-digit verification code.');
    }

    try {
      if (pendingTwoFactor.confirmationResult) {
        await pendingTwoFactor.confirmationResult.confirm(cleanCode);
      }
      setUser(pendingTwoFactor.user);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(pendingTwoFactor.user));
      setPendingTwoFactor(null);
    } catch (err: any) {
      console.error('2FA verification error:', err);
      const friendlyMessage = formatFirebaseAuthError(err);
      throw new Error(friendlyMessage);
    }
  };

  const cancelTwoFactorLogin = () => {
    setPendingTwoFactor(null);
    if (auth && isFirebaseConfigured) {
      signOut(auth).catch(() => {});
    }
    setUser(null);
  };

  const setupTwoFactor = async (
    phoneNumber: string,
    containerId: string
  ): Promise<ConfirmationResult> => {
    if (!user) {
      throw new Error('You must be signed in to configure Two-Step Verification.');
    }
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error('Please enter a valid phone number with country code (e.g. +91 94190 12345).');
    }

    return await sendOtpToPhone(cleanPhone, containerId);
  };

  const confirmTwoFactorSetup = async (
    confirmationResult: ConfirmationResult,
    code: string,
    phoneNumber: string
  ): Promise<void> => {
    if (!user) throw new Error('No active user session.');
    try {
      await confirmationResult.confirm(code.trim());
      save2FAConfig(user.uid, true, phoneNumber.trim());
      const updatedUser: AuthUser = {
        ...user,
        isTwoFactorEnabled: true,
        twoFactorPhoneNumber: phoneNumber.trim(),
      };
      setUser(updatedUser);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(updatedUser));
    } catch (err: any) {
      console.error('2FA setup confirm error:', err);
      throw new Error(formatFirebaseAuthError(err));
    }
  };

  const disableTwoFactor = async (): Promise<void> => {
    if (!user) throw new Error('No active user session.');
    save2FAConfig(user.uid, false, '');
    const updatedUser: AuthUser = {
      ...user,
      isTwoFactorEnabled: false,
      twoFactorPhoneNumber: null,
    };
    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(updatedUser));
  };

  const sendOtpToPhone = async (
    phoneNumber: string,
    containerId: string
  ): Promise<ConfirmationResult> => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase configuration missing. Phone OTP requires Firebase Auth.');
    }
    const verifier = setupRecaptcha(containerId);
    if (!verifier) {
      throw new Error('Could not initialize reCAPTCHA verifier.');
    }
    try {
      return await sendPhoneOtp(phoneNumber, verifier);
    } catch (err: any) {
      console.error('Phone OTP error:', err);
      const friendlyMessage = formatFirebaseAuthError(err);
      const customError = new Error(friendlyMessage);
      (customError as any).code = err?.code;
      throw customError;
    }
  };

  const confirmPhoneOtp = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      const cred = await confirmationResult.confirm(code);
      if (cred.user) {
        const twoFactorConfig = getStored2FAConfig(cred.user.uid);
        const authUser: AuthUser = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          phoneNumber: cred.user.phoneNumber,
          emailVerified: true,
          isDemoUser: false,
          isTwoFactorEnabled: Boolean(twoFactorConfig?.enabled),
          twoFactorPhoneNumber: twoFactorConfig?.phone || null,
        };
        setUser(authUser);
        localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(authUser));
      }
    } catch (err: any) {
      console.error('Confirm Phone OTP error:', err);
      const friendlyMessage = formatFirebaseAuthError(err);
      const customError = new Error(friendlyMessage);
      (customError as any).code = err?.code;
      throw customError;
    }
  };

  const logOut = async () => {
    const currentUid = user?.uid;
    localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    localStorage.removeItem('riwaaj_phone_to_email_map');
    localStorage.removeItem(ACCOUNTS_REGISTRY_KEY);
    setPendingTwoFactor(null);

    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith('riwaaj_people_') ||
              k.startsWith('riwaaj_transactions_') ||
              k === 'riwaaj_phone_to_email_map' ||
              k === ACCOUNTS_REGISTRY_KEY ||
              (currentUid && k.includes(currentUid)))
          ) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Error clearing local cache on logout:', e);
      }
    }

    if (auth && isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setUser(null);
  };

  const loginAsDemoUser = (name = 'Kashmiri Host', email = 'demo@riwaaj.com') => {
    const demoUser: AuthUser = {
      uid: 'demo_user_local_uid',
      email,
      displayName: name,
      phoneNumber: '+919906000000',
      emailVerified: true,
      isDemoUser: true,
      isTwoFactorEnabled: false,
    };
    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        pendingTwoFactor,
        signIn,
        signInEmail,
        signUp,
        signUpEmail,
        sendPasswordReset,
        sendOtpToPhone,
        confirmPhoneOtp,
        logOut,
        loginAsDemoUser,
        setupTwoFactor,
        confirmTwoFactorSetup,
        disableTwoFactor,
        verifyTwoFactorLogin,
        cancelTwoFactorLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
