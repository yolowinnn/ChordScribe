"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

const FRIENDLY: Record<string, string> = {
  "auth/invalid-email": "邮箱格式不正确",
  "auth/user-not-found": "该邮箱未注册，请先注册",
  "auth/wrong-password": "密码错误",
  "auth/invalid-credential": "邮箱或密码错误",
  "auth/email-already-in-use": "该邮箱已注册，请直接登录",
  "auth/weak-password": "密码太短（至少 6 位）",
  "auth/missing-password": "请输入密码",
  "auth/too-many-requests": "尝试次数过多，请稍后再试",
  "auth/operation-not-allowed": "邮箱登录未启用（请在 Firebase 控制台开启）",
  "auth/unauthorized-domain":
    "当前域名未授权（请在 Firebase 控制台 Authorized domains 添加本站域名）",
  "auth/popup-closed-by-user": "登录弹窗被关闭，请重试",
  "auth/cancelled-popup-request": "弹窗被打断，请单击一次或改用邮箱登录",
  "auth/network-request-failed": "网络错误，请检查连接",
};
export function friendlyAuthErr(code: string): string {
  return FRIENDLY[code] || "登录失败：" + code;
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (e: string, p: string) => Promise<{ ok?: boolean; error?: string }>;
  signUpEmail: (e: string, p: string) => Promise<{ ok?: boolean; error?: string }>;
  resetEmail: (e: string) => Promise<{ ok?: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  let signingIn = false;

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  async function signInGoogle() {
    if (signingIn) return;
    signingIn = true;
    try {
      await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
    } catch (e: any) {
      const code = e?.code || e?.message || "";
      if (/popup|cancelled-popup|operation-not-supported/i.test(code)) {
        await signInWithRedirect(firebaseAuth(), new GoogleAuthProvider());
      } else {
        throw new Error(friendlyAuthErr(code));
      }
    } finally {
      signingIn = false;
    }
  }

  async function signInEmail(email: string, pw: string) {
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email, pw);
      return { ok: true };
    } catch (e: any) {
      return { error: friendlyAuthErr(e?.code || e?.message) };
    }
  }
  async function signUpEmail(email: string, pw: string) {
    try {
      await createUserWithEmailAndPassword(firebaseAuth(), email, pw);
      return { ok: true };
    } catch (e: any) {
      return { error: friendlyAuthErr(e?.code || e?.message) };
    }
  }
  async function resetEmail(email: string) {
    try {
      await sendPasswordResetEmail(firebaseAuth(), email);
      return { ok: true };
    } catch (e: any) {
      return { error: friendlyAuthErr(e?.code || e?.message) };
    }
  }
  async function signOut() {
    await fbSignOut(firebaseAuth());
  }

  return (
    <Ctx.Provider
      value={{ user, ready, signInGoogle, signInEmail, signUpEmail, resetEmail, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
