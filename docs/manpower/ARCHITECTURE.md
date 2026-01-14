# Manpower 模块架构说明

> 版本: v2.2.0
> 更新日期: 2026-01-14

## 📋 目录

- [模块概述](#模块概述)
- [架构设计](#架构设计)
- [目录结构](#目录结构)
- [核心组件](#核心组件)
- [数据流](#数据流)
- [关键技术](#关键技术)
- [最佳实践](#最佳实践)

---

## 模块概述

Manpower（人力排布）模块是一个用于管理和可视化研发团队人力资源分配的工具。

### 核心功能

1. **配置管理**
   - 团队配置（容量、颜色、标号）
   - 项目配置（状态、发布日期、关联团队）
   - 时间点配置（名称、日期、类型）

2. **人力分配**
   - 可编辑的分配表格
   - 投入/预释双值管理
   - 自动计算和校准
   - 利用率实时监控

3. **可视化分析**
   - Sankey 流动图
   - 分布趋势图
   - 项目柱状图

4. **数据集成**
   - Excel 导入导出
   - JSON 导入导出
   - 模板下载

5. **协作支持**
   - 只读模式（分享场景）
   - 实时数据同步
   - 云端持久化

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    ManpowerView (主容器)                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Tab 1: 分配表格                      │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │        AllocationGrid                     │  │   │
│  │  │  - 多级表头                               │  │   │
│  │  │  - 可编辑单元格                           │  │   │
│  │  │  - 利用率监控                             │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Tab 2: 可视化分析                    │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  SankeyChart (流动图)                     │  │   │
│  │  │  DistributionChart (分布图)               │  │   │
│  │  │  ProjectBarChart (柱状图)                 │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Store 层 (Zustand)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ configStore  │  │  dataStore   │  │ radarStore  │  │
│  │  (适配器)     │  │   (适配器)    │  │  (核心)     │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Service 层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Excel 服务   │  │ Supabase     │  │ 工具函数    │  │
│  │ (导入导出)    │  │  (持久化)     │  │ (ID/常量)   │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 设计原则

#### 1. 适配器模式（Adapter Pattern）

**问题**: Manpower 模块需要集成到现有的 radarStore 中，但不希望侵入式修改。

**解决方案**: 使用适配器模式，通过 `configStore` 和 `dataStore` 将 radarStore 的接口适配为组件期望的接口。

```typescript
// configStore.ts - 适配器
export function useConfigStore(): ConfigState {
  const { getActiveManpowerChart, addManpowerTeam, ... } = useRadarStore()

  return {
    teams: chart?.teams ?? [],
    projects: chart?.projects ?? [],
    addTeam: (team) => addManpowerTeam(chartId, team),
    ...
  }
}
```

**优点**:
- ✅ 组件不直接依赖 radarStore
- ✅ 便于测试和迁移
- ✅ 接口清晰，职责分明

#### 2. 配置中心化（Centralized Configuration）

**问题**: 配置常量分散在各个组件中，难以维护和调整。

**解决方案**: 创建 `constants.ts` 统一管理所有配置。

```typescript
// constants.ts
export const UTILIZATION_THRESHOLDS = { critical: 110, overload: 100, ... }
export const STORAGE_KEYS = { showTeamDetails: '...', ... }
export function getUtilizationStyle(percentage: number) { ... }
```

**优点**:
- ✅ 配置易于查找和修改
- ✅ 避免魔法数字
- ✅ 支持主题定制

---

## 目录结构

```
src/components/manpower/
├── ManpowerView.tsx              # 主视图容器 (Tab 切换)
├── ManpowerToolbar.tsx           # 工具栏 (导入导出)
├── TeamBadge.tsx                 # 团队徽章组件
├── ProjectBadge.tsx              # 项目徽章组件
├── constants.ts                  # 配置常量 (NEW)
├── ManpowerView.module.css       # 主视图样式
├── ManpowerToolbar.module.css    # 工具栏样式
├── stores/
│   ├── configStore.ts            # 配置 Store 适配器
│   └── dataStore.ts              # 数据 Store 适配器
├── hooks/
│   └── useI18n.ts                # 国际化 Hook
├── modules/
│   ├── allocation/
│   │   ├── AllocationGrid.tsx    # 人力分配表格 (682 行)
│   │   └── AllocationGrid.module.css
│   ├── config/
│   │   ├── TeamConfig.tsx        # 团队配置管理
│   │   ├── ProjectConfig.tsx     # 项目配置管理
│   │   ├── TimeConfig.tsx        # 时间点配置管理
│   │   └── *.module.css          # 各模块样式
│   └── visualization/
│       ├── SankeyChart.tsx       # Sankey 流动图
│       ├── DistributionChart.tsx # 分布趋势图
│       ├── ProjectBarChart.tsx   # 项目柱状图
│       └── *.module.css          # 图表样式
└── types/
    └── index.ts                  # 类型兼容层

src/types/
└── manpower.ts                   # Manpower 类型定义

src/stores/radarStore/
└── manpowerActions.ts            # Manpower Store Actions

src/services/excel/
├── manpowerExporter.ts           # Excel 导出服务
└── manpowerImporter.ts           # Excel 导入服务

src/utils/
└── idGenerator.ts                # 统一 ID 生成器 (NEW)
```

---

## 核心组件

### 1. ManpowerView (主视图)

**职责**: Tab 容器，管理配置和可视化两个 Tab 的切换。

**关键特性**:
- 使用 Ant Design Tabs 组件
- 支持只读模式 (readonly prop)
- 集成工具栏 (导入导出)

**Props**:
```typescript
interface ManpowerViewProps {
  readonly?: boolean  // 只读模式，用于分享场景
}
```

### 2. AllocationGrid (分配表格)

**职责**: 核心的人力分配编辑表格，支持多维度数据输入和实时计算。

**关键特性**:
- **多级表头**: 时间点 → 投入/预释
- **冻结列**: 项目和团队列固定，横向滚动时保持可见
- **可编辑单元格**: 使用 InputNumber 组件，支持键盘导航
- **利用率监控**: 实时计算团队利用率，颜色标识 (绿/黄/橙/红)
- **自动计算**: 预释值自动更新下个时间点的投入值
- **折叠展开**: 支持项目级别的折叠/展开
- **团队详情**: 可选显示/隐藏团队明细行

**状态管理**:
```typescript
const [showTeamDetails, setShowTeamDetails] = useState(true)
const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
```

**利用率计算**:
```typescript
// 团队利用率 = (已分配人力 / 团队容量) × 100%
const utilization = (allocated / capacity) * 100

// 颜色阈值 (来自 constants.ts)
// > 110%: 红色 (严重超载)
// > 100%: 橙色 (超载)
// > 90%:  黄色 (警告)
// ≤ 90%:  绿色 (正常)
```

### 3. Store 适配器

#### configStore (配置适配器)

**职责**: 将 radarStore 的配置接口适配为组件期望的接口。

**提供的接口**:
```typescript
interface ConfigState {
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]

  addTeam: (team: Team) => void
  updateTeam: (id: string, updates: Partial<Team>) => void
  deleteTeam: (id: string) => void

  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void

  addTimePoint: (timePoint: TimePoint) => void
  updateTimePoint: (id: string, updates: Partial<TimePoint>) => void
  deleteTimePoint: (id: string) => void

  importConfig: (config: { teams, projects, timePoints }) => void
}
```

#### dataStore (数据适配器)

**职责**: 管理分配数据和计算逻辑。

**提供的接口**:
```typescript
interface DataState {
  allocations: AllocationMatrix
  validationResults: ValidationResult[]
  sankeyData: SankeyData | null
  isLoading: boolean

  updateAllocation: (timePointId, projectId, teamId, data) => void
  updateMultipleAllocations: (updates[]) => void

  setValidationResults: (results: ValidationResult[]) => void
  clearValidationResults: () => void

  setSankeyData: (data: SankeyData | null) => void
  setLoading: (isLoading: boolean) => void

  getAllocationByKeys: (timePointId, projectId, teamId) => Allocation
  getTeamTotalAtTime: (timePointId, teamId) => number
  getProjectTotalAtTime: (timePointId, projectId) => number
  getStatistics: () => { totalCapacity, totalAllocated, totalPrerelease }

  resetAllocations: () => void
  importAllocations: (allocations: AllocationMatrix) => void
}
```

### 4. 可视化组件

#### SankeyChart (流动图)

**职责**: 展示人力在不同时间点的流动和分配关系。

**数据结构**:
```typescript
interface SankeyData {
  nodes: SankeyNode[]  // 节点 (团队、项目)
  links: SankeyLink[]  // 连接 (人力流动)
}
```

**特性**:
- 支持团队详情展开/折叠
- 鼠标悬停显示详细信息
- 自动计算节点和连接的值

#### DistributionChart (分布趋势图)

**职责**: 饼图 + 折线图联动，展示项目人力投入趋势。

**特性**:
- 左侧饼图: 当前时间点的项目分布
- 右侧折线图: 各项目随时间的变化趋势
- 点击饼图切片高亮对应折线

#### ProjectBarChart (项目柱状图)

**职责**: 按时间段分组展示版本人力投入总览。

**特性**:
- 堆叠柱状图: 每个柱子代表一个时间点
- 颜色区分: 不同项目使用不同颜色
- 图例交互: 点击图例显示/隐藏项目

---

## 数据流

### 1. 数据读取流程

```
用户操作
  ↓
ManpowerView 组件
  ↓
useConfigStore() / useDataStore()  ← 适配器层
  ↓
useRadarStore()                     ← 核心 Store
  ↓
getActiveManpowerChart()            ← 获取当前图表
  ↓
返回 ManpowerChart 数据
  ↓
组件渲染
```

**关键点**:
- 适配器层隔离了组件和 radarStore 的直接依赖
- 所有数据通过 `getActiveManpowerChart()` 获取
- 组件只依赖适配器接口，不关心底层实现

### 2. 数据写入流程

```
用户编辑 (AllocationGrid)
  ↓
updateAllocation(timePointId, projectId, teamId, data)
  ↓
dataStore.updateAllocation()        ← 适配器方法
  ↓
radarStore.updateAllocation()       ← 核心 Store 方法
  ↓
更新 chart.allocations[timePointId][projectId][teamId]
  ↓
触发 debouncedSaveChart()           ← 防抖保存 (500ms)
  ↓
Supabase API                        ← 云端持久化
  ↓
更新成功，UI 自动刷新
```

**关键点**:
- 防抖保存避免频繁 API 调用
- 批量更新使用 `updateMultipleAllocations`
- 保存失败时有错误提示

### 3. Excel 导入流程

```
用户选择文件
  ↓
ManpowerToolbar.handleImport()
  ↓
importManpowerFromExcel(file)       ← Service 层
  ↓
解析 Excel 文件 (SheetJS)
  ↓
数据校验 (ValidationResult[])
  ↓
返回 { isValid, data, errors, warnings }
  ↓
configStore.importConfig()          ← 导入配置
  ↓
dataStore.importAllocations()       ← 导入分配数据
  ↓
批量更新到 radarStore
  ↓
自动保存到 Supabase
  ↓
显示成功/错误消息
```

**关键点**:
- 先校验后导入，避免脏数据
- 支持部分导入 (只导入配置或只导入分配)
- 错误和警告分别处理

### 4. 可视化数据流

```
AllocationGrid 数据变化
  ↓
dataStore.allocations 更新
  ↓
SankeyChart / DistributionChart / ProjectBarChart
  ↓
useMemo 重新计算图表数据
  ↓
生成 ECharts option
  ↓
ReactECharts 渲染
```

**关键点**:
- 使用 `useMemo` 缓存计算结果
- 只在依赖变化时重新计算
- ECharts 自动处理动画过渡

---

## 关键技术

### 1. Ant Design v5

**使用的组件**:
- `Table`: 分配表格的基础组件
- `Form`: 配置表单
- `Modal`: 弹窗
- `InputNumber`: 数字输入
- `DatePicker`: 日期选择
- `ColorPicker`: 颜色选择
- `Select`: 下拉选择
- `Button`, `Space`, `Divider`: 基础组件

**主题集成**:
```typescript
// 通过 CSS 变量与主项目主题系统集成
ConfigProvider.config({
  theme: {
    token: {
      colorPrimary: 'var(--primary-color)',
      colorBgContainer: 'var(--card-bg)',
      // ...
    }
  }
})
```

### 2. ECharts 5

**使用的图表类型**:
- **Sankey**: 流动图，展示人力流动
- **Pie**: 饼图，展示项目分布
- **Line**: 折线图，展示趋势
- **Bar**: 柱状图，展示版本投入

**配置要点**:
```typescript
// 主题适配
const theme = isDark ? 'dark' : 'light'

// 响应式
const option = {
  grid: { containLabel: true },
  // ...
}

// 动画
const option = {
  animation: true,
  animationDuration: 600,
  // ...
}
```

### 3. CSS Modules + CSS Variables

**样式隔离**:
```typescript
import styles from './AllocationGrid.module.css'

<div className={styles.container}>
  <div className={styles.header}>...</div>
</div>
```

**主题变量**:
```css
/* 使用主项目的 CSS 变量 */
.container {
  background: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

/* 深色/浅色主题自动切换 */
[data-theme='dark'] .container {
  /* CSS 变量自动更新 */
}
```

### 4. TypeScript 类型系统

**核心类型**:
```typescript
// 团队
interface Team {
  id: string
  name: string
  capacity: number
  color: string
  badge: string
}

// 项目
interface Project {
  id: string
  name: string
  status: 'planning' | 'in-progress' | 'released'
  releaseDate?: string
  color: string
  pattern: string
  teams: string[]  // 关联的团队 ID
}

// 时间点
interface TimePoint {
  id: string
  name: string
  date: string
  type: 'milestone' | 'sprint' | 'quarter'
}

// 分配矩阵
type AllocationMatrix = {
  [timePointId: string]: {
    [projectId: string]: {
      [teamId: string]: {
        occupied: number    // 投入人力
        prerelease: number  // 预释人力
      }
    }
  }
}

// Manpower 图表
interface ManpowerChart {
  id: string
  name: string
  chart_type: 'manpower'
  order: number
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]
  allocations: AllocationMatrix
  createdAt: number
  updatedAt: number
}
```

### 5. Zustand Store

**适配器模式**:
```typescript
// configStore.ts - 适配器
export function useConfigStore(): ConfigState {
  const { getActiveManpowerChart, addManpowerTeam, ... } = useRadarStore()

  const chart = getActiveManpowerChart()

  return {
    teams: chart?.teams ?? [],
    addTeam: (team) => addManpowerTeam(chart.id, team),
    // ...
  }
}
```

**优点**:
- 组件不直接依赖 radarStore
- 便于测试和迁移
- 接口清晰，职责分明

### 6. SheetJS (xlsx)

**Excel 导出**:
```typescript
import * as XLSX from 'xlsx'

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet(data)
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
XLSX.writeFile(wb, 'manpower.xlsx')
```

**Excel 导入**:
```typescript
const wb = XLSX.read(await file.arrayBuffer())
const ws = wb.Sheets[wb.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(ws)
```

---

## 最佳实践

### 1. 组件开发

**单一职责原则**:
```typescript
// ✅ 好 - 职责清晰
const TeamBadge = ({ team }) => (
  <span style={{ backgroundColor: team.color }}>
    {team.badge} {team.name}
  </span>
)

// ❌ 差 - 职责混乱
const TeamBadge = ({ team, onEdit, onDelete, showActions }) => {
  // 包含了编辑、删除等业务逻辑
}
```

**Props 类型定义**:
```typescript
// ✅ 好 - 明确的类型定义
interface AllocationGridProps {
  readonly?: boolean
}

// ❌ 差 - 使用 any
interface AllocationGridProps {
  config?: any
}
```

### 2. 状态管理

**使用适配器隔离依赖**:
```typescript
// ✅ 好 - 通过适配器访问
const { teams, addTeam } = useConfigStore()

// ❌ 差 - 直接依赖 radarStore
const { getActiveManpowerChart, addManpowerTeam } = useRadarStore()
```

**批量更新优化**:
```typescript
// ✅ 好 - 批量更新
updateMultipleAllocations([
  { timePointId: 't1', projectId: 'p1', teamId: 'team1', data: { occupied: 5, prerelease: 0 } },
  { timePointId: 't1', projectId: 'p1', teamId: 'team2', data: { occupied: 3, prerelease: 0 } },
])

// ❌ 差 - 多次单独更新
updateAllocation('t1', 'p1', 'team1', { occupied: 5, prerelease: 0 })
updateAllocation('t1', 'p1', 'team2', { occupied: 3, prerelease: 0 })
```

### 3. 样式开发

**使用 CSS 变量**:
```css
/* ✅ 好 - 使用主题变量 */
.container {
  background: var(--card-bg);
  color: var(--text-primary);
}

/* ❌ 差 - 硬编码颜色 */
.container {
  background: #ffffff;
  color: #000000;
}
```

**CSS Modules 命名**:
```typescript
// ✅ 好 - 语义化命名
<div className={styles.allocationGrid}>
  <div className={styles.header}>...</div>
</div>

// ❌ 差 - 无意义命名
<div className={styles.container1}>
  <div className={styles.box2}>...</div>
</div>
```

### 4. 性能优化

**使用 useMemo 缓存计算**:
```typescript
// ✅ 好 - 缓存计算结果
const sankeyData = useMemo(() => {
  return generateSankeyData(allocations, teams, projects)
}, [allocations, teams, projects])

// ❌ 差 - 每次渲染都计算
const sankeyData = generateSankeyData(allocations, teams, projects)
```

**避免不必要的重渲染**:
```typescript
// ✅ 好 - 使用 useCallback
const handleUpdate = useCallback((id, data) => {
  updateTeam(id, data)
}, [updateTeam])

// ❌ 差 - 每次渲染创建新函数
const handleUpdate = (id, data) => {
  updateTeam(id, data)
}
```

### 5. 错误处理

**用户友好的错误提示**:
```typescript
// ✅ 好 - 清晰的错误信息
try {
  await importManpowerFromExcel(file)
  message.success(t.toolbar.importSuccess)
} catch (error) {
  message.error(`${t.toolbar.importFailed}: ${error.message}`)
  console.error('Import error:', error)
}

// ❌ 差 - 静默失败
try {
  await importManpowerFromExcel(file)
} catch (error) {
  console.error(error)
}
```

**数据校验**:
```typescript
// ✅ 好 - 先校验后处理
const result = await importManpowerFromExcel(file)
if (!result.isValid) {
  message.error(result.errors.map(e => e.message).join('\n'))
  return
}
// 处理有效数据

// ❌ 差 - 直接处理，可能导致脏数据
const data = await importManpowerFromExcel(file)
importAllocations(data.allocations)
```

### 6. 代码组织

**统一的 ID 生成**:
```typescript
// ✅ 好 - 使用统一工具
import { idGenerators } from '@/utils/idGenerator'
const newTeam = { id: idGenerators.team(), ... }

// ❌ 差 - 多种方式混用
const newTeam = { id: nanoid(), ... }
const newProject = { id: crypto.randomUUID(), ... }
const newTimePoint = { id: `time-${Date.now()}`, ... }
```

**配置集中管理**:
```typescript
// ✅ 好 - 从 constants 导入
import { UTILIZATION_THRESHOLDS, getUtilizationStyle } from './constants'
if (percentage > UTILIZATION_THRESHOLDS.critical) { ... }

// ❌ 差 - 魔法数字
if (percentage > 110) { ... }
```

### 7. 国际化

**完整的 i18n 支持**:
```typescript
// ✅ 好 - 所有文本都国际化
const { t } = useI18n()
<Button>{t.manpower.addTeam}</Button>

// ❌ 差 - 硬编码文本
<Button>添加团队</Button>
```

### 8. 只读模式支持

**Props 传递**:
```typescript
// ✅ 好 - 支持只读模式
<ManpowerView readonly={isShareMode} />

// 组件内部
<InputNumber disabled={readonly} />
{!readonly && <Button>编辑</Button>}
```

---

## 总结

Manpower 模块是一个**高质量、易维护、功能完整**的生产级代码模块。

**核心优势**:
- ✅ **架构清晰**: 适配器模式隔离依赖
- ✅ **类型完善**: 完整的 TypeScript 类型定义
- ✅ **代码质量高**: 统一的 ID 生成、配置集中管理
- ✅ **可维护性强**: 代码重复率低、职责分明
- ✅ **功能完整**: 配置、分配、可视化、导入导出
- ✅ **用户体验好**: 只读模式、错误处理、国际化

**技术栈**:
- React 18 + TypeScript
- Ant Design v5
- ECharts 5
- Zustand (适配器模式)
- CSS Modules + CSS Variables
- SheetJS (Excel)

**文档完整性**:
- ✅ 架构说明 (本文档)
- ✅ 优化记录 (`OPTIMIZATION_2026_01.md`)
- ✅ 主文档更新 (`CLAUDE.md`)

---

**文档版本**: v1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14
