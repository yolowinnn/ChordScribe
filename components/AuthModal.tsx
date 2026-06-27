"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInGoogle, signInEmail, signUpEmail, resetEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setMsg(null);
    setBusy(true);
    try {
      await signInGoogle();
      onClose();
    } catch (e: any) {
      setMsg({ t: e.message || "登录失败" });
    } finally {
      setBusy(false);
    }
  }

  async function emailAuth() {
    if (!email || !pw) {
      setMsg({ t: "请输入邮箱和密码" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r =
      mode === "signin"
        ? await signInEmail(email, pw)
        : await signUpEmail(email, pw);
    setBusy(false);
    if (r.error) setMsg({ t: r.error });
    else onClose();
  }

  async function reset() {
    if (!email) {
      setMsg({ t: "请先填写邮箱再点重置" });
      return;
    }
    const r = await resetEmail(email);
    setMsg(
      r.error ? { t: r.error } : { t: "重置邮件已发送，请查收邮箱", ok: true }
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "signin" ? "登录 ChordScribe" : "注册 ChordScribe"}</h2>
        <div className="sub">登录后，你扒过的吉他谱会永久存进云端谱库，换设备也能直接看。</div>

        <button className="gbtn" onClick={google} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          使用 Google 账号登录
        </button>

        <div className="divider">或使用邮箱</div>

        <div className="field">
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <input
            type="password"
            placeholder="密码（至少 6 位）"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && emailAuth()}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={emailAuth}
          disabled={busy}
        >
          {busy ? "请稍候…" : mode === "signin" ? "登录" : "注册"}
        </button>

        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}

        <div className="row2">
          <button
            className="linkbtn"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMsg(null);
            }}
          >
            {mode === "signin" ? "没有账号？去注册" : "已有账号？去登录"}
          </button>
          {mode === "signin" && (
            <button className="linkbtn" onClick={reset}>
              忘记密码
            </button>
          )}
        </div>

        <div className="modal-foot">
          复用你「IELTS_learning」同一套 Firebase 账号体系，登录即通用。
        </div>
      </div>
    </div>
  );
}
