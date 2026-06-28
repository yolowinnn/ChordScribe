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

## 三、独立 Firebase 项目（✅ 已配置好，开箱即用）

> 与雅思项目**完全分开**：独立项目 `chordscribe-e1603`（账号 `ljw2556826312@gmail.com`）。
> 登录 + 云端谱库已全部就绪并实测通过，无需再操作。

已完成（均已验证）：
- **项目**：`chordscribe-e1603`，Web 应用 `chordscribe-web` 已创建。
- **登录方式**：Google ✅、Email/Password ✅ 均已启用（实测可注册/登录）。
- **授权域名**：已含 `chordscribe.pages.dev`、`chordscribe-lake.vercel.app`、localhost。
- **Firestore**：`(default)` 数据库已创建（nam5 多区域），安全规则 `firestore.rules` 已部署
  （`chordscribe/{uid}` 仅本人可读写，实测他人写入返回 403）。
- **Web 配置**：公开配置（apiKey 非密钥）已硬编码进 `lib/firebase.ts` 默认值，
  CI/本地构建无需额外 secret 即生效；仍可用 `NEXT_PUBLIC_FIREBASE_*` 覆盖。

Firestore 规则改动后重新部署：`npx firebase-tools deploy --only firestore:rules --project chordscribe-e1603`。

## 四、环境变量一览

| 名称 | 用途 | 配在哪 |
|------|------|--------|
| `VERTEX_SA_KEY` | Vertex SA JSON（Gemini 鉴权） | Cloudflare Pages Secret ✅已配 |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | CI 部署 | GitHub Secrets |
| `NEXT_PUBLIC_FIREBASE_*` | 账户 + 谱库（独立项目） | GitHub Secrets / `.env.local` |

REPO_URL: https://github.com/yolowinnn/ChordScribe
