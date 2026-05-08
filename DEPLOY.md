# Render 部署指南

## 一键部署步骤

### 1. 准备代码

确保代码已推送到 GitHub：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 2. 在 Render 上部署

**方式一：使用 Blueprint（推荐）**

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 **New +** → **Blueprint**
3. 选择你的 GitHub 仓库
4. Render 会自动读取 `render.yaml` 配置
5. 点击 **Apply**
6. 部署完成后，Render 会提供一个 `https://你的项目.onrender.com` 地址

**方式二：手动创建 Web Service**

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 **New +** → **Web Service**
3. 选择你的 GitHub 仓库
4. 填写配置：
   - **Name**: `schedule-manager`（或你喜欢的名字）
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run server`
   - **Plan**: Free
5. 点击 **Advanced**，添加环境变量：
   - `DEEPSEEK_API_KEY` = `sk-你的DeepSeekAPIKey`
   - `NODE_VERSION` = `20`
6. 点击 **Create Web Service**

### 3. 配置 DeepSeek API Key

部署完成后，在 Render Dashboard 中找到你的服务：

1. 进入 **Environment** 标签
2. 添加环境变量：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
3. 服务会自动重新部署

### 4. 验证部署

```bash
curl https://你的项目.onrender.com/api/health
```

应该返回：
```json
{"status":"ok","aiAvailable":true,"timestamp":"..."}
```

### 5. 访问应用

打开 `https://你的项目.onrender.com`，即可使用完整功能（包括 AI 解析和工作总结）。

---

## 免费版限制（Render Free Tier）

| 限制项 | 说明 |
|--------|------|
| 休眠 | 15 分钟无访问自动休眠，下次访问需等待 30 秒唤醒 |
| 带宽 | 100 GB/月 |
| 构建 | 每次 Git push 自动构建部署 |
| 磁盘 | 512 MB |

> 建议：如果每天使用，可以加一个 [UptimeRobot](https://uptimerobot.com) 免费监控，每 5 分钟 ping 一次，保持服务不休眠。

---

## 本地开发 + Render 生产

本地开发时使用两个终端：

```bash
# 终端 1：后端
npm run server        # localhost:3000

# 终端 2：前端
npm run dev           # localhost:5173（自动代理 /api 到后端）
```

生产环境只需 Render 一个服务即可，前后端一体化。
