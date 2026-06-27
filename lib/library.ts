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
}

export function tabId(instrument: InstrumentId, songId: number) {
  return `${instrument}:${songId}`;
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
      instrument: InstrumentId
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
