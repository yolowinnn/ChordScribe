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

## 🔴 GitHub 仓库（待创建 · 卡在登录）

> **尚未创建。** 原因：本机 `gh` CLI 当前仅登录了**公司账号** `Jiawei-li_imai`，
> 个人账号 `yolowinnn` 未登录。为避免把 repo 误建到公司账号，已停下等待。

待你在终端执行后我再创建：
```bash
gh auth login            # 用浏览器登录，务必选 yolowinnn 个人账号
gh auth switch --user yolowinnn
gh api user --jq .login  # 确认输出 yolowinnn
```
确认后我会在 `yolowinnn` 下建 repo 并把地址补到这里。

<!-- REPO_URL: (待创建) -->
