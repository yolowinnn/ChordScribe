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
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
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
