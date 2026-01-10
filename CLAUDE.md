# Radar Compare - 竞品能力对比可视化工具

> Claude Code 项目上下文文件

## 项目概述

纯前端竞品能力对比可视化工具，支持多雷达图 Tab 切换、维度/子维度管理、多 Vendor 对比、数据导入导出，以及中英文切换和明暗主题切换。

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
| 国际化 | 自定义 i18n (Zustand store) |

## 目录结构

```
src/
├── assets/                    # 静态资源
│   ├── omada_light.png       # 浅色主题 Logo
│   └── Omada_dark.png        # 深色主题 Logo
├── components/
│   ├── chart/
│   │   ├── RadarChart/       # 主雷达图 + 子维度雷达图
│   │   └── SubRadarDrawer/   # 子维度雷达图抽屉(已整合到RadarChart)
│   ├── common/
│   │   ├── Navbar/           # 顶部导航栏
│   │   └── GlobalControls/   # 全局控制组件(备用)
│   ├── tabs/
│   │   └── RadarTabs/        # Tab 切换管理
│   ├── settings/
│   │   ├── SettingsDrawer/   # 设置抽屉容器
│   │   ├── SettingsButton/   # 浮动设置按钮
│   │   ├── VendorManager/    # 系列管理表格
│   │   ├── DimensionManager/ # 维度管理表格 + 旭日图
│   │   └── ScoreSummary/     # 总分展示
│   ├── toolbar/
│   │   └── Toolbar/          # 工具栏(导入导出)
│   └── io/
│       └── ImportModal/      # 导入弹窗
├── locales/
│   ├── index.ts              # i18n store
│   ├── zh-CN.ts              # 中文语言包
│   └── en-US.ts              # 英文语言包
├── stores/
│   ├── radarStore.ts         # 雷达图业务数据
│   └── uiStore.ts            # UI 状态 (主题、抽屉等)
├── services/
│   ├── db/                   # IndexedDB 数据库
│   └── excel/                # Excel 导入导出
├── types/
│   ├── radar.ts              # 核心类型定义
│   ├── io.ts                 # 导入导出类型
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
- 右键菜单: 重命名、复制、删除
- 单击当前 Tab 进入编辑模式

### 5. 国际化 (i18n)

- 支持中文 (zh-CN) 和英文 (en-US)
- 点击顶部导航栏按钮切换
- 语言偏好保存到 localStorage

### 6. 主题切换

- 支持浅色/深色主题
- 基于 CSS 变量实现
- 首次加载跟随系统偏好

### 7. 数据导入导出

- **导出**: Excel (.xlsx)、JSON
- **导入**: Excel、JSON
- **模板下载**: 提供标准 Excel 模板

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
| `src/stores/radarStore.ts` | 业务数据和所有操作方法 |
| `src/stores/uiStore.ts` | UI 状态 (主题、抽屉、Tab) |
| `src/locales/index.ts` | i18n store 和语言切换 |
| `src/components/chart/RadarChart/index.tsx` | 雷达图渲染和交互 |
| `src/components/settings/DimensionManager/index.tsx` | 维度表格和旭日图 |
| `src/components/settings/VendorManager/index.tsx` | 系列管理表格 |
| `src/utils/calculation.ts` | 分数计算核心逻辑 |
| `src/services/db/index.ts` | IndexedDB 初始化和 CRUD |
| `src/styles/global.css` | CSS 变量和全局样式 |

## 注意事项

- 数据自动保存到 IndexedDB，防抖 500ms
- 设置抽屉宽度保存到 localStorage
- Tab 支持键盘快捷键: `S` 打开/关闭设置
- 所有组件支持深色模式

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
