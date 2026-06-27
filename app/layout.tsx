import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ChordScribe · AI 吉他扒谱",
  description:
    "说出歌手与歌名，AI 自动找到原曲、聆听音频、循环转译，扒出可弹唱的分段和弦吉他谱，并永久存进你的谱库。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="bg-aura" aria-hidden />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
