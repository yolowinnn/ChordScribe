"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * ChordScribe uses its OWN dedicated Firebase project (separate from the IELTS
 * app — one project / one database per product, to keep data clean).
 * Configure via NEXT_PUBLIC_FIREBASE_* env vars (apiKey is a public client
 * value, not a secret). When unset, the app runs in local-only mode (tabs are
 * saved in the browser; login/cloud-sync are disabled) and never crashes.
 */
// Dedicated ChordScribe Firebase project `chordscribe-e1603` (separate from the
// IELTS app). These are public client values (apiKey is not a secret); access is
// secured by Firestore rules + authorized domains. Overridable via env.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDD-cmQNNpeMjkxSGM-wJToVyWQEWSEOz8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chordscribe-e1603.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chordscribe-e1603",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "chordscribe-e1603.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || "108749068894",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:108749068894:web:617f60affd1c083ac272cf",
};

export function firebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured()) return null;
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}
export function firebaseAuth(): Auth | null {
  const app = firebaseApp();
  if (!app) return null;
  if (!_auth) _auth = getAuth(app);
  return _auth;
}
export function firebaseDb(): Firestore | null {
  const app = firebaseApp();
  if (!app) return null;
  if (!_db) _db = getFirestore(app);
  return _db;
}
