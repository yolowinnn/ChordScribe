# ChordScribe — 部署信息

## v2 新增：账户登录 + 谱库持久化 + 高级 UI

- **账户体系**：复用「IELTS_learning」同一套 Firebase 项目 `ielts-study-9a0f5`
  （Google 登录 + 邮箱密码登录），同一账号通用。代码：`lib/auth.tsx` / `lib/firebase.ts`。
- **谱库持久化**：解析一次永久存储，秒开不重复解析。
  - 本地：`localStorage`（无需登录即可用，按浏览器保存）
  - 云端：Firestore `chordscribe/{uid}`（登录后跨设备同步，登录时本地↔云端智能合并）
  - 代码：`lib/library.ts`
- **高级界面**：渐变 hero / 玻璃拟态 / 动效循环进度 / 谱库卡片 / 登录弹窗。

### ⚙️ 想让「云端同步 + Google 登录」完全生效，需在 Firebase 控制台做 2 个一次性操作
> 项目：`ielts-study-9a0f5`（你 IELTS App 的同一个 Firebase 项目）。
> 不做也不影响使用——会自动降级为「仅本地保存 + 邮箱登录」。

1. **Firestore 规则**（让登录用户能存自己的谱）。Firestore → 规则 → 在 `match /databases/{db}/documents` 内加：
   ```
   match /chordscribe/{uid} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```
2. **授权域名**（Google 登录弹窗需要）。Authentication → Settings → Authorized domains → 添加：
   `chordscribe-lake.vercel.app`
   （邮箱密码登录不需要这一步，开箱即用。）

---

## 🟢 Vercel（已部署 · 个人账号）

- **线上地址（公开可访问）**: https://chordscribe-lake.vercel.app
- Vercel 账号 / scope: `ljw2556826312-6708s-projects`（个人，**非企业**）
- 项目名: `chordscribe`
- 项目控制台: https://vercel.com/ljw2556826312-6708s-projects/chordscribe

线上已验证可用：
- `POST /api/search`  → 网易云搜歌（已加 X-Real-IP 解决数据中心 IP 被墙）
- `POST /api/round`   → Gemini 2.5 Pro 单轮转译（约 85s，前端循环调用最多 5 轮）

环境变量（已配置 Production + Development）:
`GOOGLE_SERVICE_ACCOUNT_KEY`(base64) · `GCP_PROJECT` · `GCP_REGION` · `GEMINI_MODEL`

## 🟢 GitHub 仓库（已推送 · 个人账号）

- **仓库地址**: https://github.com/yolowinnn/ChordScribe
- SSH (个人账号专用别名): `git@github-yolo:yolowinnn/ChordScribe.git`
- 账号: `yolowinnn`（个人，**非公司 `Jiawei-li_imai`**）

> ⚠️ 重要：本机默认 `github.com` SSH 绑的是**公司账号**。推这个个人 repo 必须用
> SSH config 里的 **`github-yolo`** 别名（对应 `~/.ssh/id_ed25519_yolo`）：
> ```bash
> git remote set-url origin git@github-yolo:yolowinnn/ChordScribe.git
> git push origin main
> ```

REPO_URL: https://github.com/yolowinnn/ChordScribe
