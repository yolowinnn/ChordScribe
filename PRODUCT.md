# ChordScribe · 产品说明（多乐器 AI 扒谱）

> 说出歌手 + 歌名，AI 自动找到原曲、聆听**完整音频**、**循环多轮转译**，
> 扒出对标「有谱吗」风格的可演奏谱子，并**永久存进你的谱库**（解析一次，随时取用）。

## 一、产品模块（按乐器划分）

每个乐器是一个独立"扒谱模式"，使用**针对该乐器定制的提示词**与**专属谱面渲染**：

| 模块 | 乐器 | 产出内容 | 谱面形式 |
|------|------|----------|----------|
| 🎸 **吉他** (主推) | Guitar (EADGBE) | 和弦进行 + 扫弦/分解节奏型 + 变调夹 + 歌词对位 | 和弦标在歌词上方 + 可选六线谱 riff |
| 🌺 **尤克里里** (主推) | Ukulele (GCEA) | uke 和弦 + 扫弦型 + 歌词对位 | 和弦-歌词对位 |
| 🎚️ **贝斯** (主推) | Bass (EADG) | 根音/和弦走向 + 律动 + bass line | **四线谱 ASCII** + 律动描述 |
| 🎹 **钢琴** (主推) | Piano | 和弦 + 左手伴奏型 + 右手旋律 | 和弦-歌词对位 + 旋律音名 |
| 🎻 **小提琴** (试验) | Violin (GDAE) | 主旋律音名+节奏 + 弓法/把位 | 旋律谱 |
| 🎻 **大提琴** (试验) | Cello (CGDA) | 旋律/低音线 + 弓法 | 旋律谱 |

> 优先级：吉他 / 尤克里里 / 贝斯 / 钢琴为常用主推；小提琴、大提琴为试验模块。
> 乐器注册表见 `lib/instruments.ts`，每个乐器的提示词见 `lib/prompts.ts`。

## 二、核心流程

```
① 选乐器  →  ② 搜歌(网易云)  →  ③ 选版本
        │
        ▼  浏览器拉取原曲完整音频(/api/audio) 并在本地 base64
   ┌──────────── 循环 loop（最多 5 轮，前端实时显示进度）────────────┐
   │  第1轮：建立骨架（meta / 曲式 / 各段初步内容）                   │
   │  第N轮：逐段聆听核对、修正、补全（该乐器的重点字段）             │
   │  模型自评 confidence，达标后 done=true 提前结束                  │
   └─────────────────────────────────────────────────────────────────┘
        │
        ▼  自动存进谱库（本地 + 云端），下次同一首+同乐器秒开，不重复解析
```

## 三、技术架构

```
浏览器(SPA, Next.js 静态导出)
  │  ① /api/search?q=     → 网易云搜歌（plain 接口，绕过 abroad 加密）
  │  ② /api/audio?id=     → 流式代理网易云原曲音频（加 X-Real-IP）
  │  ③ POST /api/round    → 浏览器构建好的 Vertex 请求体(含内联音频)
  ▼
Cloudflare Pages Functions（functions/api/*.js，全球边缘，国内可达）
  │  round.js：用 SA 私钥 Web Crypto 签 RS256 JWT 换 access token，
  │            把请求体转发给 Vertex（瘦代理，几乎不耗 CPU，过 free 限额）
  ▼
Google Vertex AI · Gemini 2.5 Pro（多模态，直接聆听音频扒谱）

账户 & 谱库：Firebase（独立项目）Auth(Google/邮箱) + Firestore(chordscribe/{uid})
  · 未配置时自动降级为「仅本地 localStorage」，App 照常可用
```

**为什么用 Cloudflare**：原 Vercel 服务器在境外，国内访问差。Cloudflare 边缘网络国内可达性更好，`*.pages.dev` / 自定义域可正常访问。

**关键工程点**
- 瘦代理设计：音频 base64 在**浏览器**完成，Worker 只签 JWT + 转发字节，绕开 Cloudflare 免费版 CPU 限额（已实测整首 7 分钟歌、9MB 请求体、单轮 ~90s 在 free plan 跑通）。
- 网易云：搜索用 `music.163.com/api/search/get`（`/web` 接口对数据中心 IP 返回加密 abroad 包）；音频用公开外链 + `X-Real-IP` 伪装。
- Vertex 鉴权在边缘用 `crypto.subtle` 手写 RS256 JWT（无 Node 依赖），SA key 存 Cloudflare secret `VERTEX_SA_KEY`。

## 四、谱库（持久化）

- 记录键 = `${乐器}:${歌曲id}`（同一首歌不同乐器各存一份）。
- 本地：`localStorage`（无需登录即用）。
- 云端：登录后写 Firestore `chordscribe/{uid}`，登录时本地↔云端智能合并，跨设备同步。
- 谱库页支持按乐器筛选；卡片显示乐器/调性/BPM/解析日期；点开即看，无需重新解析。

## 五、目录结构

```
app/                 Next.js 前端（静态导出）
  page.tsx           主流程（选乐器→搜歌→循环转译→谱库/详情）
  layout.tsx globals.css
components/
  TabView.tsx        多乐器谱面渲染（和弦对位 / 四线谱 / 旋律）
  AuthModal.tsx      登录弹窗（Google + 邮箱）
lib/
  instruments.ts     乐器注册表
  prompts.ts         各乐器 + 每轮提示词，构建 Vertex 请求体
  api.ts             搜歌 / 取音频(base64) / 跑单轮
  types.ts           TabState 等类型
  firebase.ts auth.tsx library.ts   账户 + 谱库（独立 Firebase 项目）
functions/api/       Cloudflare Pages Functions（search/audio/round）
.github/workflows/deploy.yml   push main 自动部署到 Cloudflare
```

部署与配置见 `DEPLOYMENT.md`。
