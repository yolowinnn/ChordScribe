# ChordScribe — 部署与配置

## 🟢 线上地址

- **Cloudflare Pages（主，国内可达）**: https://chordscribe.pages.dev
- GitHub 仓库（个人）: https://github.com/yolowinnn/ChordScribe
  （推送用 `github-yolo` SSH 别名：`git@github-yolo:yolowinnn/ChordScribe.git`）
- 旧 Vercel 部署（境外，备用）: https://chordscribe-lake.vercel.app

## 架构一句话

静态前端（Next.js 导出）+ Cloudflare Pages Functions（`functions/api/*`）调用
Vertex Gemini 2.5 Pro。账户/谱库用**独立 Firebase 项目**。详见 `PRODUCT.md`。

---

## 一、Cloudflare（已部署）

- 账号: `Ljw2556826312@gmail.com`，Account ID `5cf6ad023efbef7a1da68509b1b0da1e`
- Pages 项目: `chordscribe`，生产分支 `main`
- 已配置 Secret：`VERTEX_SA_KEY`（Vertex service account JSON，项目 `im-drawing-462011`）

手动部署（本地）:
```bash
npm run build
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=5cf6ad023efbef7a1da68509b1b0da1e \
  npx wrangler pages deploy out --project-name=chordscribe --branch=main
```

## 二、main 分支自动部署（二选一）

**方式 A · GitHub Actions（已内置 `.github/workflows/deploy.yml`，推荐）**
在 GitHub 仓库 `yolowinnn/ChordScribe` → Settings → Secrets and variables → Actions 添加：
| Secret | 值 |
|--------|----|
| `CLOUDFLARE_API_TOKEN` | `cfut_...`（你给的 Cloudflare token） |
| `CLOUDFLARE_ACCOUNT_ID` | `5cf6ad023efbef7a1da68509b1b0da1e` |
| `NEXT_PUBLIC_FIREBASE_*` | （可选）见下方 Firebase 配置，配齐才开启云端 |

之后每次 push 到 main 自动构建 + 部署。也可在 Actions 页手动触发。

**方式 B · Cloudflare 控制台连 Git**
Cloudflare → Workers & Pages → chordscribe → Settings → Build → Connect to Git，
选 `yolowinnn/ChordScribe`，分支 `main`，构建命令 `npm run build`，输出目录 `out`。
（需在控制台授权 GitHub，一次性。）

## 三、独立 Firebase 项目（账户 + 谱库，需你创建一次）

> 与雅思项目分开：**一个产品一个 Firebase 项目 / 一个数据库**，互不干扰。
> 不配置也能用（自动降级为「仅本地保存」），配置后才有登录 + 云端跨设备同步。

1. https://console.firebase.google.com → 新建项目，如 `chordscribe`（免费 Spark，一个 Google 账号可建多个项目）。
2. Authentication → 开启 **Google** 和 **Email/Password** 登录方式。
3. Authentication → Settings → Authorized domains → 添加 `chordscribe.pages.dev`（Google 登录需要）。
4. Firestore Database → 创建（生产模式）→ 规则加：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /chordscribe/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. 项目设置 → 你的应用 → 添加 Web 应用，拿到 firebaseConfig，把 6 个值填到 GitHub Secrets：
   `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` /
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` /
   `NEXT_PUBLIC_FIREBASE_SENDER_ID` / `NEXT_PUBLIC_FIREBASE_APP_ID`
6. 重新触发部署（push 或 Actions 手动运行）。完成后登录 + 云端谱库即生效。

本地开发时把同样的值写进 `.env.local`（已 gitignore）。

## 四、环境变量一览

| 名称 | 用途 | 配在哪 |
|------|------|--------|
| `VERTEX_SA_KEY` | Vertex SA JSON（Gemini 鉴权） | Cloudflare Pages Secret ✅已配 |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | CI 部署 | GitHub Secrets |
| `NEXT_PUBLIC_FIREBASE_*` | 账户 + 谱库（独立项目） | GitHub Secrets / `.env.local` |

REPO_URL: https://github.com/yolowinnn/ChordScribe
