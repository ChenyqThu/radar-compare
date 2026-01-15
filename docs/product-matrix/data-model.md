# 产品矩阵数据模型

## 核心数据结构

### 1. ProductMatrixChart（产品矩阵图表）

```typescript
interface ProductMatrixChart {
  id: string
  name: string
  chart_type: 'product_matrix'
  order: number

  // 厂商配置
  vendors: MatrixVendor[]

  // 维度定义
  dimensions: MatrixDimension[]

  // 产品列表
  products: Product[]

  // 矩阵配置
  matrixConfig: MatrixConfig

  createdAt: number
  updatedAt: number
}
```

### 2. MatrixVendor（厂商）

```typescript
interface MatrixVendor {
  id: string
  name: string           // 厂商名称，如 "TP-Link", "华为"
  color: string          // 品牌主色（HEX）
  logo?: string          // Logo URL（可选，后期支持）
  order: number          // 显示顺序
  visible: boolean       // 是否显示
}
```

### 3. MatrixDimension（维度定义）

```typescript
interface MatrixDimension {
  id: string
  name: string           // 维度名称，如 "WiFi 协议", "速率级别"
  type: 'discrete' | 'continuous'
  order: number

  // 离散型：预定义值列表
  options?: DimensionOption[]

  // 连续型：数值范围和分段
  range?: {
    min: number
    max: number
    unit?: string        // 单位，如 "元", "Mbps"
    segments?: number    // 建议分段数量（用于可视化）
  }
}

// 维度选项（离散型）
interface DimensionOption {
  id: string
  label: string          // 显示标签，如 "WiFi 6E"
  value: string          // 内部值（用于数据映射）
  order: number
  description?: string   // 说明（可选）
}
```

**维度类型说明**：
- **离散型（Discrete）**：有限的枚举值，如 WiFi 5/6/7、产品系列（入门/中端/旗舰）
- **连续型（Continuous）**：数值范围，如价格（0-10000元）、速率（0-10Gbps）

### 4. Product（产品）

```typescript
interface Product {
  id: string
  name: string           // 产品全名，如 "TP-Link Archer AX55"
  vendorId: string       // 所属厂商 ID

  // 通用字段
  brand: string          // 品牌名（冗余，方便显示）
  model: string          // 型号
  price?: number         // 价格（元）
  description?: string   // 描述
  imageUrl?: string      // 产品图片 URL（可选）
  releaseDate?: number   // 发布时间（时间戳）
  url?: string           // 产品页面链接

  // 产品状态（内置枚举维度）
  status: ProductStatus  // 在售/停产/规划等

  // 自定义维度数据
  dimensionValues: Record<string, DimensionValue>  // dimensionId -> value

  order: number
}

// 产品状态枚举
enum ProductStatus {
  ON_SALE = 'on_sale',           // 在售
  DISCONTINUED = 'discontinued',  // 停产
  PLANNED = 'planned',            // 规划中
  PRE_SALE = 'pre_sale',          // 预售
  EOL = 'eol',                    // 生命周期结束 (End of Life)
}

// 状态显示配置
interface ProductStatusConfig {
  [ProductStatus.ON_SALE]: { label: '在售', color: '#52c41a', icon: '●' }
  [ProductStatus.DISCONTINUED]: { label: '停产', color: '#bfbfbf', icon: '○' }
  [ProductStatus.PLANNED]: { label: '规划中', color: '#1890ff', icon: '◐' }
  [ProductStatus.PRE_SALE]: { label: '预售', color: '#faad14', icon: '◑' }
  [ProductStatus.EOL]: { label: 'EOL', color: '#ff4d4f', icon: '✕' }
}

// 维度值
type DimensionValue =
  | { type: 'discrete', value: string }         // 离散值：选项 ID
  | { type: 'continuous', value: number }       // 连续值：数值
```

**产品状态说明**：
- **在售（ON_SALE）**：当前正在市场销售的产品
- **停产（DISCONTINUED）**：已停止生产但市场可能还有库存
- **规划中（PLANNED）**：计划推出但尚未发布的产品
- **预售（PRE_SALE）**：已发布但尚未正式销售
- **EOL（End of Life）**：产品生命周期结束，不再提供支持

### 5. MatrixConfig（矩阵配置）

```typescript
interface MatrixConfig {
  // 轴设置
  xAxisDimensionId: string    // X 轴维度 ID
  yAxisDimensionId: string    // Y 轴维度 ID

  // 显示设置
  showVendorColors: boolean   // 是否用厂商颜色标识产品
  showProductImages: boolean  // 是否显示产品图片
  showPriceLabels: boolean    // 是否显示价格标签
  showEmptyCells: boolean     // 是否显示空单元格

  // 单元格布局（双离散维度场景）
  cellLayout: 'stack' | 'grid' | 'overlap' | 'petal'  // 多产品布局方式
  maxProductsPerCell: number  // 单个格子最多显示产品数（超过则折叠）

  // 花瓣图配置（仅在 cellLayout === 'petal' 时生效）
  petalConfig?: PetalConfig

  // 图例
  showLegend: boolean         // 是否显示图例
  legendPosition: 'top' | 'bottom' | 'left' | 'right'
}

// 花瓣图配置
interface PetalConfig {
  // 花瓣形状
  shape: 'sector' | 'petal' | 'diamond' | 'circle'

  // 厂商位置映射（固定时钟位置）
  vendorPositions: Record<string, number>  // vendorId -> 角度 (0-360)

  // 花瓣大小
  sizeMode: 'linear' | 'log' | 'sqrt'      // 大小缩放模式
  minSize: number                          // 最小花瓣大小（像素）
  maxSize: number                          // 最大花瓣大小（像素）

  // 多维度编码
  colorMode: 'vendor' | 'price' | 'status' | 'custom'  // 颜色编码方式
  opacityMode?: 'price' | 'count' | 'none'             // 透明度编码方式

  // 价格颜色映射（colorMode === 'price' 时生效）
  priceColorScale?: {
    type: 'sequential' | 'diverging'       // 颜色方案类型
    colors: string[]                       // 颜色数组（如 ['#e0f3ff', '#003d82']）
    domain: [number, number]               // 价格范围（如 [0, 5000]）
  }

  // 交互设置
  enableHover: boolean                     // 是否启用 Hover 效果
  hoverScale: number                       // Hover 时的缩放比例（如 1.2）
  enableClick: boolean                     // 是否启用点击查看详情

  // 渲染优化
  enableAnimation: boolean                 // 是否启用动画
  animationDuration: number                // 动画持续时间（毫秒）
}
```

**布局模式说明**：
- **stack**：垂直堆叠，产品卡片纵向排列
- **grid**：网格布局，产品卡片横向+纵向排列（如 2×2）
- **overlap**：重叠模式，产品标记在单元格中心略微偏移，节省空间
- **petal**：花瓣图模式（✨ 新增），厂商位置固定，花瓣大小表示产品数量

**花瓣图特性**：
- **厂商位置固定**：如 6 个厂商对应时钟 12/2/4/6/8/10 点方向
- **花瓣大小**：根据该厂商在该格子的产品数量动态缩放
- **多维度编码**：
  - 颜色：厂商主色 / 价格热力 / 产品状态
  - 透明度：价格 / 产品数量
  - 填充面积：价格竞争力（如价格分布比例）
- **厂商筛选**：显隐对应位置的花瓣
- **Hover 交互**：悬停放大花瓣，显示产品列表 Tooltip

---

## 数据存储

### 数据库表结构

复用现有的 `radar_charts` 表：

```sql
-- radar_charts 表
id              UUID
project_id      UUID
name            TEXT
chart_type      TEXT  -- 值为 'product_matrix'
order_index     INTEGER
data            JSONB  -- 存储完整的 ProductMatrixChart（除 id/name/order/createdAt/updatedAt）
time_marker     JSONB  -- NULL（产品矩阵不使用时间标记）
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### data 字段结构示例

```json
{
  "vendors": [
    {
      "id": "vendor_1",
      "name": "TP-Link",
      "color": "#00A3E0",
      "order": 0,
      "visible": true
    }
  ],
  "dimensions": [
    {
      "id": "dim_wifi",
      "name": "WiFi 协议",
      "type": "discrete",
      "order": 0,
      "options": [
        { "id": "wifi5", "label": "WiFi 5", "value": "wifi5", "order": 0 },
        { "id": "wifi6", "label": "WiFi 6", "value": "wifi6", "order": 1 },
        { "id": "wifi6e", "label": "WiFi 6E", "value": "wifi6e", "order": 2 },
        { "id": "wifi7", "label": "WiFi 7", "value": "wifi7", "order": 3 }
      ]
    },
    {
      "id": "dim_speed",
      "name": "速率级别",
      "type": "discrete",
      "order": 1,
      "options": [
        { "id": "ax1800", "label": "AX1800", "value": "ax1800", "order": 0 },
        { "id": "ax3000", "label": "AX3000", "value": "ax3000", "order": 1 },
        { "id": "ax3600", "label": "AX3600", "value": "ax3600", "order": 2 },
        { "id": "ax5400", "label": "AX5400", "value": "ax5400", "order": 3 }
      ]
    },
    {
      "id": "dim_price",
      "name": "价格区间",
      "type": "continuous",
      "order": 2,
      "range": {
        "min": 0,
        "max": 5000,
        "unit": "元",
        "segments": 5
      }
    }
  ],
  "products": [
    {
      "id": "prod_1",
      "name": "TP-Link Archer AX55",
      "vendorId": "vendor_1",
      "brand": "TP-Link",
      "model": "Archer AX55",
      "price": 399,
      "description": "双频 WiFi 6 路由器",
      "dimensionValues": {
        "dim_wifi": { "type": "discrete", "value": "wifi6" },
        "dim_speed": { "type": "discrete", "value": "ax3000" },
        "dim_price": { "type": "continuous", "value": 399 }
      },
      "order": 0
    }
  ],
  "matrixConfig": {
    "xAxisDimensionId": "dim_wifi",
    "yAxisDimensionId": "dim_speed",
    "showVendorColors": true,
    "showProductImages": false,
    "showPriceLabels": true,
    "showEmptyCells": true,
    "cellLayout": "overlap",
    "maxProductsPerCell": 10,
    "showLegend": true,
    "legendPosition": "top"
  }
}
```

---

## 默认数据

### 新建产品矩阵时的初始数据

```typescript
export const createDefaultProductMatrix = (): Omit<ProductMatrixChart, 'id' | 'order' | 'createdAt' | 'updatedAt'> => ({
  name: '产品矩阵',
  chart_type: 'product_matrix',

  vendors: [
    { id: generateId(), name: 'Vendor A', color: '#1890ff', order: 0, visible: true },
    { id: generateId(), name: 'Vendor B', color: '#52c41a', order: 1, visible: true },
    { id: generateId(), name: 'Vendor C', color: '#fa8c16', order: 2, visible: true },
  ],

  dimensions: [
    {
      id: generateId(),
      name: '维度 X',
      type: 'discrete',
      order: 0,
      options: [
        { id: generateId(), label: '选项 1', value: 'option1', order: 0 },
        { id: generateId(), label: '选项 2', value: 'option2', order: 1 },
        { id: generateId(), label: '选项 3', value: 'option3', order: 2 },
      ]
    },
    {
      id: generateId(),
      name: '维度 Y',
      type: 'discrete',
      order: 1,
      options: [
        { id: generateId(), label: '选项 A', value: 'optionA', order: 0 },
        { id: generateId(), label: '选项 B', value: 'optionB', order: 1 },
        { id: generateId(), label: '选项 C', value: 'optionC', order: 2 },
      ]
    },
  ],

  products: [],

  matrixConfig: {
    xAxisDimensionId: '', // 创建后自动设置为第一个维度
    yAxisDimensionId: '', // 创建后自动设置为第二个维度
    showVendorColors: true,
    showProductImages: false,
    showPriceLabels: true,
    showEmptyCells: true,
    cellLayout: 'overlap',
    maxProductsPerCell: 10,
    showLegend: true,
    legendPosition: 'top',
    // 花瓣图默认配置（可选）
    petalConfig: createDefaultPetalConfig(),
  }
})

// 默认花瓣图配置
export const createDefaultPetalConfig = (): PetalConfig => ({
  shape: 'diamond',
  vendorPositions: {},  // 根据厂商列表动态计算
  sizeMode: 'sqrt',
  minSize: 10,
  maxSize: 40,
  colorMode: 'vendor',
  opacityMode: 'none',
  enableHover: true,
  hoverScale: 1.2,
  enableClick: true,
  enableAnimation: true,
  animationDuration: 300,
})

// 根据厂商数量计算位置（均匀分布在圆周上）
export const calculateVendorPositions = (vendors: MatrixVendor[]): Record<string, number> => {
  const positions: Record<string, number> = {}
  const angleStep = 360 / vendors.length

  vendors.forEach((vendor, index) => {
    // 从 12 点方向开始（0 度），顺时针分布
    positions[vendor.id] = index * angleStep
  })

  return positions
}
```

---

## 花瓣图可视化示例

### 花瓣形状定义

```typescript
// 花瓣形状生成函数（SVG Path 或 Canvas 绘制）
type PetalShapeGenerator = (
  centerX: number,
  centerY: number,
  size: number,
  angle: number,
  color: string,
  opacity: number
) => string | Path2D

// 示例：菱形花瓣
const generateDiamondPetal = (
  centerX: number,
  centerY: number,
  size: number,
  angle: number,
  color: string,
  opacity: number
): string => {
  const radian = (angle * Math.PI) / 180
  const distance = size * 0.6  // 花瓣距离中心的距离

  // 花瓣中心位置
  const petalCenterX = centerX + distance * Math.sin(radian)
  const petalCenterY = centerY - distance * Math.cos(radian)

  // 菱形四个顶点
  const halfSize = size / 2
  const points = [
    [petalCenterX, petalCenterY - halfSize],           // 上
    [petalCenterX + halfSize, petalCenterY],           // 右
    [petalCenterX, petalCenterY + halfSize],           // 下
    [petalCenterX - halfSize, petalCenterY],           // 左
  ]

  // 旋转顶点（使花瓣朝向径向）
  const rotatedPoints = points.map(([x, y]) => {
    const dx = x - petalCenterX
    const dy = y - petalCenterY
    return [
      petalCenterX + dx * Math.cos(radian) - dy * Math.sin(radian),
      petalCenterY + dx * Math.sin(radian) + dy * Math.cos(radian),
    ]
  })

  // 生成 SVG Path
  return `M ${rotatedPoints[0].join(',')} L ${rotatedPoints.slice(1).map(p => p.join(',')).join(' L ')} Z`
}
```

### 单元格花瓣图示例

```
单元格 (WiFi 6, AX3000):
  - TP-Link: 5 个产品 → 12 点方向，大花瓣
  - 华为:    2 个产品 → 4 点方向，中花瓣
  - Cisco:   1 个产品 → 6 点方向，小花瓣

       ◆ (TP-Link, 大)
         ↑
         |
   ------●------
         |
    ◆ (华为) ← | → ◆ (Cisco, 小)

图例：
◆ = 菱形花瓣
● = 单元格中心
花瓣大小 ∝ 产品数量
```

### 多维度编码示例

**场景 1: 颜色编码 = 厂商，透明度编码 = 价格**
```typescript
// TP-Link 的花瓣
color: '#00A3E0' (厂商主色)
opacity: 0.3 - 1.0 (根据平均价格映射)
  - 平均价格 ¥200 → opacity: 0.3 (低价，半透明)
  - 平均价格 ¥1500 → opacity: 1.0 (高价，不透明)
```

**场景 2: 颜色编码 = 价格热力，透明度编码 = 无**
```typescript
// TP-Link 的花瓣
color: 根据平均价格从冷色到暖色渐变
  - 平均价格 ¥200 → color: '#e0f3ff' (冷色，低价)
  - 平均价格 ¥1500 → color: '#ff4d4f' (暖色，高价)
opacity: 1.0 (不透明)
```

**场景 3: 颜色编码 = 产品状态，花瓣分区填充**
```typescript
// TP-Link 的花瓣（5 个产品：3 在售，1 预售，1 停产）
花瓣分区填充：
  - 60% 绿色 (3/5 在售)
  - 20% 橙色 (1/5 预售)
  - 20% 灰色 (1/5 停产)
```

---

## 状态筛选和统计

### 状态筛选器

```typescript
interface StatusFilter {
  enabled: boolean                       // 是否启用状态筛选
  selectedStatuses: ProductStatus[]      // 选中的状态列表
}

// 使用示例
const filteredProducts = products.filter(p =>
  !statusFilter.enabled || statusFilter.selectedStatuses.includes(p.status)
)
```

### 状态统计数据

```typescript
interface StatusStatistics {
  total: number                          // 总产品数
  byStatus: Record<ProductStatus, number>  // 各状态产品数
  byVendor: Record<string, {             // 各厂商的状态分布
    vendorId: string
    vendorName: string
    byStatus: Record<ProductStatus, number>
  }>
  byCellAndStatus: Record<string, {      // 各单元格的状态分布
    cellKey: string  // 如 "wifi6_ax3000"
    byStatus: Record<ProductStatus, number>
  }>
}

// 统计函数
export const calculateStatusStatistics = (
  products: Product[],
  vendors: MatrixVendor[],
  xDim: MatrixDimension,
  yDim: MatrixDimension
): StatusStatistics => {
  // 实现逻辑
}
```

### 状态时间线（可选功能）

```typescript
// 跟踪产品状态变更历史
interface ProductStatusHistory {
  productId: string
  changes: Array<{
    from: ProductStatus
    to: ProductStatus
    timestamp: number
    note?: string
  }>
}

// 用于分析产品生命周期，预测市场趋势
```
