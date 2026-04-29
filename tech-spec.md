# 技术规格文档

## 依赖

### 核心框架 (已由 init-webapp.sh 安装)
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### 额外依赖
- `date-fns` - 日期处理和格式化
- `lucide-react` - 图标库 (已随 shadcn/ui 安装)

## 组件架构

### 页面级组件
| 组件 | 文件 | 职责 |
|------|------|------|
| App | App.tsx | 根组件，管理全局状态，三栏布局 |

### 功能组件
| 组件 | 文件 | 职责 |
|------|------|------|
| TopBar | components/TopBar.tsx | 顶部导航栏：Logo、当前日期、用户信息 |
| Sidebar | components/Sidebar.tsx | 左侧栏：导航、标签筛选、番茄钟入口 |
| TaskPanel | components/TaskPanel.tsx | 中间面板：日期标题、添加任务、任务列表 |
| TaskItem | components/TaskItem.tsx | 单个任务项：复选框、标题、时间、标签、操作 |
| CalendarPanel | components/CalendarPanel.tsx | 右侧日历：月视图、日期选择 |
| PomodoroModal | components/PomodoroModal.tsx | 番茄钟弹窗 |
| AddTaskInput | components/AddTaskInput.tsx | 添加任务输入组件 |

### Hooks
| Hook | 文件 | 职责 |
|------|------|------|
| useLocalStorage | hooks/useLocalStorage.ts | localStorage 状态同步 |
| usePomodoro | hooks/usePomodoro.ts | 番茄钟计时逻辑 |

### 工具函数
| 文件 | 职责 |
|------|------|
| utils/date.ts | 日期格式化、日期比较 |
| utils/storage.ts | localStorage 读写封装 |

## 状态管理

使用 React useState + Context 管理全局状态：
- `tasks`: Task[] - 所有任务
- `selectedDate`: string - 当前选中的日期 (YYYY-MM-DD)
- `filterTag`: string | null - 当前筛选的标签
- `view`: 'today' | 'week' | 'completed' - 当前视图
- `pomodoro`: PomodoroState - 番茄钟状态

## 数据流

```
App (全局状态)
├── tasks state → TaskPanel → TaskItem
├── selectedDate → TaskPanel + CalendarPanel
├── filterTag → Sidebar + TaskPanel
└── pomodoro → Sidebar + PomodoroModal
```

## 本地存储结构

```
localStorage:
├── "sunsama-tasks" → Task[]
├── "sunsama-pomodoro" → { completedToday: number, date: string }
└── "sunsama-selected-date" → string
```

## 动画实现

- 任务完成划线：Tailwind CSS transition + conditional class
- 任务添加/删除：CSS transition opacity + translateY
- 番茄钟进度环：SVG circle + stroke-dashoffset animation
- 日历切换月份：CSS transition opacity

## 响应式策略

- 桌面端 (>1024px): 三栏布局
- 平板端 (768-1024px): 隐藏右侧日历，点击日历图标显示
- 移动端 (<768px): 单栏，底部标签导航

## 项目文件结构

```
src/
├── components/
│   ├── TopBar.tsx
│   ├── Sidebar.tsx
│   ├── TaskPanel.tsx
│   ├── TaskItem.tsx
│   ├── CalendarPanel.tsx
│   ├── PomodoroModal.tsx
│   └── AddTaskInput.tsx
├── hooks/
│   ├── useLocalStorage.ts
│   └── usePomodoro.ts
├── utils/
│   ├── date.ts
│   └── storage.ts
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```
