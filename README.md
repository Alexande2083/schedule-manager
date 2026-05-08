# Schedule Manager · AI 日程管理

一款 **AI 驱动**的个人日程管理 Web 应用。Today 专注执行，Week 专注分析，Mind Map 专注规划。

## 设计

参考 Linear / Vercel Analytics / Notion AI 风格：

- **极简** — 大量留白、卡片化、玻璃拟态（glass-panel + backdrop-blur）
- **深色默认** — 暗色主题，柔和阴影，高级信息层级
- **响应式** — Desktop 三栏 / Tablet 两栏 / Mobile 单栏，生产级自适应

## 页面架构

| 页面 | 定位 | 核心功能 |
|------|------|----------|
| **Today** | 执行 | 任务列表、时间安排、AI 简报、甘特图、番茄钟 |
| **本周** | 分析+规划 | 周目标、热力图、时间分配、效率趋势、AI 周报 |
| **导图** | 项目规划 | AI 扩展、节点类型、转为任务、附件、深色白板 |
| **清单** | 分类管理 | 按清单归类任务 |
| **透视** | 自定义视角 | 保存筛选条件 |
| **习惯** | 习惯追踪 | 打卡、连续天数、紧凑视图 |
| **洞察** | AI 分析 | 时段效率、标签统计、优化建议 |
| **回顾** | 复盘 | 任务完成回顾 |

### Today 页面

- **AI 今日简报** — 待办统计、高优提醒、一键排程
- **智能排程 + 周计划** — 内嵌在简报区下方，不占侧栏
- **时间安排** — 上午/下午/晚上三段预览
- **天气** — 实时天气卡片
- **日历** — 紧凑月历，农历 + 节气显示
- **完成趋势** — 任务趋势折线图
- **完成统计** — 饼图 + 条形图
- **活跃热力图** — GitHub 风格
- **任务列表** — 列表/甘特图双视图，标签筛选，子任务

### Week 页面（全新 AI 分析中心）

7 大模块，独立于 Today：

1. **Weekly Goals** — 本周重要目标大卡片 + AI 生成
2. **Weekly Heatmap** — 13 周 GitHub 风格热力图
3. **Time Allocation** — 环形图 + 按标签分类统计
4. **Productivity Trends** — 8 周趋势折线图 + AI 洞察
5. **Free Time Suggestions** — 紫色渐变 AI 卡片，空闲时段建议
6. **Weekly Review** — 完成率/最优日/专注时长 + 行为分析
7. **Week Timeline** — 7 天节奏条，点击跳转 Today

### Mind Map（AI 项目规划白板）

- **6 种节点类型** — Goal / Feature / Task / Note / Resource / Bug
- **AI 扩展** — 右键 → `✨ AI 扩展`，DeepSeek 自动生成子节点
- **AI 拆解** — `🤖 AI 拆解`，生成可执行子任务
- **转为任务** — 节点一键创建日程任务，同步到 Today
- **附件** — 粘贴 URL，自动识别图片/PDF/Markdown
- **详情面板** — 右侧滑出，改类型/优先级/管理附件
- **深色白板** — 无限画布，缩放平移，快捷键，右键菜单

---

## 效率工具

- **番茄钟** — 内置计时器，专注模式
- **AI 解析** — 粘贴文本自动提取任务
- **AI 工作总结** — 一键生成周报/月报
- **习惯追踪** — 打卡、连续天数、紧凑视图
- **每日回顾** — 自动弹出日报
- **全局快捷键** — `Ctrl+N` 快速添加、`Ctrl+T` 切换主题、`/` 搜索

## 侧栏

- 项目/标签/上下文可增删筛选
- Today / 本周 / 清单 / 导图 / 透视 / 习惯 / 洞察 / 回顾 8 个导航

## 个性化

- **字体大小** — 小/中/大三档（设置 → 主题）
- **主题** — 8 种配色方案 + 深色模式
- **毛玻璃透明度** — 可调节
- **标签颜色** — 自定义

## 数据同步

| 方式 | 说明 |
|------|------|
| **云同步** | 加密上传/下载，多设备共享（需配置 `SYNC_SECRET`） |
| **坚果云同步** | WebDAV 协议，后端代理绕过 CORS |
| **剪贴板同步** | LZString 压缩，微信/钉钉/邮件粘贴恢复 |
| **链接同步** | URL 分享，跨设备一键导入 |
| **JSON 备份** | 导入导出完整数据 |
| **ICS 导出** | 导出日历格式，可导入 Outlook/Google Calendar |
| **Markdown 周报** | 生成每周工作汇报 |
| **自动备份** | 定时备份到浏览器 localStorage |
| **PWA** | 可安装到桌面，离线使用 |

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 图表 | Recharts |
| 后端 | Express + sql.js (SQLite) |
| 部署 | Render |
| AI | DeepSeek API（任务解析、总结、导图扩展、学习分析） |

## AI 端点

| 端点 | 用途 |
|------|------|
| `POST /api/parse` | 自然语言解析为任务 |
| `POST /api/summary` | AI 工作总结 |
| `POST /api/mindmap/expand` | 思维导图 AI 扩展子节点 |

所有 AI 请求经后端代理，API Key 不暴露到前端。

## API 端点

| 端点 | 认证 | 用途 |
|------|------|------|
| `GET/POST /api/sync` | `x-sync-key` | 云同步数据 |
| `POST /api/tasks` | `x-sync-key` | 创建任务 |
| `PUT /api/tasks/:id` | `x-sync-key` | 更新任务 |
| `DELETE /api/tasks/:id` | `x-sync-key` | 删除任务 |
| `POST /api/webdav/push` | Basic Auth | 坚果云推送 |
| `POST /api/webdav/pull` | Basic Auth | 坚果云拉取 |
| `GET /api/health` | 无 | 健康检查 |

## 快速开始

```bash
npm install
npm run dev      # 开发模式
npm run build    # 生产构建
npm run server   # 启动服务
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `SYNC_SECRET` | 云同步密钥，客户端 `x-sync-key` 需一致 | ✅ |
| `AI_SUMMARY_KEY` | DeepSeek API Key | ❌ |
| `DEEPSEEK_BASE_URL` | API 地址（默认 api.deepseek.com） | ❌ |
| `PORT` | 服务端口（默认 3000） | ❌ |
| `NODE_ENV` | 环境（production 启用 HTTPS 跳转/安全头） | ❌ |

## 链接

- **在线访问**：[schedule-manager-v8bx.onrender.com](https://schedule-manager-v8bx.onrender.com/)
- **GitHub**：[Alexande2083/schedule-manager](https://github.com/Alexande2083/schedule-manager)

## 项目结构

```
├── public/              # 静态资源（PWA manifest, icons, sw.js）
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx              # Today 仪表盘
│   │   ├── WeeklyAnalytics.tsx        # Week 分析页面（7 模块）
│   │   ├── MindMapPanel.tsx           # AI 项目规划白板
│   │   ├── Sidebar.tsx                # 侧栏导航
│   │   ├── CalendarPanel.tsx          # 日历（农历+节气）
│   │   ├── HeatmapPanel.tsx           # GitHub 风格热力图
│   │   ├── TaskTrendChart.tsx         # 完成趋势图
│   │   ├── CompletionStatsPanel.tsx   # 完成统计（饼图+条形图）
│   │   ├── GanttChart.tsx             # 甘特图
│   │   ├── HabitsPanel.tsx            # 习惯追踪
│   │   ├── UserInsights.tsx           # AI 洞察
│   │   ├── ReviewPanel.tsx            # 任务回顾
│   │   ├── ChecklistPanel.tsx         # 清单管理
│   │   ├── PerspectivesPanel.tsx      # 透视视图
│   │   ├── SmartScheduler.tsx         # 智能排程
│   │   ├── WeeklyPlan.tsx             # 周计划生成
│   │   ├── TimeBlockingPanel.tsx      # 时间块规划
│   │   ├── QuadrantPanel.tsx          # 四象限视图
│   │   ├── CountdownPanel.tsx         # 倒计时
│   │   ├── ForecastPanel.tsx          # 预测分析
│   │   ├── WeatherTimeWidget.tsx      # 天气时间
│   │   ├── PomodoroModal.tsx          # 番茄钟
│   │   ├── AIParserModal.tsx          # AI 任务解析
│   │   ├── AISummaryModal.tsx         # AI 工作总结
│   │   ├── SettingsModal.tsx          # 设置面板
│   │   ├── ThemeSettings.tsx          # 主题设置
│   │   ├── NotificationSettings.tsx   # 通知设置
│   │   ├── DataSyncPanel.tsx          # 数据同步（云/坚果云/剪贴板/JSON）
│   │   ├── SearchModal.tsx            # 全局搜索
│   │   ├── BackupReminder.tsx         # 备份提醒
│   │   ├── ErrorBoundary.tsx          # 错误边界
│   │   ├── MobileHeader.tsx           # 移动端顶部
│   │   ├── MobileBottomNav.tsx        # 移动端底部导航
│   │   ├── MobileSidebarDrawer.tsx    # 移动端侧栏
│   │   └── ui/                        # shadcn/ui 基础组件
│   ├── hooks/            # useCloudSync, useHabits, useLearningSystem, usePomodoro 等
│   ├── types/            # TypeScript 类型定义
│   └── utils/            # api, export, storage, webdav, date 工具
├── server.js             # Express 后端（Zod 校验 + 安全头 + AI 代理 + WebDAV）
├── db.js                 # SQLite 初始化（WAL 模式 + 损坏恢复）
├── render.yaml           # Render 部署配置
└── data.db               # SQLite 数据库文件
```
