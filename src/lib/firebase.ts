import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  ActionCodeSettings,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key_here'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (typeof window !== 'undefined' || isFirebaseConfigured) {
  try {
    if (isFirebaseConfigured) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, auth, db };

/**
 * Helper to setup Firebase Phone Auth reCAPTCHA verifier
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  if (!auth) return null;
  try {
    // Clear existing container content if any
    const container = document.getElementById(containerId);
    if (!container) return null;

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Please retry.');
      },
    });
    return verifier;
  } catch (err) {
    console.error('Failed to create RecaptchaVerifier:', err);
    return null;
  }
}

/**
 * Send Phone OTP via Firebase
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please add your credentials in .env.local.');
  }
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/**
 * Builds optional ActionCodeSettings for email verification when running on an allowlisted host.
 * Project lodge-5ad85 allowlists localhost and *.firebaseapp.com/*.web.app by default.
 * Returns undefined for 127.0.0.1 or other non-allowlisted origins to prevent auth/unauthorized-continue-uri.
 */
export function getEmailActionCodeSettings(): ActionCodeSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const origin = window.location.origin;
    if (
      origin.includes('localhost') ||
      origin.includes('lodge-5ad85.firebaseapp.com') ||
      origin.includes('lodge-5ad85.web.app')
    ) {
      return {
        url: `${origin}/login`,
        handleCodeInApp: false,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}
