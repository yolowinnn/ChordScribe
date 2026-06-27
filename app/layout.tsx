import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChordScribe · AI 吉他扒谱",
  description:
    "说出歌手和歌名，AI 自动找到原曲、聆听音频、循环转译，扒出分段和弦吉他谱。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
