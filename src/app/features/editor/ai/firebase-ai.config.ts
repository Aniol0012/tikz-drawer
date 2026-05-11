import type { FirebaseOptions } from 'firebase/app';

export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyDFClQoaqlA6Mf3-EdomgdjM-ixvyzZmTk',
  authDomain: 'tikz-drawer-ai.firebaseapp.com',
  projectId: 'tikz-drawer-ai',
  storageBucket: 'tikz-drawer-ai.firebasestorage.app',
  messagingSenderId: '1007626501001',
  appId: '1:1007626501001:web:1ab3a3b58e5b58f2a3ff58',
  measurementId: 'G-H0RLKD52Y6'
};

type AI_MODEL = 'gemini-3.1-flash-lite' | 'gemini-3.1-flash';
export const FIREBASE_AI_MODEL = 'gemini-3.1-flash-lite' satisfies AI_MODEL;
export const FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY = '';
