"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * Reuses the personal "ielts-study" Firebase project — the same auth/session
 * stack as the IELTS_learning app. The apiKey is a public client value
 * (not a secret); access is secured by Firestore rules + authorized domains.
 * Overridable via NEXT_PUBLIC_FIREBASE_* env vars.
 */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBK7ODcKKiXxOiMPvpNxCw15uNBiO8S1Io",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "ielts-study-9a0f5.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ielts-study-9a0f5",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "ielts-study-9a0f5.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || "468943290114",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:468943290114:web:778cef8eb4515db24fcc1b",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}
export function firebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(firebaseApp());
  return _auth;
}
export function firebaseDb(): Firestore {
  if (!_db) _db = getFirestore(firebaseApp());
  return _db;
}
