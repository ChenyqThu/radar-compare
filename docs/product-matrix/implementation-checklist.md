# 产品矩阵实现清单

> **最后更新**: 2026-01-21
> **状态**: Phase 1-6 已完成，Phase 7-8 进行中

## 项目规划

### 工作量估算（更新版）

| 阶段 | 工作内容 | 预计天数 | 优先级 | 状态 |
|------|----------|----------|--------|------|
| Phase 0 | 新增功能（产品状态 + 花瓣图基础） | 2-3天 | P0 (MVP) | ✅ 完成 |
| Phase 1 | 数据模型和基础架构 | 2-3天 | P0 (MVP) | ✅ 完成 |
| Phase 2 | 配置管理模块 | 3-4天 | P0 (MVP) | ✅ 完成 |
| Phase 3 | 产品管理模块 | 3-4天 | P0 (MVP) | ✅ 完成 |
| Phase 4 | 矩阵可视化 | 4-5天 | P0 (MVP) | ✅ 完成 |
| Phase 4.5 | 花瓣图可视化（Canvas 渲染） | 3-4天 | P0 (MVP) | ✅ 完成 |
| Phase 5 | 分析模块 | 2-3天 | P1 (增强) | ✅ 完成 |
| Phase 5.5 | 花瓣图高级特性（多维度编码） | 2-3天 | P1 (增强) | ✅ 完成 |
| Phase 6 | 数据导入导出 | 2-3天 | P0 (MVP) | ✅ 完成 |
| Phase 7 | 集成和优化 | 2-3天 | P0 (MVP) | ✅ 完成 |
| Phase 8 | 测试和文档 | 1-2天 | P0 (MVP) | 进行中 |

**总工作量**：约 **25-37 天**（单人，全职）
- **MVP（最小可行产品）**：约 **20-27 天**（Phase 0, 1-4, 4.5, 6-8）
  - 包含产品状态管理和基础花瓣图可视化
- **增强功能**：约 5-10 天（Phase 5, 5.5 + 高级优化）
  - 包含花瓣图多维度编码、分析模块增强

**新增功能影响**：
- 产品状态管理：+2 天
- 花瓣图基础可视化：+3-4 天
- 花瓣图高级特性：+2-3 天（可选）

---

## 代码质量优化记录 (2026-01-21)

### Phase 1 - 代码质量修复

| 任务 | 描述 | 状态 |
|------|------|------|
| T1.1 | 删除重复的 PRODUCT_STATUS_CONFIG，统一使用 types/productMatrix.ts | ✅ 完成 |
| T1.2 | 修复 MatrixChart.tsx 中的 any 类型，使用 ECharts 类型定义 | ✅ 完成 |
| T1.3 | 为 ProductMatrixView.tsx 添加 useCallback 优化 | ✅ 完成 |
| T1.4 | 修复 analysisItems useMemo 依赖项 | ✅ 完成 |
| T1.5 | 提取 COLOR_PALETTE 到共享模块 src/utils/colorPalette.ts | ✅ 完成 |

### Phase 2 - 国际化完善

| 任务 | 描述 | 状态 |
|------|------|------|
| T2.1 | 修复 MatrixChart.tsx Tooltip 硬编码文本 | ✅ 完成 |
| T2.2 | 修复价格显示使用 priceUnit | ✅ 完成 |
| T2.3 | Excel 导出工作表名支持 i18n | ✅ 完成 |
| T2.4 | 检查确认所有翻译 key 完整 | ✅ 完成 |

### Phase 3 - 架构重构

| 任务 | 描述 | 状态 |
|------|------|------|
| T3.1 | 拆分 MatrixChart.tsx - 创建 index.tsx 主组件 | ✅ 完成 |
| T3.2 | 拆分 MatrixChart.tsx - 创建 types.ts 类型定义 | ✅ 完成 |
| T3.3 | 拆分 MatrixChart.tsx - 创建 useMatrixChartData.ts 数据处理 hook | ✅ 完成 |
| T3.4 | 拆分 MatrixChart.tsx - 创建 useChartOption.ts 图表配置 hook | ✅ 完成 |
| T3.5 | 拆分 MatrixChart.tsx - 创建 AxisToolbar.tsx 轴工具栏组件 | ✅ 完成 |

### Phase 4 - 状态管理优化

| 任务 | 描述 | 状态 |
|------|------|------|
| T4.1 | 修复筛选状态在切换图表时重置问题 | ✅ 完成 |

### Phase 5 - 功能完善

| 任务 | 描述 | 状态 |
|------|------|------|
| T5.1 | 创建 StatusFilter.tsx 状态筛选器组件 | ✅ 完成 |
| T5.2 | 创建 PetalConfigPanel.tsx 花瓣图配置面板 | ✅ 完成 |
| T5.3 | 确认 CompetitorAnalysis 和 GapAnalysis 已完善 | ✅ 完成 |
| T5.4 | 创建 ProductDetail.tsx 产品详情抽屉 | ✅ 完成 |

### 重构后的文件结构

```
src/components/productMatrix/modules/visualization/MatrixChart/
├── index.tsx              # 主组件 (< 200 行)
├── types.ts               # 类型定义
├── useMatrixChartData.ts  # 数据处理 hook
├── useChartOption.ts      # 图表配置 hook
├── AxisToolbar.tsx        # 轴工具栏组件
└── MatrixChart.module.css # 样式文件

src/components/productMatrix/modules/filters/
├── StatusFilter.tsx       # 状态筛选器
└── StatusFilter.module.css

src/components/productMatrix/modules/config/
├── PetalConfigPanel.tsx   # 花瓣图配置面板
└── PetalConfigPanel.module.css

src/components/productMatrix/modules/product/
├── ProductDetail.tsx      # 产品详情抽屉
└── ProductDetail.module.css

src/utils/
└── colorPalette.ts        # 共享调色板
```

---

## 🆕 Phase 0: 新增功能 - 产品状态与花瓣图基础（2-3天）

> 优先级：P0 (MVP)
> 说明：此阶段实现产品状态管理和花瓣图的核心功能

### 0.1 产品状态相关类型

- [ ] **更新 `src/types/productMatrix.ts`**
  ```typescript
  // 新增产品状态枚举
  enum ProductStatus {
    ON_SALE = 'on_sale',
    DISCONTINUED = 'discontinued',
    PLANNED = 'planned',
    PRE_SALE = 'pre_sale',
    EOL = 'eol',
  }

  // 产品状态配置
  interface ProductStatusConfig {
    label: string
    color: string
    icon: string
  }

  // Product 接口新增字段
  interface Product {
    // ... 现有字段
    status: ProductStatus  // 新增
  }

  // 状态筛选器类型
  interface StatusFilter {
    enabled: boolean
    selectedStatuses: ProductStatus[]
  }

  // 状态统计类型
  interface StatusStatistics {
    total: number
    byStatus: Record<ProductStatus, number>
    byVendor: Record<string, StatusVendorDistribution>
    byCellAndStatus: Record<string, StatusCellDistribution>
  }
  ```

### 0.2 花瓣图相关类型

- [ ] **更新 `src/types/productMatrix.ts`**
  ```typescript
  // 花瓣图配置
  interface PetalConfig {
    shape: 'sector' | 'petal' | 'diamond' | 'circle'
    vendorPositions: Record<string, number>
    sizeMode: 'linear' | 'log' | 'sqrt'
    minSize: number
    maxSize: number
    colorMode: 'vendor' | 'price' | 'status' | 'custom'
    opacityMode?: 'price' | 'count' | 'none'
    priceColorScale?: PriceColorScale
    enableHover: boolean
    hoverScale: number
    enableClick: boolean
    enableAnimation: boolean
    animationDuration: number
  }

  // 价格颜色映射
  interface PriceColorScale {
    type: 'sequential' | 'diverging'
    colors: string[]
    domain: [number, number]
  }

  // 花瓣数据结构（用于渲染）
  interface PetalData {
    cellKey: string
    vendorId: string
    vendor: MatrixVendor
    products: Product[]
    centerX: number
    centerY: number
    angle: number
    size: number
    color: string
    opacity: number
    vertices: Array<{ x: number; y: number }>  // 用于交互检测
  }

  // MatrixConfig 新增字段
  interface MatrixConfig {
    // ... 现有字段
    cellLayout: 'stack' | 'grid' | 'overlap' | 'petal'  // 新增 'petal'
    petalConfig?: PetalConfig  // 新增
  }
  ```

### 0.3 Store Actions 扩展

- [ ] **更新 `src/stores/radarStore/productMatrixActions.ts`**

  **产品状态相关**:
  - [ ] `updateProductStatus(chartId, productId, status)`
  - [ ] `batchUpdateProductStatus(chartId, productIds, status)`
  - [ ] `calculateStatusStatistics(chartId)` → StatusStatistics

  **花瓣图配置**:
  - [ ] `updatePetalConfig(chartId, config)`
  - [ ] `setPetalShape(chartId, shape)`
  - [ ] `setPetalColorMode(chartId, colorMode)`
  - [ ] `calculateVendorPositions(chartId)` - 根据厂商数量自动计算位置

### 0.4 默认数据工厂扩展

- [ ] **更新 `src/utils/productMatrixDefaults.ts`**
  ```typescript
  // 产品状态配置常量
  export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, ProductStatusConfig>

  // 默认花瓣图配置
  export const createDefaultPetalConfig = (): PetalConfig

  // 计算厂商位置（均匀分布）
  export const calculateVendorPositions = (vendors: MatrixVendor[]): Record<string, number>
  ```

### 0.5 产品表单中添加状态字段

- [ ] **更新 `src/components/productMatrix/modules/product/ProductForm.tsx`**
  - [ ] 添加状态下拉选择器（Select）
  - [ ] 显示状态图标和颜色
  - [ ] 默认值为 `ProductStatus.ON_SALE`
  - [ ] 表单验证（必填）

### 0.6 产品列表中添加状态列

- [ ] **更新 `src/components/productMatrix/modules/product/ProductList.tsx`**
  - [ ] 新增状态列（图标 + 文本）
  - [ ] 状态列可排序
  - [ ] 状态列可筛选
  - [ ] 状态颜色样式

### 0.7 状态筛选器（StatusFilter）

- [ ] **创建 `src/components/productMatrix/modules/filters/StatusFilter.tsx`**

  **UI 组件**:
  - [ ] Checkbox.Group（横向排列）
  - [ ] 状态选项（图标 + 标签）
  - [ ] [全选] 按钮
  - [ ] [仅在售] 快捷按钮

  **功能实现**:
  - [ ] 勾选/取消勾选 → 过滤产品
  - [ ] 与矩阵图表联动
  - [ ] 状态保存到 Store

- [ ] **创建 `src/components/productMatrix/modules/filters/StatusFilter.module.css`**
  - [ ] 复选框样式
  - [ ] 状态图标颜色
  - [ ] 横向布局

### 0.8 花瓣图配置面板（PetalConfigPanel）

- [ ] **创建 `src/components/productMatrix/modules/config/PetalConfigPanel.tsx`**

  **表单字段**:
  - [ ] 花瓣形状（Select: 菱形/扇形/花瓣/圆形）
  - [ ] 大小缩放模式（Select: 线性/平方根/对数）
  - [ ] 最小/最大尺寸（InputNumber）
  - [ ] 颜色编码（Radio: 厂商/价格/状态）
  - [ ] 透明度编码（Radio: 无/价格/数量）
  - [ ] 价格颜色映射配置（仅 colorMode=price 时显示）
  - [ ] 交互设置（Checkbox: Hover/点击/动画）

  **功能实现**:
  - [ ] 表单值绑定到 `petalConfig`
  - [ ] 改变时调用 `updatePetalConfig`
  - [ ] [重置] 按钮 → 恢复默认配置
  - [ ] 实时预览效果

- [ ] **创建 `src/components/productMatrix/modules/config/PetalConfigPanel.module.css`**

### 0.9 花瓣位置映射算法

- [ ] **创建 `src/utils/petalLayout.ts`**
  ```typescript
  // 计算厂商位置（均匀分布）
  export function calculateVendorPositions(
    vendors: MatrixVendor[]
  ): Record<string, number>

  // 计算花瓣大小
  export function calculatePetalSize(
    productCount: number,
    allCounts: number[],
    config: PetalConfig
  ): number

  // 计算花瓣颜色
  export function calculatePetalColor(
    products: Product[],
    vendor: MatrixVendor,
    config: PetalConfig
  ): string

  // 计算花瓣透明度
  export function calculatePetalOpacity(
    products: Product[],
    config: PetalConfig
  ): number

  // 线性插值颜色
  export function interpolateColor(
    colors: string[],
    t: number  // 0-1
  ): string
  ```

---

## Phase 1: 数据模型和基础架构（2-3天）

### 1.1 类型定义

- [ ] **创建 `src/types/productMatrix.ts`**
  ```typescript
  // 定义所有接口
  - ProductMatrixChart
  - MatrixVendor
  - MatrixDimension
  - DimensionOption
  - Product
  - DimensionValue (联合类型)
  - MatrixConfig
  ```

- [ ] **更新 `src/types/index.ts`**
  ```typescript
  export * from './productMatrix'
  ```

### 1.2 Zustand Store Actions

- [ ] **创建 `src/stores/radarStore/productMatrixActions.ts`**

  **Vendor CRUD**:
  - [ ] `addMatrixVendor(chartId, vendor)`
  - [ ] `updateMatrixVendor(chartId, vendorId, updates)`
  - [ ] `deleteMatrixVendor(chartId, vendorId)`
  - [ ] `reorderMatrixVendors(chartId, vendorIds)`
  - [ ] `toggleMatrixVendorVisibility(chartId, vendorId)`

  **Dimension CRUD**:
  - [ ] `addMatrixDimension(chartId, dimension)`
  - [ ] `updateMatrixDimension(chartId, dimensionId, updates)`
  - [ ] `deleteMatrixDimension(chartId, dimensionId)`
  - [ ] `reorderMatrixDimensions(chartId, dimensionIds)`
  - [ ] `addDimensionOption(chartId, dimensionId, option)`
  - [ ] `updateDimensionOption(chartId, dimensionId, optionId, updates)`
  - [ ] `deleteDimensionOption(chartId, dimensionId, optionId)`
  - [ ] `reorderDimensionOptions(chartId, dimensionId, optionIds)`

  **Product CRUD**:
  - [ ] `addProduct(chartId, product)`
  - [ ] `updateProduct(chartId, productId, updates)`
  - [ ] `deleteProduct(chartId, productId)`
  - [ ] `deleteProducts(chartId, productIds)` (批量删除)
  - [ ] `reorderProducts(chartId, productIds)`

  **Matrix Config**:
  - [ ] `updateMatrixConfig(chartId, config)`
  - [ ] `setMatrixAxes(chartId, xDimensionId, yDimensionId)`
  - [ ] `swapMatrixAxes(chartId)`

  **Chart Management**:
  - [ ] `createProductMatrixChart(name?)` → chartId
  - [ ] `deleteProductMatrixChart(chartId)`
  - [ ] `duplicateProductMatrixChart(chartId)` → newChartId

  **Data Import/Export**:
  - [ ] `importProductsFromData(chartId, products[])`
  - [ ] `exportProductsToData(chartId)` → products[]

- [ ] **集成到 `src/stores/radarStore/index.ts`**
  ```typescript
  import * as productMatrixActions from './productMatrixActions'

  // 添加到 store
  ...productMatrixActions,
  ```

### 1.3 默认数据工厂

- [ ] **创建 `src/utils/productMatrixDefaults.ts`**
  ```typescript
  - createDefaultProductMatrixChart()
  - createDefaultMatrixVendor(name, color)
  - createDefaultMatrixDimension(name, type)
  - createDefaultProduct(vendorId)
  - createDefaultMatrixConfig()
  ```

### 1.4 ID 生成器复用

- [ ] **验证 `src/utils/idGenerator.ts` 可用**
  ```typescript
  - generateId() → nanoid(10)
  - 确保与现有系统一致
  ```

### 1.5 数据库适配

- [ ] **验证 Supabase `radar_charts` 表支持**
  - chart_type: 'product_matrix' ✅
  - data 字段可存储 ProductMatrixChart 的 JSON ✅

- [ ] **测试保存和加载**
  - [ ] 保存 ProductMatrixChart 到 Supabase
  - [ ] 从 Supabase 加载 ProductMatrixChart
  - [ ] 验证数据完整性

---

## Phase 2: 配置管理模块（3-4天）

### 2.1 厂商管理（VendorConfig）

- [ ] **创建 `src/components/productMatrix/modules/config/VendorConfig.tsx`**

  **UI 组件**:
  - [ ] Ant Design Table (可编辑表格)
  - [ ] 列定义:
    - [ ] 拖拽手柄（DndKit SortableContext）
    - [ ] 厂商名称（可编辑单元格）
    - [ ] 颜色选择器（复用 VendorManager 的 ColorPicker）
    - [ ] 可见性 Switch
    - [ ] 操作按钮（编辑、删除）

  **功能实现**:
  - [ ] [+ 添加厂商] 按钮 → 新增一行
  - [ ] 单元格编辑 → 调用 `updateMatrixVendor`
  - [ ] 拖拽排序 → 调用 `reorderMatrixVendors`
  - [ ] 删除确认弹窗 → 检查关联产品数量
  - [ ] 颜色选择器集成 (PowerPoint 调色板)

- [ ] **创建 `src/components/productMatrix/modules/config/VendorConfig.module.css`**
  - [ ] 表格样式
  - [ ] 拖拽手柄样式
  - [ ] 颜色标识圆点

### 2.2 维度定义（DimensionConfig）

- [ ] **创建 `src/components/productMatrix/modules/config/DimensionConfig.tsx`**

  **UI 组件**:
  - [ ] 维度列表（Collapse 折叠面板）
  - [ ] [+ 添加维度] 按钮
  - [ ] 维度项显示：名称、类型、选项/范围概览
  - [ ] 操作按钮：编辑、删除

- [ ] **创建 `src/components/productMatrix/modules/config/DimensionForm.tsx`**

  **表单字段**:
  - [ ] 维度名称（Input）
  - [ ] 维度类型（Radio: 离散/连续）
  - [ ] 离散型配置:
    - [ ] 选项列表（可拖拽排序）
    - [ ] [+ 添加选项] 按钮
    - [ ] 选项编辑（标签、值、描述）
  - [ ] 连续型配置:
    - [ ] 最小值（InputNumber）
    - [ ] 最大值（InputNumber）
    - [ ] 单位（Input）
    - [ ] 建议分段数（InputNumber）

  **数据验证**:
  - [ ] 维度名称不能为空
  - [ ] 维度名称不能重复
  - [ ] 离散型至少 2 个选项
  - [ ] 连续型最小值 < 最大值
  - [ ] 实时验证反馈

- [ ] **创建 `src/components/productMatrix/modules/config/DimensionConfig.module.css`**

### 2.3 矩阵设置（MatrixSettings）

- [ ] **创建 `src/components/productMatrix/modules/config/MatrixSettings.tsx`**

  **表单字段**:
  - [ ] X 轴维度（Select 下拉）
  - [ ] Y 轴维度（Select 下拉）
  - [ ] [交换 X/Y 轴] 按钮
  - [ ] 显示选项（Checkbox Group）:
    - [ ] 使用厂商颜色
    - [ ] 显示产品图片
    - [ ] 显示价格标签
    - [ ] 显示空单元格
  - [ ] 单元格布局（Radio）:
    - [ ] 堆叠
    - [ ] 网格
    - [ ] 重叠
  - [ ] 单格最多显示（InputNumber）
  - [ ] 图例设置:
    - [ ] 显示图例（Checkbox）
    - [ ] 图例位置（Select）

  **功能实现**:
  - [ ] 表单值绑定到 `matrixConfig`
  - [ ] 改变时调用 `updateMatrixConfig`
  - [ ] [重置] 按钮 → 恢复默认配置
  - [ ] [应用] 按钮 → 保存并关闭

- [ ] **创建 `src/components/productMatrix/modules/config/MatrixSettings.module.css`**

---

## Phase 3: 产品管理模块（3-4天）

### 3.1 产品列表（ProductList）

- [ ] **创建 `src/components/productMatrix/modules/product/ProductList.tsx`**

  **工具栏**:
  - [ ] [+ 添加产品] 按钮
  - [ ] [批量导入] 按钮
  - [ ] [导出选中] 按钮（批量操作）
  - [ ] [模板下载] 按钮
  - [ ] 搜索框（按产品名称/型号）
  - [ ] 厂商筛选（Select）
  - [ ] 排序选择（Select: 名称/价格/日期）

  **表格**:
  - [ ] Ant Design Table
  - [ ] 列定义:
    - [ ] 复选框（批量选择）
    - [ ] 产品名称
    - [ ] 厂商（带颜色标识）
    - [ ] 价格
    - [ ] 动态维度列（根据维度定义生成）
    - [ ] 操作（编辑、删除、复制）
  - [ ] 分页（每页 20 条）
  - [ ] 排序功能
  - [ ] 筛选功能

  **空状态**:
  - [ ] Empty 组件（无数据时）
  - [ ] 引导文案和操作按钮

- [ ] **创建 `src/components/productMatrix/modules/product/ProductList.module.css`**

### 3.2 产品编辑表单（ProductForm）

- [ ] **创建 `src/components/productMatrix/modules/product/ProductForm.tsx`**

  **Modal 弹窗**:
  - [ ] 标题（添加/编辑产品）
  - [ ] 宽度 600px
  - [ ] 底部按钮（取消、保存）

  **表单布局**:
  - [ ] ─ 基本信息 ─
    - [ ] * 产品名称（Input, required）
    - [ ] * 所属厂商（Select, required）
    - [ ] 品牌名称（Input, 自动填充）
    - [ ] 型号（Input）
    - [ ] 价格（InputNumber, 前缀 "¥"）
    - [ ] 描述（TextArea）
    - [ ] 产品链接（Input, type="url"）
    - [ ] 发布日期（DatePicker）

  - [ ] ─ 维度数据 ─
    - [ ] 动态生成维度字段
    - [ ] 离散维度 → Select 下拉
    - [ ] 连续维度 → InputNumber (带单位)

  - [ ] ─ 产品图片 (可选) ─
    - [ ] 上传图片（Upload）
    - [ ] 或输入图片 URL（Input）
    - [ ] 图片预览

  **数据验证**:
  - [ ] Ant Design Form.Item rules
  - [ ] 必填字段验证
  - [ ] 价格 ≥ 0
  - [ ] 连续维度值在范围内
  - [ ] URL 格式验证

  **功能实现**:
  - [ ] 选择厂商 → 自动填充品牌名称
  - [ ] 保存 → 调用 `addProduct` 或 `updateProduct`
  - [ ] 取消 → 关闭弹窗，放弃修改

- [ ] **创建 `src/components/productMatrix/modules/product/ProductForm.module.css`**

### 3.3 产品详情（ProductDetail）

- [ ] **创建 `src/components/productMatrix/modules/product/ProductDetail.tsx`**

  **Drawer 抽屉**:
  - [ ] 宽度 480px
  - [ ] 标题：产品名称
  - [ ] [× 关闭] 按钮

  **内容布局**:
  - [ ] 产品图片（大图居中，如无则默认占位符）
  - [ ] 基本信息区块:
    - [ ] 厂商（带颜色标识）
    - [ ] 品牌
    - [ ] 型号
    - [ ] 价格
    - [ ] 发布日期
  - [ ] 描述区块
  - [ ] 维度数据区块:
    - [ ] 列出所有维度及其值
  - [ ] 操作按钮:
    - [ ] [编辑产品]（打开编辑表单）
    - [ ] [删除产品]（确认后删除）
  - [ ] 相关链接区块:
    - [ ] [🔗 官网链接]（如有）

- [ ] **创建 `src/components/productMatrix/modules/product/ProductDetail.module.css`**

### 3.4 批量导入（ProductImport）

- [ ] **创建 `src/components/productMatrix/modules/product/ProductImport.tsx`**

  **Modal 弹窗**:
  - [ ] 标题：批量导入产品
  - [ ] 宽度 800px

  **步骤 1: 上传文件**:
  - [ ] Upload.Dragger 组件
  - [ ] 支持 .xlsx / .xls 格式
  - [ ] [下载模板] 按钮

  **步骤 2: 数据预览**:
  - [ ] Tabs 切换：成功 / 失败
  - [ ] 成功列表：将导入的产品（Table）
  - [ ] 失败列表：错误信息（List）
  - [ ] 解析统计：成功 X 条，失败 Y 条

  **步骤 3: 确认导入**:
  - [ ] [取消]
  - [ ] [仅导入成功数据]
  - [ ] [修正后重试]（返回步骤 1）

  **功能实现**:
  - [ ] 解析 Excel → 调用 `excelImporter.parseProductMatrix`
  - [ ] 数据验证 → 生成成功/失败列表
  - [ ] 确认导入 → 调用 `importProductsFromData`

- [ ] **创建 `src/components/productMatrix/modules/product/ProductImport.module.css`**

---

## Phase 4: 矩阵可视化（4-5天）

### 4.1 主视图组件（ProductMatrixView）

- [ ] **创建 `src/components/productMatrix/ProductMatrixView.tsx`**

  **布局结构**:
  - [ ] Tab 容器（类似 ManpowerView）
  - [ ] Toolbar（顶部工具栏）
  - [ ] MatrixChart（矩阵图表区域）
  - [ ] 设置按钮（浮动按钮，打开设置抽屉）

  **Toolbar 组件**:
  - [ ] 厂商筛选器（VendorFilter）
  - [ ] 轴选择器（AxisSelector）
  - [ ] [导出] 按钮
  - [ ] [统计分析] 按钮（可选，Phase 5）

  **功能实现**:
  - [ ] 监听 activeRadarId → 加载当前图表数据
  - [ ] 响应式布局（支持窗口缩放）

- [ ] **创建 `src/components/productMatrix/ProductMatrixView.module.css`**

### 4.2 矩阵图表（MatrixChart）

- [ ] **创建 `src/components/productMatrix/modules/visualization/MatrixChart.tsx`**

  **ECharts 配置生成**:
  - [ ] `generateMatrixChartOption()`
    - [ ] xAxis: category（离散）或 value（连续）
    - [ ] yAxis: category（离散）或 value（连续）
    - [ ] series: scatter
    - [ ] 数据映射：产品 → [x, y, metadata]
    - [ ] itemStyle: 厂商颜色
    - [ ] symbolSize: 可配置

  **坐标映射算法**:
  - [ ] `mapProductToCoordinates(product, xDim, yDim)`
    - [ ] 离散维度 → 选项索引
    - [ ] 连续维度 → 分段索引或实际值

  **单元格内多产品布局**:
  - [ ] `calculateProductPosition(cellCenter, index, total)`
    - [ ] 重叠模式：圆形分布（推荐）
    - [ ] 堆叠/网格模式：Canvas 叠加层（可选）

  **Tooltip 配置**:
  - [ ] formatter: 自定义 HTML
    - [ ] 产品名称
    - [ ] 厂商（带颜色）
    - [ ] 价格
    - [ ] 关键维度值

  **事件处理**:
  - [ ] onClick: 打开产品详情抽屉
  - [ ] onMouseOver: 高亮产品标记

  **图例配置**:
  - [ ] 厂商图例（根据 matrixConfig.showLegend）
  - [ ] 图例位置（top/bottom/left/right）
  - [ ] 点击图例 → 显示/隐藏厂商产品

  **网格配置**:
  - [ ] grid: 边距设置（留出空间给轴标签）
  - [ ] containLabel: true

- [ ] **优化和边界处理**:
  - [ ] 无产品时显示 Empty 状态
  - [ ] 维度少于 2 个时提示配置
  - [ ] X/Y 轴相同时警告
  - [ ] 大数据量时性能优化（Canvas 渲染）

- [ ] **创建 `src/components/productMatrix/modules/visualization/MatrixChart.module.css`**

### 4.3 厂商筛选器（VendorFilter）

- [ ] **创建 `src/components/productMatrix/modules/visualization/VendorFilter.tsx`**

  **UI 组件**:
  - [ ] Checkbox.Group（横向排列）
  - [ ] 每个厂商：
    - [ ] 复选框
    - [ ] 厂商名称
    - [ ] 颜色圆点标识
  - [ ] [全选] / [全不选] 按钮

  **功能实现**:
  - [ ] 状态管理：选中的厂商 ID 列表
  - [ ] 改变时：
    - [ ] 更新 vendors.visible 状态
    - [ ] 触发图表重新渲染（通过 Store）
  - [ ] 初始值：所有厂商都选中

- [ ] **创建 `src/components/productMatrix/modules/visualization/VendorFilter.module.css`**

### 4.4 轴选择器（AxisSelector）

- [ ] **创建 `src/components/productMatrix/modules/visualization/AxisSelector.tsx`**

  **UI 组件**:
  - [ ] X 轴 Select 下拉（选项：所有维度）
  - [ ] Y 轴 Select 下拉（选项：所有维度）
  - [ ] [交换 X/Y 轴 ⇄] 按钮

  **功能实现**:
  - [ ] 绑定到 `matrixConfig.xAxisDimensionId` 和 `yAxisDimensionId`
  - [ ] 改变时调用 `setMatrixAxes(chartId, xDimId, yDimId)`
  - [ ] 交换按钮调用 `swapMatrixAxes(chartId)`
  - [ ] 禁用同维度选择（X ≠ Y）

- [ ] **创建 `src/components/productMatrix/modules/visualization/AxisSelector.module.css`**

### 4.5 产品详情集成

- [ ] **集成 ProductDetail 组件**
  - [ ] 点击产品标记 → 打开 ProductDetail Drawer
  - [ ] 传递 productId
  - [ ] Drawer 内可编辑/删除产品

---

## Phase 5: 分析模块（2-3天，可选）

### 5.1 厂商分布图（VendorDistribution）

- [ ] **创建 `src/components/productMatrix/modules/analysis/VendorDistribution.tsx`**

  **ECharts 配置**:
  - [ ] type: 'bar'
  - [ ] stack: true（堆叠柱状图）
  - [ ] xAxis: 所有单元格（维度组合）
  - [ ] yAxis: 产品数量
  - [ ] series: 各厂商（分别一个 series）

  **数据计算**:
  - [ ] 遍历产品，统计每个单元格的厂商产品数量
  - [ ] 生成 ECharts 数据格式

  **交互**:
  - [ ] Tooltip: 显示单元格和各厂商产品数
  - [ ] 图例：点击显示/隐藏厂商

- [ ] **创建 `src/components/productMatrix/modules/analysis/VendorDistribution.module.css`**

### 5.2 价格热力图（PriceHeatmap）

- [ ] **创建 `src/components/productMatrix/modules/analysis/PriceHeatmap.tsx`**

  **ECharts 配置**:
  - [ ] type: 'heatmap'
  - [ ] xAxis: X 轴维度选项
  - [ ] yAxis: Y 轴维度选项
  - [ ] visualMap: 颜色映射（低价 → 高价）

  **数据计算**:
  - [ ] 计算每个单元格的平均价格
  - [ ] 无产品或无价格 → 显示为空/灰色

  **交互**:
  - [ ] Tooltip: 显示平均价格和产品数量

- [ ] **创建 `src/components/productMatrix/modules/analysis/PriceHeatmap.module.css`**

### 5.3 覆盖率分析（CoverageAnalysis）

- [ ] **创建 `src/components/productMatrix/modules/analysis/CoverageAnalysis.tsx`**

  **UI 组件**:
  - [ ] 表格展示（Ant Design Table）
  - [ ] 列：厂商、覆盖单元格数、覆盖率、产品数
  - [ ] 进度条可视化（Progress）

  **数据计算**:
  - [ ] 总单元格数 = xOptions.length × yOptions.length
  - [ ] 遍历产品，统计每个厂商覆盖的单元格
  - [ ] 覆盖率 = 覆盖单元格数 / 总单元格数
  - [ ] 排序：按覆盖率降序

- [ ] **创建 `src/components/productMatrix/modules/analysis/CoverageAnalysis.module.css`**

### 5.4 分析模态框集成

- [ ] **创建 `src/components/productMatrix/modules/analysis/AnalysisModal.tsx`**

  **Modal 弹窗**:
  - [ ] 标题：统计分析
  - [ ] 宽度 1000px
  - [ ] Tabs 切换：
    - [ ] 厂商分布图
    - [ ] 价格热力图
    - [ ] 覆盖率分析

---

## Phase 6: 数据导入导出（2-3天）

### 6.1 Excel 导出（ProductMatrixExporter）

- [ ] **创建 `src/services/excel/productMatrixExporter.ts`**

  **工作表 1: 产品列表**:
  - [ ] `exportProductList(products, dimensions)`
    - [ ] 列头：产品名称、厂商、品牌、型号、价格、描述、[动态维度列]
    - [ ] 数据行：遍历产品，输出所有字段
    - [ ] 离散维度值 → 选项标签
    - [ ] 连续维度值 → 数值 + 单位

  **工作表 2: 厂商配置**:
  - [ ] `exportVendorConfig(vendors)`
    - [ ] 列头：厂商名称、颜色、显示顺序
    - [ ] 数据行：遍历厂商

  **工作表 3: 维度定义**:
  - [ ] `exportDimensionConfig(dimensions)`
    - [ ] 列头：维度名称、类型、选项/范围、显示顺序
    - [ ] 数据行：遍历维度
    - [ ] 离散型 → 选项列表（逗号分隔）
    - [ ] 连续型 → "min-max unit"

  **工作表 4: 矩阵统计**:
  - [ ] `exportMatrixStats(products, dimensions, matrixConfig)`
    - [ ] 总产品数
    - [ ] 总厂商数
    - [ ] 总维度数
    - [ ] 平均价格
    - [ ] 价格中位数
    - [ ] 矩阵单元格数
    - [ ] 非空单元格数
    - [ ] 覆盖率

  **工作表 5: 产品矩阵数据**:
  - [ ] `exportMatrixGrid(products, xDim, yDim)`
    - [ ] 透视表格式
    - [ ] 行 = Y 轴选项
    - [ ] 列 = X 轴选项
    - [ ] 单元格值 = 产品数量

  **主函数**:
  - [ ] `exportProductMatrix(chart: ProductMatrixChart)`
    - [ ] 创建 Workbook
    - [ ] 生成所有工作表
    - [ ] 应用样式（表头加粗、冻结首行等）
    - [ ] 返回 Blob 或直接下载

- [ ] **集成到 Toolbar**:
  - [ ] [导出] 按钮 → 调用 `exportProductMatrix`

### 6.2 Excel 导入（ProductMatrixImporter）

- [ ] **创建 `src/services/excel/productMatrixImporter.ts`**

  **解析器**:
  - [ ] `parseProductMatrixExcel(file: File)`
    - [ ] 读取 Excel 文件（SheetJS）
    - [ ] 识别工作表（按名称或顺序）
    - [ ] 解析产品列表 → Product[]
    - [ ] 解析厂商配置 → MatrixVendor[]（可选）
    - [ ] 解析维度定义 → MatrixDimension[]（可选）
    - [ ] 返回 { products, vendors?, dimensions?, errors }

  **数据验证**:
  - [ ] `validateProduct(row, dimensions, vendors)`
    - [ ] 必填字段检查
    - [ ] 厂商名称匹配（必须存在或新增）
    - [ ] 维度值合法性:
      - [ ] 离散值在选项中
      - [ ] 连续值在范围内
    - [ ] 价格格式解析（支持 "¥399", "399元"）
    - [ ] 返回 { valid, errors[] }

  **导入模式**:
  - [ ] `importProducts(chartId, products[], mode: 'append' | 'replace' | 'merge')`
    - [ ] append: 直接添加
    - [ ] replace: 删除现有产品，完全替换
    - [ ] merge: 根据名称/型号判断，存在则更新，不存在则新增

- [ ] **集成到 ProductImport 组件**:
  - [ ] 上传文件 → 调用 `parseProductMatrixExcel`
  - [ ] 显示预览（成功/失败列表）
  - [ ] 确认导入 → 调用 `importProducts`

### 6.3 Excel 模板生成（TemplateGenerator）

- [ ] **创建 `src/services/excel/productMatrixTemplate.ts`**

  **模板生成器**:
  - [ ] `generateProductMatrixTemplate(dimensions: MatrixDimension[])`
    - [ ] 工作表 1: 产品列表（空数据，仅列头）
      - [ ] 固定列：产品名称*、厂商*、品牌、型号、价格、描述
      - [ ] 动态列：根据维度定义生成
      - [ ] 必填列标题加 * 号
    - [ ] 工作表 2: 维度选项参考
      - [ ] 列出所有离散维度的可选值
      - [ ] 每个维度一列
    - [ ] 工作表 3: 填表说明
      - [ ] 固定文本说明

  **样式应用**:
  - [ ] 表头：加粗、背景色
  - [ ] 必填列：红色星号
  - [ ] 冻结首行
  - [ ] 列宽自适应

- [ ] **集成到 ProductList**:
  - [ ] [模板下载] 按钮 → 调用 `generateProductMatrixTemplate`

---

## Phase 7: 集成和优化（2-3天）

### 7.1 主应用集成

- [ ] **更新 `src/pages/MainApp/index.tsx`**
  - [ ] 支持 Product Matrix 模式判断
  - [ ] 渲染 ProductMatrixView 组件
  - [ ] 路由逻辑更新（如果需要独立路由）

- [ ] **更新 `src/components/tabs/RadarTabs/index.tsx`**
  - [ ] 支持 Product Matrix 类型 Tab
  - [ ] Tab 图标（如 🔲 或自定义 SVG）
  - [ ] 右键菜单集成

- [ ] **创建 Product Matrix Tab**
  - [ ] [+ 新建] 菜单 → 添加 "产品矩阵" 选项
  - [ ] 调用 `createProductMatrixChart()`
  - [ ] 自动切换到新 Tab

- [ ] **设置抽屉集成**
  - [ ] `src/components/settings/SettingsDrawer/index.tsx`
  - [ ] 根据 chart_type 渲染不同设置面板
  - [ ] Product Matrix → 渲染配置管理模块

### 7.2 国际化（i18n）

- [ ] **更新 `src/locales/zh-CN.ts`**
  - [ ] 添加 productMatrix 命名空间
  - [ ] 翻译所有文本（参考功能设计文档）

- [ ] **更新 `src/locales/en-US.ts`**
  - [ ] 英文翻译

- [ ] **组件中使用 i18n**
  - [ ] 所有硬编码文本替换为 `t('productMatrix.xxx')`

### 7.3 主题适配

- [ ] **创建 `src/components/productMatrix/productMatrix.module.css`**
  - [ ] 使用 CSS 变量（从 global.css）
  - [ ] 深色/浅色主题适配
  - [ ] 颜色：`var(--color-primary)`, `var(--color-bg)`, etc.

- [ ] **测试主题切换**
  - [ ] 浅色主题显示正常
  - [ ] 深色主题显示正常
  - [ ] 切换无闪烁

### 7.4 响应式设计

- [ ] **移动端适配（可选）**
  - [ ] 矩阵图表在小屏幕上的显示
  - [ ] 表格横向滚动
  - [ ] 表单布局调整

- [ ] **窗口缩放测试**
  - [ ] ECharts resize 监听
  - [ ] 布局自适应

### 7.5 性能优化

- [ ] **大数据量优化**
  - [ ] 产品列表虚拟化（Table virtual）
  - [ ] 矩阵图表 Canvas 渲染（>200 产品）
  - [ ] 分页加载（可选）

- [ ] **渲染优化**
  - [ ] useMemo 缓存 chartOption
  - [ ] useCallback 缓存事件处理函数
  - [ ] 防抖保存（500ms）

- [ ] **交互优化**
  - [ ] Tooltip 延迟（200ms）
  - [ ] 筛选防抖（300ms）
  - [ ] 滚动节流（100ms）

### 7.6 分享功能集成

- [ ] **只读模式适配**
  - [ ] ProductMatrixView 支持 `readOnly` prop
  - [ ] 只读时隐藏：
    - [ ] 添加/编辑/删除按钮
    - [ ] 批量导入
    - [ ] 设置按钮（或只显示不可编辑）

- [ ] **分享链接生成**
  - [ ] ShareModal 支持 Product Matrix Tab
  - [ ] `shared_tab_ids` 包含 Product Matrix Chart ID

- [ ] **ShareView 渲染**
  - [ ] `src/pages/ShareView/index.tsx`
  - [ ] 检测 chart_type === 'product_matrix'
  - [ ] 渲染 ProductMatrixView (readOnly=true)

---

## Phase 8: 测试和文档（1-2天）

### 8.1 功能测试

**配置管理**:
- [ ] 添加/编辑/删除厂商
- [ ] 拖拽排序厂商
- [ ] 添加/编辑/删除维度
- [ ] 离散维度选项管理
- [ ] 连续维度范围设置
- [ ] 矩阵配置更新

**产品管理**:
- [ ] 添加产品（手动）
- [ ] 编辑产品
- [ ] 删除产品
- [ ] 批量导入（Excel）
- [ ] 批量删除
- [ ] 搜索和筛选

**矩阵可视化**:
- [ ] 产品正确定位
- [ ] 单元格内多产品布局
- [ ] 厂商颜色正确显示
- [ ] Tooltip 显示正确
- [ ] 点击打开产品详情
- [ ] 厂商筛选功能
- [ ] 轴选择和交换
- [ ] 缩放和拖拽（大矩阵）

**数据导入导出**:
- [ ] Excel 导出（所有工作表）
- [ ] JSON 导出
- [ ] Excel 导入（验证和预览）
- [ ] 模板下载

**集成测试**:
- [ ] Tab 切换
- [ ] 设置抽屉
- [ ] 主题切换
- [ ] 语言切换
- [ ] 分享链接（只读/可编辑）

### 8.2 边界测试

**空数据状态**:
- [ ] 无厂商
- [ ] 无维度
- [ ] 无产品
- [ ] 单元格无产品

**数据限制**:
- [ ] 产品数量 > 100
- [ ] 产品数量 > 500
- [ ] 单元格产品 > maxProductsPerCell
- [ ] 维度选项 > 20 个

**异常输入**:
- [ ] 重复产品名称
- [ ] 重复厂商名称
- [ ] 重复维度名称
- [ ] 维度值超出范围
- [ ] 价格为负数
- [ ] Excel 格式错误
- [ ] 网络请求失败

**浏览器兼容性**:
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版）
- [ ] Edge（最新版）

### 8.3 文档更新

- [ ] **更新 `CLAUDE.md`**
  - [ ] 添加 Product Matrix 章节
  - [ ] 数据模型说明
  - [ ] 核心功能列表
  - [ ] 关键文件列表

- [ ] **创建用户手册**（可选）
  - [ ] `docs/product-matrix/user-guide.md`
  - [ ] 快速开始
  - [ ] 功能说明
  - [ ] 常见问题

- [ ] **创建开发文档**
  - [ ] `docs/product-matrix/development.md`
  - [ ] 架构说明
  - [ ] API 文档
  - [ ] 扩展指南

---

## 技术栈总结

| 类别 | 技术 | 用途 |
|------|------|------|
| UI 框架 | React 18 + TypeScript | 组件开发 |
| UI 组件库 | Ant Design 5 | Table, Form, Modal, Drawer, Select, Upload |
| 图表库 | ECharts 5 | Scatter, Bar, Heatmap |
| 状态管理 | Zustand | productMatrixActions |
| 拖拽 | @dnd-kit | 厂商/维度/产品排序 |
| Excel | SheetJS (xlsx) | 导入导出 |
| 样式 | CSS Modules | 组件样式隔离 |
| 后端 | Supabase | 数据持久化（radar_charts 表） |

---

## 关键文件清单

### 类型定义
- `src/types/productMatrix.ts`

### Store Actions
- `src/stores/radarStore/productMatrixActions.ts`

### 主视图
- `src/components/productMatrix/ProductMatrixView.tsx`
- `src/components/productMatrix/ProductMatrixView.module.css`

### 配置管理
- `src/components/productMatrix/modules/config/VendorConfig.tsx`
- `src/components/productMatrix/modules/config/DimensionConfig.tsx`
- `src/components/productMatrix/modules/config/DimensionForm.tsx`
- `src/components/productMatrix/modules/config/MatrixSettings.tsx`

### 产品管理
- `src/components/productMatrix/modules/product/ProductList.tsx`
- `src/components/productMatrix/modules/product/ProductForm.tsx`
- `src/components/productMatrix/modules/product/ProductDetail.tsx`
- `src/components/productMatrix/modules/product/ProductImport.tsx`

### 可视化
- `src/components/productMatrix/modules/visualization/MatrixChart.tsx`
- `src/components/productMatrix/modules/visualization/VendorFilter.tsx`
- `src/components/productMatrix/modules/visualization/AxisSelector.tsx`

### 分析（可选）
- `src/components/productMatrix/modules/analysis/AnalysisModal.tsx`
- `src/components/productMatrix/modules/analysis/VendorDistribution.tsx`
- `src/components/productMatrix/modules/analysis/PriceHeatmap.tsx`
- `src/components/productMatrix/modules/analysis/CoverageAnalysis.tsx`

### 数据服务
- `src/services/excel/productMatrixExporter.ts`
- `src/services/excel/productMatrixImporter.ts`
- `src/services/excel/productMatrixTemplate.ts`

### 工具函数
- `src/utils/productMatrixDefaults.ts`
- `src/utils/productMatrixValidation.ts`（可选）

### 国际化
- `src/locales/zh-CN.ts`（更新）
- `src/locales/en-US.ts`（更新）

### 文档
- `docs/product-matrix/data-model.md`
- `docs/product-matrix/feature-design.md`
- `docs/product-matrix/implementation-checklist.md`（本文档）
- `docs/product-matrix/user-guide.md`（可选）
- `docs/product-matrix/development.md`（可选）

---

## 风险和注意事项

### 技术风险

1. **性能风险**
   - **问题**：产品数量多时（>200），ECharts 散点图性能下降
   - **缓解**：Canvas 渲染模式、数据采样、虚拟化

2. **布局复杂性**
   - **问题**：单元格内多产品布局算法复杂
   - **缓解**：先实现重叠模式（简单），堆叠/网格模式作为增强功能

3. **维度灵活性**
   - **问题**：动态维度需要通用化的表单生成逻辑
   - **缓解**：使用配置驱动的表单渲染器

4. **数据验证**
   - **问题**：Excel 导入时数据验证复杂
   - **缓解**：严格的验证规则 + 详细错误提示

### 设计风险

1. **用户体验**
   - **问题**：配置流程可能过于复杂
   - **缓解**：提供默认配置、向导式引导、示例数据

2. **学习曲线**
   - **问题**：新功能较多，用户需要学习
   - **缓解**：详细文档、Tooltip 提示、空状态引导

### 项目风险

1. **时间估算**
   - **问题**：实际开发可能超出预估时间
   - **缓解**：优先完成 MVP，增强功能分阶段实现

2. **需求变更**
   - **问题**：开发过程中可能有新需求
   - **缓解**：保持架构灵活性，模块化设计

---

## 优先级建议

### P0（必须完成，MVP）
- Phase 1: 数据模型和基础架构
- Phase 2: 配置管理模块
- Phase 3: 产品管理模块
- Phase 4: 矩阵可视化
- Phase 6: 数据导入导出
- Phase 7: 集成和优化
- Phase 8: 测试和文档

**预计时间**：15-20 天

### P1（增强功能）
- Phase 5: 分析模块（统计图表）
- Phase 7.4: 移动端适配
- Phase 7.5: 高级性能优化

**预计时间**：5-10 天

### P2（未来优化）
- 产品图片管理（图床集成）
- 更多可视化类型（气泡图、散点矩阵）
- AI 辅助填充（根据产品名称自动推荐维度值）
- 产品对比（多选产品，对比详情）
- 导出为图片/PDF

---

## 开发顺序建议

**Week 1: 基础架构和配置管理**
- Day 1-2: Phase 1（数据模型、Store）
- Day 3-5: Phase 2（配置管理模块）

**Week 2: 产品管理和可视化**
- Day 1-3: Phase 3（产品管理模块）
- Day 4-7: Phase 4（矩阵可视化）

**Week 3: 完善和集成**
- Day 1-3: Phase 6（数据导入导出）
- Day 4-5: Phase 7（集成和优化）
- Day 6-7: Phase 8（测试和文档）

**Week 4: 增强功能（可选）**
- Day 1-3: Phase 5（分析模块）
- Day 4-7: 优化、Bug 修复、用户反馈

---

## 验收标准

### 功能完整性
- [ ] 所有 P0 功能均已实现并测试通过
- [ ] 无阻塞性 Bug
- [ ] 数据持久化正常（Supabase）

### 用户体验
- [ ] 操作流畅，无明显卡顿
- [ ] 错误提示清晰友好
- [ ] 空状态有引导
- [ ] 支持深色/浅色主题

### 代码质量
- [ ] TypeScript 类型完整，无 any
- [ ] 组件可复用性强
- [ ] 符合项目代码规范（参考 CLAUDE.md）
- [ ] 无明显坏味道（冗余、循环依赖等）

### 文档完整性
- [ ] CLAUDE.md 已更新
- [ ] 数据模型文档完整
- [ ] 功能设计文档完整
- [ ] 实现清单文档完整

---

## 后续迭代计划

### V1.1（MVP 后的第一次迭代）
- 用户反馈收集
- Bug 修复
- 性能优化（如有必要）
- 补充文档和示例

### V1.2（增强功能）
- Phase 5: 分析模块
- 产品图片支持
- 更多导出格式（图片、PDF）

### V2.0（未来规划）
- AI 辅助功能
- 更多可视化类型
- 协作功能增强
- 移动端 App

---

## 总结

本实现清单详细列出了产品矩阵功能的所有开发任务，涵盖：
- **8 个开发阶段**
- **60+ 组件和模块**
- **200+ 具体任务**
- **完整的技术方案和优化建议**

建议采用**敏捷开发**模式：
1. 先完成 MVP（P0 功能）
2. 用户测试和反馈
3. 迭代增强（P1/P2 功能）

这样可以快速验证需求，及时调整方向，确保最终交付高质量的产品矩阵工具。
