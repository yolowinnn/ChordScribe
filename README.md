# ChordScribe · AI 多乐器扒谱

选乐器 → 说出歌手和歌名，AI 自动找到原曲、聆听**完整音频**、**循环多轮转译**，
扒出对标「有谱吗」风格的可演奏谱子，并**永久存进谱库**（解析一次，随时取用）。

🎸 吉他 · 🌺 尤克里里 · 🎚️ 贝斯 · 🎹 钢琴（主推）· 🎻 小提琴 / 大提琴（试验）

- **线上**：https://chordscribe.pages.dev （Cloudflare Pages，国内可达）
- **技术**：Next.js 静态前端 + Cloudflare Pages Functions + Google Vertex AI Gemini 2.5 Pro（多模态听音频）+ Firebase（账户/谱库）
- 音频源：网易云原曲；账户/谱库用独立 Firebase 项目（与雅思项目分开）

📖 产品设计见 [PRODUCT.md](PRODUCT.md)，部署与配置见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 本地开发

```bash
npm install
# 可选：把独立 Firebase 项目的 NEXT_PUBLIC_FIREBASE_* 写进 .env.local（开启登录/云同步）
npm run build        # 静态导出到 out/
npx wrangler pages dev out   # 本地跑（含 functions，需 .dev.vars 里放 VERTEX_SA_KEY）
```

自动扒谱结果仅供学习与练习参考，音乐版权归原作者及版权方所有。
