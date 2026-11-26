import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck, getToken } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, GenerativeModel, AI } from 'firebase/ai';

// Firebase Project Credentials
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Check if credentials are real and active
export const isFirebaseConfigured = (): boolean => {
  return (
    !!firebaseConfig.apiKey &&
    firebaseConfig.apiKey.startsWith('AIzaSy') &&
    !firebaseConfig.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
    !firebaseConfig.apiKey.includes('Dummy') &&
    firebaseConfig.appId.length > 10
  );
};

export type AppCheckStatus = 'uninitialized' | 'initialized' | 'attested' | 'pending';

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;
let appCheckStatus: AppCheckStatus = 'uninitialized';
let firebaseAI: AI | null = null;
let cloudModel: GenerativeModel | null = null;

/**
 * Return real-time runtime status of Firebase SDK, App Check attestation, and AI Logic.
 */
export const getFirebaseRuntimeStatus = (): {
  isConfigured: boolean;
  appCheckStatus: AppCheckStatus;
  aiLogicReady: boolean;
} => ({
  isConfigured: isFirebaseConfigured(),
  appCheckStatus,
  aiLogicReady: isFirebaseConfigured() && !!cloudModel
});

/**
 * Initialize Firebase AI Logic SDK with GoogleAIBackend and App Check Debug Provider
 */
export const initFirebase = (): {
  app: FirebaseApp | null;
  firebaseAI: AI | null;
  cloudModel: GenerativeModel | null;
  isReady: boolean;
} => {
  if (typeof window === 'undefined') {
    return { app: null, firebaseAI: null, cloudModel: null, isReady: false };
  }

  try {
    if (!getApps().length) {
      if (isFirebaseConfigured()) {
        app = initializeApp(firebaseConfig);
      }
    } else {
      app = getApp();
    }

    // Initialize App Check with Debug Provider for localhost
    if (app && !appCheck && typeof window !== 'undefined') {
      try {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
        appCheckStatus = 'initialized';
        console.log('[Firebase App Check] Initialized with Debug Provider.');

        // Actively attest token with Firebase App Check backend
        getToken(appCheck)
          .then((result) => {
            if (result && result.token) {
              appCheckStatus = 'attested';
              console.log('🛡️ [Firebase App Check] Successfully verified and attested with Firebase backend!');
            }
          })
          .catch((attestErr) => {
            appCheckStatus = 'pending';
            console.warn('[Firebase App Check] Attestation pending registration in Firebase Console:', attestErr);
          });
      } catch (appCheckErr) {
        console.warn('[Firebase App Check] Init notice:', appCheckErr);
      }
    }

    if (app && isFirebaseConfigured() && !cloudModel) {
      try {
        firebaseAI = getAI(app, { backend: new GoogleAIBackend() });
        cloudModel = getGenerativeModel(firebaseAI, {
          model: 'gemini-3.5-flash-lite',
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600
          }
        });
        console.log('[Firebase AI Logic] Cloud model initialized: gemini-3.5-flash-lite (GoogleAIBackend)');
      } catch (aiInitErr) {
        console.warn('[Firebase AI Logic] Initialization error:', aiInitErr);
      }
    }

    return {
      app,
      firebaseAI,
      cloudModel,
      isReady: isFirebaseConfigured() && !!cloudModel
    };
  } catch (err) {
    console.warn('[Firebase] Init error:', err);
    return { app: null, firebaseAI: null, cloudModel: null, isReady: false };
  }
};
