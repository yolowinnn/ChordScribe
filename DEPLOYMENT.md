# ChordScribe — 部署信息

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
