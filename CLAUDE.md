# Radar Compare - 竞品能力对比可视化工具

> Claude Code 项目上下文文件

## 项目概述

竞品能力对比可视化工具，支持多雷达图 Tab 切换、维度/子维度管理、多 Vendor 对比、**时间轴雷达图对比**、数据导入导出，以及中英文切换和明暗主题切换。

**云端功能**: 支持 Google/Notion OAuth 登录，登录后数据自动同步到云端，支持跨设备访问。未登录用户数据仅存储在本地。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript + Vite |
| 图表 | ECharts 5 (echarts-for-react) |
| UI 组件库 | Ant Design 5 |
| 状态管理 | Zustand (with persist middleware) |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| Excel | SheetJS (xlsx) |
| 本地存储 | IndexedDB (Dexie.js) |
| 云端后端 | Supabase (PostgreSQL + Auth + REST API) |
| 国际化 | 自定义 i18n (Zustand store) |

## 目录结构

```
src/
├── assets/                    # 静态资源
│   ├── omada_light.png       # 浅色主题 Logo
│   └── Omada_dark.png        # 深色主题 Logo
├── components/
│   ├── auth/                  # 认证组件
│   │   ├── LoginModal/       # 登录弹窗
│   │   └── UserMenu/         # 用户头像菜单 + 同步状态
│   ├── chart/
│   │   ├── RadarChart/       # 主雷达图 + 子维度雷达图
│   │   ├── SubRadarDrawer/   # 子维度雷达图抽屉(已整合到RadarChart)
│   │   └── TimelineRadarChart/ # 时间轴雷达图(双列布局)
│   ├── common/
│   │   ├── Navbar/           # 顶部导航栏
│   │   └── GlobalControls/   # 全局控制组件(备用)
│   ├── sync/                  # 同步相关组件
│   │   └── ConflictModal/    # 数据冲突解决弹窗
│   ├── share/                 # 分享相关组件
│   │   └── ShareModal/       # 分享设置弹窗
│   ├── tabs/
│   │   └── RadarTabs/        # Tab 切换管理
│   ├── settings/
│   │   ├── SettingsDrawer/   # 设置抽屉容器
│   │   ├── SettingsButton/   # 浮动设置按钮
│   │   ├── VendorManager/    # 系列管理表格
│   │   ├── DimensionManager/ # 维度管理表格 + 旭日图
│   │   ├── ScoreSummary/     # 总分展示
│   │   └── TimeMarkerPicker/ # 时间标记选择器
│   ├── timeline/
│   │   ├── TimelineSlider/   # 时间轴滑块控件
│   │   └── VendorSwitcher/   # Vendor 快速切换器
│   ├── toolbar/
│   │   └── Toolbar/          # 工具栏(导入导出+分享)
│   └── io/
│       └── ImportModal/      # 导入弹窗
├── pages/
│   └── ShareView/            # 分享链接访问页面
├── locales/
│   ├── index.ts              # i18n store
│   ├── zh-CN.ts              # 中文语言包
│   └── en-US.ts              # 英文语言包
├── stores/
│   ├── radarStore/           # 雷达图业务数据 (模块化)
│   ├── uiStore.ts            # UI 状态 (主题、抽屉等)
│   ├── authStore.ts          # 认证状态 (用户、会话)
│   └── syncStore.ts          # 同步状态 (云端同步)
├── services/
│   ├── db/                   # IndexedDB 数据库
│   ├── excel/                # Excel 导入导出
│   └── supabase/             # Supabase 云端服务
│       ├── client.ts         # Supabase 客户端初始化
│       ├── projects.ts       # 项目 CRUD 操作
│       ├── shares.ts         # 分享链接 CRUD 操作
│       └── index.ts          # 服务导出
├── types/
│   ├── radar.ts              # 核心类型定义
│   ├── io.ts                 # 导入导出类型
│   ├── auth.ts               # 认证类型
│   ├── supabase.ts           # Supabase 数据库类型
│   └── index.ts              # 类型导出
├── utils/
│   └── calculation.ts        # 分数计算逻辑
├── styles/
│   └── global.css            # 全局样式 + CSS 变量
├── App.tsx                   # 应用入口
└── main.tsx                  # 渲染入口
```

## 核心数据模型

```typescript
// 子维度
interface SubDimension {
  id: string
  name: string
  description: string
  weight: number                    // 0-100
  order: number
  scores: Record<string, number>    // vendorId -> score (0-10)
}

// 维度
interface Dimension {
  id: string
  name: string
  description: string
  weight: number                    // 0-100
  order: number
  scores: Record<string, number>    // 无子维度时直接打分
  subDimensions: SubDimension[]
}

// 对比对象(系列)
interface Vendor {
  id: string
  name: string
  color: string                     // HEX
  markerType: MarkerType            // circle | rect | roundRect | triangle | diamond | pin | arrow
  order: number
  visible: boolean
}

// 雷达图
interface RadarChart {
  id: string
  name: string
  order: number
  dimensions: Dimension[]
  vendors: Vendor[]
  createdAt: number
  updatedAt: number
  timeMarker?: TimeMarker          // 时间标记(可选)
}

// 时间标记
interface TimeMarker {
  year: number                      // 年份
  quarter?: number                  // 季度 (1-4, 可选)
  label?: string                    // 自定义标签
}

// 时间点(用于时间轴雷达图)
interface TimePoint {
  year: number
  quarter?: number
  label: string                     // 显示标签，如 "2024 Q1" 或 "2024"
  radarId: string                   // 关联的雷达图 ID
}

// 项目
interface Project {
  id: string
  name: string
  radarCharts: RadarChart[]
  activeRadarId: string | null
}
```

## 分数计算规则

- **分数范围**: 0-10 整数
- **无子维度**: 直接使用维度分数
- **有子维度**: 维度分数 = Σ(子维度分数 × 子维度权重) / Σ子维度权重
- **总分**: Σ(维度分数 × 维度权重) / Σ维度权重

## 核心功能

### 1. 雷达图

- **双雷达图布局**: 当有维度包含 ≥3 个子维度时，自动启用
  - 左侧: 主雷达图(总览)
  - 右侧: 子维度雷达图，支持左右切换
- **渐变填充**: 雷达区域使用径向渐变，从中心透明到边缘半透明
- **图例交互**: 点击图例可显示/隐藏对应 Vendor

### 2. 维度管理

- 表格内编辑维度名称、权重、分数
- 支持添加子维度
- **高级拖拽**:
  - 子维度可跨父维度移动
  - 子维度可提升为主维度
  - 主维度可降级为子维度
- **旭日图**: 表格底部展示维度权重结构

### 3. 系列管理

- PowerPoint 风格颜色选择器 (5×10 调色板)
- 标记形状可视化选择 (SVG 图标)
- 拖拽排序

### 4. Tab 管理

- 支持多个雷达图 Tab 切换
- 右键菜单: 重命名、复制、删除、设置时间标记
- 单击当前 Tab 进入编辑模式
- **笔记本标签效果**: Tab 与主卡片无缝连接，模拟实体文件夹标签效果
- **时间标记**: 为每个 Tab 设置时间点 (年份 + 可选月份)，时间徽标显示在标题右侧
- **拖拽排序**: 支持拖拽调整 Tab 顺序
- **视觉区分**: 时间轴 Tab 带有脉冲动画图标，被引用的 Tab 显示锁定标记

### 5. 时间轴雷达图

- **自动生成**: 当存在 ≥2 个带时间标记的普通雷达图 Tab 时自动创建
- **双列布局**:
  - 左侧: 主雷达图(维度总分对比)
  - 右侧: 子维度雷达图(当维度包含子维度时)，支持左右箭头切换
- **时间轴滑块**: 底部滑块控件，支持拖拽快速切换时间点
- **Vendor 切换器**: 顶部筛选器，支持单选或"All"模式
- **平滑动画**: 切换时间点时，雷达图数据以 Magic Move 效果平滑过渡 (600ms)
- **特殊图标**: Tab 带有脉冲动画的历史图标，易于识别
- **仅显示线条**: 时间轴雷达图不填充区域，仅显示轮廓线

### 6. 国际化 (i18n)

- 支持中文 (zh-CN) 和英文 (en-US)
- 点击顶部导航栏按钮切换
- 语言偏好保存到 localStorage

### 7. 主题切换

- 支持浅色/深色主题
- 基于 CSS 变量实现
- 首次加载跟随系统偏好

### 8. 数据导入导出

- **导出**: Excel (.xlsx)、JSON
- **导入**: Excel、JSON
- **模板下载**: 提供标准 Excel 模板
- **多 Tab 导出**: 支持一键导出所有 Tab 到多个 Excel 工作表
- **多 Sheet 导入**: 支持导入多个 Excel 工作表为不同的 Tab

### 9. 账号登录与云同步

- **OAuth 登录**: 支持 Google 和 Notion 账号登录
- **本地优先**: 未登录用户数据仅存储在 IndexedDB
- **自动同步**: 登录后数据自动同步到云端 (500ms 防抖)
- **首次登录**: 自动上传所有本地项目到云端
- **同步状态**: 用户头像旁显示同步状态图标 (同步中/已同步/失败/离线)
- **跨设备**: 登录后可在多设备间访问相同数据
- **离线支持**: 自动检测网络状态，离线时数据保存本地，恢复后自动同步
- **冲突解决**: 当本地和云端数据冲突时，弹窗让用户选择保留哪个版本

**技术实现**:
- 后端: Supabase (PostgreSQL + REST API)
- 认证: Supabase Auth (OAuth 2.0)
- 数据隔离: 使用独立 schema (`radar_compare`)
- RLS 策略: 用户只能访问自己的项目

### 10. 项目分享

- **分享链接**: 生成可分享的链接，支持只读或可编辑模式
- **密码保护**: 可选设置访问密码
- **过期时间**: 可选设置链接过期时间
- **访问限制**: 可选设置最大访问次数
- **链接管理**: 查看、复制、删除已创建的分享链接
- **分享视图**: 访客可通过链接直接查看项目

## 开发命令

```bash
# 安装依赖
npm install

# 开发服务器 (http://localhost:3000)
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

## 关键文件

| 文件 | 用途 |
|------|------|
| `src/stores/radarStore/index.ts` | 雷达图业务数据和所有操作方法 |
| `src/stores/uiStore.ts` | UI 状态 (主题、抽屉、Tab) |
| `src/stores/authStore.ts` | 认证状态 (用户、会话、OAuth) |
| `src/stores/syncStore.ts` | 同步状态 (云端同步、离线检测、冲突解决) |
| `src/services/supabase/client.ts` | Supabase 客户端初始化 |
| `src/services/supabase/projects.ts` | 云端项目 CRUD 操作 |
| `src/services/supabase/shares.ts` | 分享链接 CRUD 操作 |
| `src/locales/index.ts` | i18n store 和语言切换 |
| `src/components/chart/RadarChart/index.tsx` | 主雷达图渲染和交互 |
| `src/components/chart/TimelineRadarChart/index.tsx` | 时间轴雷达图(双列布局) |
| `src/components/auth/LoginModal/index.tsx` | 登录弹窗 (Google/Notion OAuth) |
| `src/components/auth/UserMenu/index.tsx` | 用户头像菜单 + 同步状态 |
| `src/components/sync/ConflictModal/index.tsx` | 数据冲突解决弹窗 |
| `src/components/share/ShareModal/index.tsx` | 分享设置弹窗 |
| `src/pages/ShareView/index.tsx` | 分享链接访问页面 |
| `src/components/timeline/TimelineSlider/index.tsx` | 时间轴滑块控件 |
| `src/components/timeline/VendorSwitcher/index.tsx` | Vendor 快速切换器 |
| `src/components/settings/DimensionManager/index.tsx` | 维度表格和旭日图 |
| `src/components/settings/VendorManager/index.tsx` | 系列管理表格 |
| `src/components/settings/TimeMarkerPicker/index.tsx` | 时间标记选择器 |
| `src/utils/calculation.ts` | 分数计算核心逻辑 |
| `src/services/db/index.ts` | IndexedDB 初始化和 CRUD |
| `src/services/excel/exporter.ts` | Excel 导出(单/多 Tab) |
| `src/services/excel/importer.ts` | Excel 导入(单/多 Sheet) |
| `src/styles/global.css` | CSS 变量和全局样式 |
| `docs/database/schema.sql` | Supabase 数据库 schema |

## ECharts 开发规范

> ⚠️ **重要**: 以下规范基于实际踩坑经验，请严格遵守以避免运行时错误。

### 1. React StrictMode 兼容性

echarts-for-react 与 React StrictMode 存在兼容性问题。StrictMode 的双重渲染/卸载机制会导致 ResizeObserver 清理错误：

```
TypeError: Cannot read properties of undefined (reading 'disconnect')
```

**当前方案**: 项目已在 `main.tsx` 中禁用 StrictMode，这对生产环境无影响（StrictMode 仅在开发环境生效）。

### 2. ECharts 配置禁止 undefined 值

ECharts 配置对象中**不能传入 undefined 值**，否则会导致内部计算错误：

```typescript
// ❌ 错误 - 当条件为 false 时传入 undefined
radar: {
  radius: showDualLayout ? '55%' : undefined,  // 会导致 Radar.resize 崩溃
}

// ✅ 正确 - 不设置该属性，让 ECharts 使用默认值
radar: {
  ...(showDualLayout && { radius: '55%' }),
}

// ✅ 或者 - 始终提供有效值
radar: {
  radius: showDualLayout ? '55%' : '60%',
}
```

### 3. 延迟渲染模式

为避免组件挂载过程中的竞态条件，ECharts 组件应使用 `mounted` 状态延迟渲染：

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
  return () => setMounted(false)
}, [])

// 等待挂载完成
if (!mounted) {
  return <div className={styles.container} />
}

return <ReactECharts option={option} />
```

### 4. 雷达图数据校验

雷达图至少需要 **3 个指标 (indicator)** 才能正常渲染：

```typescript
// 在生成 option 前校验
if (dimensions.length < 3) {
  return null  // 返回 null，不渲染图表
}

const visibleVendors = vendors.filter((v) => v.visible)
if (visibleVendors.length === 0) {
  return null
}
```

### 5. option 返回类型

`useMemo` 生成的 option 应使用 `EChartsOption | null` 类型，在数据无效时返回 `null` 而非空对象：

```typescript
const option = useMemo<EChartsOption | null>(() => {
  if (!hasValidData) return null
  // ...
}, [deps])

// 渲染时检查
if (!option) {
  return <Empty description="暂无数据" />
}
```

## React Hooks 开发规范

> ⚠️ **重要**: React Hooks 必须遵循调用规则，否则会导致运行时错误。

### 1. Hooks 必须在 Early Return 之前调用

React 要求每次渲染时 Hooks 的调用顺序和数量必须一致。如果组件有条件性的 early return，**所有 Hooks 必须在 early return 之前定义**：

```typescript
// ❌ 错误 - useCallback 在 early return 之后
const MyComponent = () => {
  const [data, setData] = useState(null)

  // Early return
  if (!data) {
    return <Empty />
  }

  // 这个 hook 在 early return 之后，会导致 hooks 数量不一致
  const handleClick = useCallback(() => {
    // ...
  }, [])

  return <div onClick={handleClick}>...</div>
}

// ✅ 正确 - 所有 hooks 在 early return 之前
const MyComponent = () => {
  const [data, setData] = useState(null)

  // 所有 hooks 先定义
  const handleClick = useCallback(() => {
    // ...
  }, [])

  // Early return 放在所有 hooks 之后
  if (!data) {
    return <Empty />
  }

  return <div onClick={handleClick}>...</div>
}
```

**典型错误信息**:
```
Uncaught Error: Rendered fewer hooks than expected.
This may be caused by an accidental early return statement.
```

### 2. 条件渲染时的 Hooks 顺序

当组件根据不同条件渲染不同内容时（如切换 Tab、切换数据源），如果 hooks 数量不一致，会导致白屏崩溃。确保所有代码路径调用相同数量的 hooks。

## 注意事项

- 数据自动保存到 IndexedDB，防抖 500ms
- 登录用户数据同时同步到 Supabase 云端
- 设置抽屉宽度保存到 localStorage
- Tab 支持键盘快捷键: `S` 打开/关闭设置
- 所有组件支持深色模式

## Supabase 后端配置

### 数据库 Schema

使用独立 schema `radar_compare`，与其他项目数据隔离。

**表结构**:
- `profiles`: 用户信息 (扩展 auth.users)
- `projects`: 项目数据 (id 使用 TEXT 类型兼容 nanoid)
- `shares`: 分享链接 (预留)
- `collaborators`: 协作者 (预留)

**RLS 策略**: 用户只能访问自己的项目，采用简化策略避免循环依赖。

详细 schema 见 `docs/database/schema.sql`。

### 环境变量

```env
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Dashboard 配置

1. **Authentication → Providers**: 启用 Google 和 Notion
2. **Authentication → URL Configuration**: 添加回调 URL
   - 开发: `http://localhost:3000/auth/callback`
   - 生产: `https://tools.chenge.ink/auth/callback`
3. **Database → Settings → Exposed schemas**: 添加 `radar_compare`

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
