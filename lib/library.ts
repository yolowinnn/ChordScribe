"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { firebaseDb } from "./firebase";
import { SongCandidate, TabState } from "./types";
import { InstrumentId } from "./instruments";

export interface SavedTab {
  id: string; // = `${instrument}:${song.id}` — one saved tab per song+instrument
  instrument: InstrumentId;
  song: SongCandidate;
  state: TabState;
  rounds: number;
  createdAt: number;
  updatedAt: number;
  creatorName?: string; // 谁解析的（共享库归属）
}

export function tabId(instrument: InstrumentId, songId: number) {
  return `${instrument}:${songId}`;
}

export function displayNameOf(user: User | null): string {
  if (!user) return "匿名";
  return user.displayName || (user.email ? user.email.split("@")[0] : "匿名");
}

/* ---------- 共享云端谱库（任何人解析都充实公共库，省 token） ---------- */
export interface SharedTab {
  instrument: InstrumentId;
  song: SongCandidate;
  state: TabState;
  rounds: number;
  creatorUid: string;
  creatorName: string;
  createdAt: number;
  updatedAt: number;
}

/** 读共享库（公开可读）；没有则返回 null。 */
export async function getSharedTab(
  instrument: InstrumentId,
  songId: number
): Promise<SharedTab | null> {
  const db = firebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "sharedTabs", tabId(instrument, songId)));
    return snap.exists() ? (snap.data() as SharedTab) : null;
  } catch {
    return null;
  }
}

/** 写共享库（需登录）；失败静默（降级为仅本地）。 */
export async function putSharedTab(rec: SharedTab): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "sharedTabs", tabId(rec.instrument, rec.song.id)), rec);
  } catch (e) {
    console.warn("shared tab write failed:", e);
  }
}

type TabMap = Record<string, SavedTab>;
const LS_KEY = "chordscribe.tabs.v1";

function loadLocal(): TabMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveLocal(map: TabMap) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {}
}

function mergeMaps(a: TabMap, b: TabMap): TabMap {
  const out: TabMap = { ...a };
  for (const id of Object.keys(b)) {
    if (!out[id] || (b[id].updatedAt || 0) > (out[id].updatedAt || 0)) {
      out[id] = b[id];
    }
  }
  return out;
}

function toList(map: TabMap): SavedTab[] {
  return Object.values(map).sort(
    (x, y) => (y.updatedAt || 0) - (x.updatedAt || 0)
  );
}

export function useLibrary(user: User | null) {
  const [map, setMap] = useState<TabMap>({});
  const [synced, setSynced] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initial local load
  useEffect(() => {
    setMap(loadLocal());
  }, []);

  // on login: pull cloud, merge with local, push back
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const db = firebaseDb();
      if (!user || !db) {
        setSynced(false);
        return;
      }
      try {
        const ref = doc(db, "chordscribe", user.uid);
        const snap = await getDoc(ref);
        const remote: TabMap = snap.exists()
          ? JSON.parse(snap.data().json || "{}")
          : {};
        const local = loadLocal();
        const merged = mergeMaps(local, remote);
        if (cancelled) return;
        setMap(merged);
        saveLocal(merged);
        await setDoc(ref, {
          json: JSON.stringify(merged),
          updatedAt: Date.now(),
          email: user.email || "",
        });
        setSynced(true);
      } catch (e) {
        // Firestore not configured / rules — degrade to local only
        console.warn("library cloud sync unavailable, local only:", e);
        setSynced(false);
      }
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const pushCloud = useCallback(
    (next: TabMap) => {
      const db = firebaseDb();
      if (!user || !db) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, "chordscribe", user.uid), {
            json: JSON.stringify(next),
            updatedAt: Date.now(),
            email: user.email || "",
          });
        } catch (e) {
          console.warn("library push failed:", e);
        }
      }, 1200);
    },
    [user]
  );

  const saveTab = useCallback(
    (
      song: SongCandidate,
      state: TabState,
      rounds: number,
      instrument: InstrumentId,
      creatorName?: string
    ) => {
      setMap((prev) => {
        const id = tabId(instrument, song.id);
        const now = Date.now();
        const rec: SavedTab = {
          id,
          instrument,
          song,
          state,
          rounds,
          createdAt: prev[id]?.createdAt || now,
          updatedAt: now,
          creatorName: creatorName || prev[id]?.creatorName,
        };
        const next = { ...prev, [id]: rec };
        saveLocal(next);
        pushCloud(next);
        return next;
      });
    },
    [pushCloud]
  );

  const removeTab = useCallback(
    (id: string) => {
      setMap((prev) => {
        const next = { ...prev };
        delete next[id];
        saveLocal(next);
        pushCloud(next);
        return next;
      });
    },
    [pushCloud]
  );

  const getTab = useCallback((id: string) => map[id], [map]);

  return { tabs: toList(map), getTab, saveTab, removeTab, synced };
}
