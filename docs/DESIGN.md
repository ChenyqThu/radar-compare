# 技术设计文档

## Radar Compare - 竞品能力对比可视化工具

**版本**: 1.0.0
**更新日期**: 2025-01-09

---

## 1. 技术架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        React 18 App                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Navbar    │  │  RadarTabs  │  │      Toolbar        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     RadarChart                          ││
│  │  ┌─────────────────┐    ┌─────────────────────────┐     ││
│  │  │   Main Radar    │    │   Sub-dimension Radar   │     ││
│  │  │   (ECharts)     │    │       (ECharts)         │     ││
│  │  └─────────────────┘    └─────────────────────────┘     ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Settings Drawer                        ││
│  │  ┌─────────────────────┐  ┌─────────────────────┐       ││
│  │  │  DimensionManager   │  │   VendorManager     │       ││
│  │  │  + Sunburst Chart   │  │                     │       ││
│  │  └─────────────────────┘  └─────────────────────┘       ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                        State Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ radarStore  │  │  uiStore    │  │     i18nStore       │  │
│  │  (Zustand)  │  │  (Zustand)  │  │     (Zustand)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                       Service Layer                         │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   IndexedDB (Dexie) │  │   Excel Service (SheetJS)   │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| React | 18.x | 主流框架，生态完善 |
| TypeScript | 5.x | 类型安全，开发体验好 |
| Vite | 6.x | 快速构建，HMR 优秀 |
| Ant Design | 5.x | 企业级 UI 组件库 |
| ECharts | 5.x | 强大的图表库，雷达图支持好 |
| Zustand | 4.x | 轻量状态管理，API 简洁 |
| @dnd-kit | 6.x | 现代化拖拽库，性能好 |
| Dexie | 4.x | IndexedDB 封装，API 友好 |
| SheetJS | 0.x | Excel 读写支持 |

---

## 2. 数据模型设计

### 2.1 核心实体

```typescript
// 子维度
interface SubDimension {
  id: string              // nanoid 生成
  name: string            // 维度名称
  description: string     // 描述（预留）
  weight: number          // 权重 0-100
  order: number           // 排序序号
  scores: Record<string, number>  // vendorId -> score (0-10)
}

// 维度
interface Dimension {
  id: string
  name: string
  description: string
  weight: number
  order: number
  scores: Record<string, number>  // 无子维度时使用
  subDimensions: SubDimension[]
}

// 对比对象
interface Vendor {
  id: string
  name: string
  color: string           // HEX 颜色值
  markerType: MarkerType  // 标记形状
  order: number
  visible: boolean        // 是否显示
}

// 雷达图
interface RadarChart {
  id: string
  name: string
  order: number
  dimensions: Dimension[]
  vendors: Vendor[]
  createdAt: number       // 时间戳
  updatedAt: number
}

// 项目
interface Project {
  id: string
  name: string
  radarCharts: RadarChart[]
  activeRadarId: string | null
}
```

### 2.2 标记类型

```typescript
type MarkerType =
  | 'circle'    // 圆形
  | 'rect'      // 矩形
  | 'roundRect' // 圆角矩形
  | 'triangle'  // 三角形
  | 'diamond'   // 菱形
  | 'pin'       // 图钉
  | 'arrow'     // 箭头
```

### 2.3 数据流向

```
用户操作 → Store Action → State 更新 → 组件重渲染
                ↓
           IndexedDB 持久化 (防抖 500ms)
```

---

## 3. 状态管理设计

### 3.1 Store 划分

#### radarStore (业务数据)

```typescript
interface RadarState {
  // 状态
  currentProject: Project | null
  isLoading: boolean

  // 项目操作
  loadProject: () => Promise<void>

  // 雷达图操作
  addRadarChart: () => void
  deleteRadarChart: (id: string) => void
  duplicateRadarChart: (id: string) => void
  renameRadarChart: (id: string, name: string) => void
  setActiveRadar: (id: string) => void

  // 维度操作
  addDimension: () => void
  updateDimension: (id: string, data: Partial<Dimension>) => void
  deleteDimension: (id: string) => void
  reorderDimensions: (from: number, to: number) => void

  // 子维度操作
  addSubDimension: (dimId: string) => void
  updateSubDimension: (dimId: string, subId: string, data: Partial<SubDimension>) => void
  deleteSubDimension: (dimId: string, subId: string) => void

  // 系列操作
  addVendor: () => void
  updateVendor: (id: string, data: Partial<Vendor>) => void
  deleteVendor: (id: string) => void
  reorderVendors: (from: number, to: number) => void

  // 评分操作
  setDimensionScore: (dimId: string, vendorId: string, score: number) => void
  setSubDimensionScore: (dimId: string, subId: string, vendorId: string, score: number) => void
}
```

#### uiStore (UI 状态)

```typescript
interface UIState {
  // 主题
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // 设置抽屉
  settingsDrawerVisible: boolean
  activeSettingsTab: 'dimension' | 'vendor'
  openSettingsDrawer: () => void
  closeSettingsDrawer: () => void

  // 其他 UI 状态
  importModalVisible: boolean
  setImportModalVisible: (visible: boolean) => void
}
```

#### i18nStore (国际化)

```typescript
interface I18nState {
  language: 'zh-CN' | 'en-US'
  setLanguage: (lang: 'zh-CN' | 'en-US') => void
  t: Locale  // 当前语言的翻译对象
}
```

### 3.2 持久化策略

| Store | 存储位置 | 策略 |
|-------|----------|------|
| radarStore | IndexedDB | 防抖 500ms 自动保存 |
| uiStore | localStorage | 主题偏好持久化 |
| i18nStore | localStorage | 语言偏好持久化 |

---

## 4. 组件设计

### 4.1 组件层级

```
App
├── Navbar                    # 顶部导航
│   ├── Logo                  # 品牌 Logo
│   └── Controls              # 语言/主题切换
├── Header
│   ├── RadarTabs             # Tab 切换
│   └── Toolbar               # 工具栏
├── RadarChart                # 雷达图区域
│   ├── MainRadar             # 主雷达图
│   └── SubRadar              # 子维度雷达图
├── SettingsButton            # 浮动设置按钮
├── SettingsDrawer            # 设置抽屉
│   ├── DimensionManager      # 维度管理
│   │   ├── SortableRow       # 可拖拽行
│   │   └── SunburstChart     # 旭日图
│   ├── VendorManager         # 系列管理
│   │   ├── ColorPalette      # 颜色选择器
│   │   └── MarkerSelector    # 标记选择器
│   └── ScoreSummary          # 总分展示
└── ImportModal               # 导入弹窗
```

### 4.2 核心组件职责

| 组件 | 职责 |
|------|------|
| RadarChart | 雷达图渲染、双图布局控制 |
| DimensionManager | 维度 CRUD、拖拽排序、评分编辑 |
| VendorManager | 系列 CRUD、颜色/标记设置 |
| RadarTabs | Tab 切换、右键菜单、编辑 |

---

## 5. 样式设计

### 5.1 CSS 变量体系

```css
:root {
  /* 颜色 */
  --color-primary: #1677ff;
  --color-success: #52c41a;
  --color-error: #ff4d4f;

  /* 文本 */
  --color-text: rgba(0, 0, 0, 0.88);
  --color-text-secondary: rgba(0, 0, 0, 0.65);
  --color-text-tertiary: rgba(0, 0, 0, 0.45);

  /* 背景 */
  --color-bg-container: #ffffff;
  --color-bg-elevated: #ffffff;
  --color-fill: rgba(0, 0, 0, 0.04);

  /* 边框 */
  --color-border: #d9d9d9;
  --color-border-secondary: #f0f0f0;

  /* 阴影 */
  --shadow-elevated: 0 6px 16px rgba(0, 0, 0, 0.08);
}

[data-theme='dark'] {
  --color-text: rgba(255, 255, 255, 0.92);
  --color-bg-container: #141414;
  /* ... */
}
```

### 5.2 动画规范

```css
/* 过渡曲线 */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* 过渡时长 */
--duration-fast: 0.15s;
--duration-normal: 0.2s;
--duration-slow: 0.3s;
```

---

## 6. 分数计算

### 6.1 算法实现

```typescript
// 获取维度分数
function getDimensionScore(dimension: Dimension, vendorId: string): number {
  if (dimension.subDimensions.length === 0) {
    // 无子维度：直接使用维度分数
    return dimension.scores[vendorId] ?? 0
  }

  // 有子维度：加权平均
  const totalWeight = dimension.subDimensions.reduce(
    (sum, sub) => sum + sub.weight, 0
  )

  if (totalWeight === 0) return 0

  return dimension.subDimensions.reduce((sum, sub) => {
    const score = sub.scores[vendorId] ?? 0
    return sum + score * (sub.weight / totalWeight)
  }, 0)
}

// 获取总分
function getTotalScore(dimensions: Dimension[], vendorId: string): number {
  const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0)

  if (totalWeight === 0) return 0

  return dimensions.reduce((sum, dim) => {
    const score = getDimensionScore(dim, vendorId)
    return sum + score * (dim.weight / totalWeight)
  }, 0)
}
```

---

## 7. 数据导入导出

### 7.1 Excel 格式

```
| 维度 | 子维度 | 权重 | Vendor1 | Vendor2 | ... |
|------|--------|------|---------|---------|-----|
| 功能 |        | 30   | 8       | 7       | ... |
|      | 功能A  | 50   | 9       | 8       | ... |
|      | 功能B  | 50   | 7       | 6       | ... |
| 性能 |        | 25   | 8       | 9       | ... |
```

### 7.2 JSON 格式

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-01-09T12:00:00.000Z",
  "project": {
    "id": "xxx",
    "name": "竞品对比",
    "radarCharts": [...]
  }
}
```

---

## 8. 性能优化

### 8.1 渲染优化

- React.memo 包装纯展示组件
- useMemo 缓存计算结果
- useCallback 稳定回调引用
- 虚拟化长列表（如需要）

### 8.2 状态优化

- Zustand 选择器避免不必要的订阅
- 防抖保存避免频繁 IO
- 批量更新减少重渲染

### 8.3 构建优化

- 代码分割
- Tree shaking
- 资源压缩

---

## 9. 测试策略

### 9.1 测试类型

| 类型 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | 工具函数、Store |
| 组件测试 | React Testing Library | 核心组件 |
| E2E 测试 | Playwright | 关键用户流程 |

### 9.2 测试重点

- 分数计算逻辑
- 拖拽排序功能
- 数据导入导出
- 主题/语言切换

---

## 10. 部署方案

### 10.1 构建产物

```bash
npm run build
# 产出 dist/ 目录
```

### 10.2 部署方式

- 静态托管：GitHub Pages / Vercel / Netlify
- CDN 加速
- 无需服务端

### 10.3 环境变量

当前版本无需环境变量配置。
