# 日程管理器 / Schedule Manager

一款**无需登录、即开即用**的个人日程管理 Web 应用。部署在 Render，支持云同步，多设备无缝切换。

## 设计

采用 SaaS 产品级 UI 设计，参考 Linear / Notion / Stripe Dashboard 风格：

- **极简** — 大量留白、高对比层级、卡片化布局
- **动效** — Framer Motion 驱动的微交互动画（卡片上浮、stagger 递进、模态缩放）
- **响应式** — 生产级三档自适应布局（Desktop 三栏 / Tablet 两栏 / Mobile 单栏）
- **主题** — 8 套完整配色方案（珊瑚、海洋、薄荷、薰衣草、琥珀、纯白、纯黑、液态玻璃）

### 响应式布局架构

| 设备 | 断点 | 像素范围 | Sidebar | RightPanel | 布局 |
|------|------|----------|---------|------------|------|
| Mobile | `< md` | < 768px | Hamburger Drawer | Bottom Sheet | 单栏 |
| Tablet | `md ~ lg` | 768~1023px | 可折叠 72/200px | Bottom Sheet | 两栏 |
| Desktop | `>= lg` | >= 1024px | 可折叠 72/200px | 固定 320px | 三栏 |

**布局特点：**
- Sidebar 支持 72px 图标栏和 200px 展开模式切换，状态持久化到 localStorage
- RightPanel 桌面端固定 320px，小屏通过 Bottom Sheet 访问
- 使用真正的 `display: none` 切换布局元素，非 `flex-shrink` 挤没
- 单一滚动区设计，所有 flex 子元素带 `min-w-0 min-h-0` 防撑破
- 移动端：卡片单列、热力图隐藏、padding 自适应缩小

## 功能

### 仪表盘（4 列布局）
- **AI 今日洞察** — 基于行为数据的高优任务提醒和时段建议
- **今日时间安排** — 上/下午/晚上三段时间块任务预览
- **天气** — 实时天气+农历+7 日预报
- **日历** — 月历视图，点击日期切换
- **你的效率** — 完成趋势图、任务完成率饼图+项目分布条形图、活跃热力图（自适应铺满）
- **所有任务** — 列表/甘特图双视图，标签筛选

### 核心管理
- **任务管理** — 添加、编辑、删除、拖拽排序、标记完成、子任务分解
- **日历视图** — 每日/每周任务查看，支持甘特图
- **四象限** — 重要/紧急矩阵，一键调整优先级
- **倒计时** — 截止日期倒计时显示，逾期/临近高亮
- **清单** — 按清单分类任务，今日待办一目了然
- **思维导图** — XMind 风格专业脑图：5 种配色、Bézier 曲线连接、右键菜单、键盘快捷键（Tab 子节点 / Enter 同级 / Delete 删除 / F2 重命名 / 空格折叠）、缩略图导航、PNG 导出、缩放平移
- **标签筛选** — 标签云筛选，快速过滤任务
- **透视视图** — 保存的自定义筛选视图

### 学习系统（AI 驱动）
- **用户洞察** — 分析时段效率、标签完成率、周趋势、生成优化建议
- **计划生成** — 输入目标（如「一个月完成项目文档」），AI 自动拆解为周计划和每日任务
- **智能排程** — 根据用户历史行为（高效时段、任务类型成功率），自动排序每日任务并解释原因
- **行为分析** — 记录完成时间、任务耗时、时段完成率，持续学习用户习惯

### 效率工具
- **番茄钟** — 内置番茄工作法计时器，支持**专注模式**（全屏无干扰）和**白噪音**
- **AI 智能解析** — 粘贴通知/会议纪要，自动提取任务事项；**对话模式**支持自然语言交互
- **AI 工作报告** — 一键生成周报/月报，分析工作数据并给出建议
- **习惯追踪** — 创建习惯、每日打卡、连续天数统计、紧凑7天视图+展开月历
- **每日回顾** — 自动弹出日报弹窗，展示完成率、番茄钟数和待办清单
- **全局快捷键** — `Ctrl+N` 快速添加、`Ctrl+T` 切换主题、`Ctrl+Enter` 启动番茄钟

### 侧栏管理
- **项目** — 可增删，支持筛选和颜色标识
- **标签** — 可增删，点击筛选任务
- **上下文** — 可增删，按场景过滤

### 重复任务
- 支持每天 / 每周 / 每月 / **工作日** / **自定义间隔**
- 完成时自动生成下一周期任务

### 个性化
- **8 种主题** — 亮/暗模式自由切换，毛玻璃特效
- **Markdown 笔记** — 任务备注支持 Markdown 编辑和预览

### 数据与同步
- **无登录** — 配置同步密钥后直接使用，无需注册
- **云同步** — 加密上传到云端，多设备共享数据
- **链接同步** — 数据压缩到链接中，微信/钉钉一键分享
- **剪贴板同步** — 复制/粘贴跨设备迁移数据
- **JSON 备份** — 导出备份文件，随时恢复
- **自动备份** — 定时自动保存到浏览器，支持一键下载
- **PWA 支持** — 可安装到桌面，支持离线访问

### 导出
- 日历 (.ics) 导出，导入 Outlook / Google Calendar
- Markdown 周报一键复制

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 动效 | Framer Motion |
| 图表 | Recharts（趋势图、饼图、条形图） |
| 后端 | Express + sql.js (SQLite) |
| 部署 | Render |
| AI | DeepSeek API（任务解析、工作总结、学习分析、对话交互） |
| 同步 | LZString 压缩 + 自定义云同步协议 |

## AI 说明

AI 功能由 **DeepSeek** (`deepseek-chat` 模型) 提供支持：

- **任务解析** — `AIParserModal` 从通知/纪要文本中提取任务
- **工作总结** — `AISummaryModal` 分析工作数据生成报告
- **对话交互** — 自然语言创建/查询任务
- **学习系统** — `useLearningSystem` hook 分析用户行为，生成洞察和排程

API Key 通过 `AI_SUMMARY_KEY` 环境变量配置，所有请求经后端代理（不暴露在前端）。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（前端 5173，自动代理 API 到 3000）
npm run dev

# 生产构建
npm run build
npm run server
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `SYNC_SECRET` | 云同步密钥（客户端需匹配） | ✅ |
| `AI_SUMMARY_KEY` | DeepSeek API Key | ❌（不配置则 AI 功能不可用） |
| `PORT` | 服务端口（默认 3000） | ❌ |

## 链接

- **在线访问**：[schedule-manager-v8bx.onrender.com](https://schedule-manager-v8bx.onrender.com/)
- **GitHub 仓库**：[Alexande2083/schedule-manager](https://github.com/Alexande2083/schedule-manager)

## 项目结构

```
app/
├── public/              # 静态资源（manifest.json、icons、sw.js）
├── src/
│   ├── components/       # UI 组件
│   │   ├── Dashboard.tsx              # 仪表盘（4列：AI洞察+时间安排+天气+日历 / 效率统计+任务列表）
│   │   ├── Sidebar.tsx                # 可折叠侧栏（72px/200px，项目/标签/上下文增删）
│   │   ├── MobileSidebarDrawer.tsx    # 移动端左侧滑出抽屉
│   │   ├── MobileRightPanelSheet.tsx  # 移动端/平板底部弹出面板
│   │   ├── MobileHeader.tsx           # 移动端顶部标题栏
│   │   ├── MobileBottomNav.tsx        # 移动端底部导航
│   │   ├── Header.tsx                 # 桌面端顶部标题栏
│   │   ├── RightPanel.tsx             # 桌面端固定 320px 侧边面板（四象限+倒计时）
│   │   ├── UserInsights.tsx           # 学习洞察（响应式网格）
│   │   ├── WeeklyPlan.tsx             # 计划生成
│   │   ├── SmartScheduler.tsx         # 智能排程
│   │   ├── MindMapPanel.tsx           # 思维导图（5 主题、键盘快捷键、右键菜单、PNG 导出）
│   │   ├── WeatherTimeWidget.tsx      # 天气组件（实时天气+农历+7 日预报）
│   │   ├── CalendarPanel.tsx          # 日历组件
│   │   ├── TaskItem.tsx               # 任务卡片
│   │   ├── GanttChart.tsx             # 甘特图（时间块+依赖箭头+拖拽排序）
│   │   ├── HabitsPanel.tsx            # 习惯追踪（紧凑7天视图+展开月历）
│   │   ├── HeatmapPanel.tsx           # 活跃热力图（SVG flex-1 自适应铺满）
│   │   ├── CompletionStatsPanel.tsx   # 完成统计（饼图+条形图上下排列）
│   │   ├── TaskTrendChart.tsx         # 完成趋势折线图
│   │   ├── PomodoroModal.tsx          # 番茄钟弹窗
│   │   ├── AIParserModal.tsx          # AI 任务解析+对话
│   │   ├── AISummaryModal.tsx         # AI 工作总结
│   │   ├── DataSyncPanel.tsx          # 数据同步面板
│   │   ├── SearchModal.tsx            # 全局搜索
│   │   └── ui/                        # shadcn/ui 基础组件
│   ├── hooks/            # 自定义 Hooks（useLearningSystem、useHabits、useCloudSync、usePomodoro 等）
│   ├── types/            # TypeScript 类型定义
│   └── utils/            # 工具函数
├── server.js             # Express 后端服务
├── db.js                 # SQLite 数据库初始化与查询
├── render.yaml           # Render 部署配置
└── dist/                 # 构建产物
```

## 响应式断点速查

Tailwind 断点配置（已修正为标准值）：

```js
screens: {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

常用断点类名模式：

| 类名 | 含义 | 显示范围 |
|------|------|----------|
| `md:hidden` | 仅 Mobile 显示 | < 768px |
| `hidden md:block` | Tablet + Desktop | >= 768px |
| `hidden lg:block` | 仅 Desktop | >= 1024px |
| `hidden lg:flex` | 仅 Desktop (flex) | >= 1024px |
