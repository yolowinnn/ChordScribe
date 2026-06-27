# ChordScribe · AI 吉他扒谱

说出歌手 + 歌名，AI 自动找到原曲、聆听完整音频、**循环多轮转译**，扒出对标「有谱吗」风格的**分段和弦吉他谱**（调性 / 变调夹 / 速度 / 曲式 / 每段和弦进行 + 扫弦/分解节奏型 + 歌词和弦对位）。

## 工作原理

```
关键词搜索  ──►  网易云原曲完整音频  ──►  Gemini 2.5 Pro 多模态聆听
                                              │
                          ┌───────── 循环 loop（最多 5 轮）─────────┐
                          │  第1轮：建立骨架（调性/曲式/初步和弦）   │
                          │  第N轮：逐段核对、修正和弦、细化节奏型    │
                          │  模型自评 confidence，达标后 done=true   │
                          └────────────────────────────────────────┘
                                              │
                                       分段和弦吉他谱
```

前端实时显示「正在进行第 N 轮转译…」与每轮的修订摘要、置信度。

## 技术栈

- **Next.js 15** (App Router) + TypeScript，部署在 **Vercel**
- **Google Vertex AI · Gemini 2.5 Pro**（多模态，直接聆听音频）
- 音频源：网易云音乐公开外链接口

## 环境变量

| 变量 | 说明 |
|------|------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Vertex service account JSON，**base64 编码后**填入（避免换行/引号问题） |
| `GCP_PROJECT` | GCP 项目 ID（默认从 key 中读取） |
| `GCP_REGION` | Vertex 区域，默认 `us-central1` |
| `GEMINI_MODEL` | 默认 `gemini-2.5-pro` |

> service account key 绝不入库，已在 `.gitignore` 中排除。

## 本地运行

```bash
npm install
# 生成 .env.local：
#   GOOGLE_SERVICE_ACCOUNT_KEY=<base64 of your SA json>
#   GCP_PROJECT=...
npm run dev
```

打开 http://localhost:3000，搜索「苏紫旭 十八年后」即可。

## 说明

自动扒谱结果仅供学习与练习参考，音乐版权归原作者及版权方所有。
