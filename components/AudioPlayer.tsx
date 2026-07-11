"use client";

import { useEffect, useRef, useState } from "react";
import { itunesPreviewUrl } from "@/lib/api";

/**
 * 边看谱边听原曲。优先网易云完整音源（/api/audio）；若取不到（会员锁/CDN 不可达，
 * <audio> onError 触发）自动回退 iTunes 30s 免费试听。songId 缺失时直接用 iTunes。
 */
export default function AudioPlayer({
  songId,
  title,
  artist,
}: {
  songId?: number;
  title: string;
  artist: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [source, setSource] = useState<"netease" | "itunes" | null>(null);
  const [dead, setDead] = useState(false);
  const triedItunes = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化：有 songId 先试网易云全曲，否则直接 iTunes。
  useEffect(() => {
    triedItunes.current = false;
    setDead(false);
    if (songId) {
      setSource("netease");
      setSrc(`/api/audio?id=${songId}`);
    } else {
      setSource(null);
      setSrc(null);
      fallbackToItunes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, title, artist]);

  async function fallbackToItunes() {
    if (triedItunes.current) {
      setDead(true);
      return;
    }
    triedItunes.current = true;
    const url = await itunesPreviewUrl(title, artist || "");
    if (url) {
      setSource("itunes");
      setSrc(url);
    } else {
      setDead(true);
    }
  }

  if (dead) {
    return (
      <div className="player player-dead">🔇 暂无可播放的原曲音源</div>
    );
  }

  return (
    <div className="player">
      <span className="player-label">🎧 原曲</span>
      <audio
        ref={audioRef}
        className="player-audio"
        src={src ?? undefined}
        controls
        preload="none"
        onError={source === "netease" ? fallbackToItunes : undefined}
      />
      {source === "itunes" && (
        <span className="player-hint">iTunes 试听 · 30s</span>
      )}
      {!src && <span className="player-hint">加载中…</span>}
    </div>
  );
}
