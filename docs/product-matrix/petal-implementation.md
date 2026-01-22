# 产品矩阵实现清单 - Phase 4.5 花瓣图可视化

> 本文档为实现清单的补充，专门描述花瓣图可视化的开发任务

---

## 实现说明 (2026-01-21 更新)

### 实际采用方案

**最终实现采用了 ECharts Custom Series 方案**，而非本文档原设计的 Canvas 方案。

详细的技术决策记录请参考 [TECH_DECISIONS.md](./TECH_DECISIONS.md)。

### 实际文件结构

```
src/components/productMatrix/modules/visualization/
├── MatrixChart/              # 拆分后的矩阵图表模块
│   ├── index.tsx             # 主组件入口 (106 行)
│   ├── types.ts              # 类型定义 (57 行)
│   ├── useMatrixChartData.ts # 数据处理 Hook (156 行)
│   ├── useChartOption.ts     # ECharts 配置生成 (163 行)
│   └── AxisToolbar.tsx       # 轴选择器组件 (99 行)
├── PetalChart.tsx            # 花瓣图组件 (ECharts Custom Series)
├── petalLayout.ts            # 花瓣布局算法
├── layoutUtils.ts            # 通用布局工具
└── MatrixChart.module.css    # 样式文件
```

### 与原设计的差异

| 原设计 | 实际实现 |
|--------|----------|
| Canvas 2D 渲染器 | ECharts Custom Series |
| 自定义交互检测 | ECharts 内置事件系统 |
| 自定义动画系统 | ECharts 内置动画 |
| 4 种花瓣形状 | 当前支持 diamond 形状 |
| 多维度编码（颜色+透明度） | 厂商颜色编码 |

### 未来扩展

如需实现更复杂的花瓣效果（如状态分区填充），可参考本文档的 Canvas 方案设计。

---

## Phase 4.5: 花瓣图可视化（Canvas 渲染）（3-4天）

> **注意**: 以下为原设计文档，保留作为参考。实际实现采用了 ECharts 方案。

> 优先级：P0 (MVP)
> 前置：Phase 0（产品状态和花瓣图基础）、Phase 4（矩阵可视化）

### 4.5.1 花瓣图核心渲染器（PetalChartRenderer）

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/PetalChartRenderer.ts`**

  **类结构**:
  ```typescript
  export class PetalChartRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private petalData: PetalData[]
    private hoveredPetal: PetalData | null

    constructor(canvas: HTMLCanvasElement)

    // 主渲染方法
    render(matrixData: MatrixData, config: PetalConfig): void

    // 数据预处理
    private preprocessData(matrixData: MatrixData, config: PetalConfig): PetalData[]

    // 绘制背景网格
    private drawGrid(xOptions: string[], yOptions: string[]): void

    // 绘制单个单元格的所有花瓣
    private drawCellPetals(cell: MatrixCell, config: PetalConfig): void

    // 绘制单个花瓣
    private drawPetal(petal: PetalData): void

    // 形状绘制方法
    private drawDiamondPetal(...): void
    private drawSectorPetal(...): void
    private drawPetalShape(...): void
    private drawCirclePetal(...): void

    // 交互检测
    detectPetalHit(mouseX: number, mouseY: number): PetalData | null
    private isPointInPetal(x: number, y: number, petal: PetalData): boolean

    // 动画渲染
    animateTransition(fromData: PetalData[], toData: PetalData[], duration: number): void

    // 高亮效果
    highlightPetal(petal: PetalData): void

    // 清空画布
    clear(): void
  }
  ```

  **实现重点**:
  - [ ] Canvas 初始化和上下文设置
  - [ ] 双缓冲技术（使用离屏 Canvas）
  - [ ] 高 DPI 屏幕适配（devicePixelRatio）
  - [ ] 性能优化（脏区域重绘）

### 4.5.2 花瓣形状绘制函数

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/shapes/diamond.ts`**
  ```typescript
  export function drawDiamondPetal(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    angle: number,
    color: string,
    opacity: number
  ): Array<{ x: number; y: number }>  // 返回顶点坐标（用于交互检测）
  ```

  **实现**:
  - [ ] 计算花瓣中心位置（基于角度和距离）
  - [ ] 生成菱形四个顶点
  - [ ] 旋转顶点（朝向径向）
  - [ ] 绘制路径和填充
  - [ ] 绘制边框（stroke）

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/shapes/sector.ts`**
  ```typescript
  export function drawSectorPetal(...): Array<{ x: number; y: number }>
  ```

  **实现**:
  - [ ] 扇形中心位置
  - [ ] arc() 绘制扇形
  - [ ] 扇形角度可配置（如 60°）

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/shapes/petal.ts`**
  ```typescript
  export function drawPetalShape(...): Array<{ x: number; y: number }>
  ```

  **实现**:
  - [ ] 使用贝塞尔曲线绘制有机花瓣形状
  - [ ] quadraticCurveTo() 或 bezierCurveTo()

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/shapes/circle.ts`**
  ```typescript
  export function drawCirclePetal(...): Array<{ x: number; y: number }>
  ```

  **实现**:
  - [ ] 简单的圆形（arc 360°）

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/shapes/index.ts`**
  ```typescript
  export const SHAPE_RENDERERS: Record<PetalShape, ShapeRenderer> = {
    diamond: drawDiamondPetal,
    sector: drawSectorPetal,
    petal: drawPetalShape,
    circle: drawCirclePetal,
  }
  ```

### 4.5.3 交互检测算法

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/hitDetection.ts`**
  ```typescript
  // 点在多边形内检测（射线法）
  export function isPointInPolygon(
    point: { x: number; y: number },
    vertices: Array<{ x: number; y: number }>
  ): boolean

  // 边界框检测（快速剔除）
  export function isPointInBoundingBox(
    point: { x: number; y: number },
    bbox: { x: number; y: number; width: number; height: number }
  ): boolean

  // 计算边界框
  export function calculateBoundingBox(
    vertices: Array<{ x: number; y: number }>
  ): { x: number; y: number; width: number; height: number }
  ```

  **实现**:
  - [ ] 射线法算法（Ray Casting）
  - [ ] 边界框优化（快速剔除不可能命中的花瓣）

### 4.5.4 花瓣图主组件（PetalChart）

- [ ] **创建 `src/components/productMatrix/modules/visualization/PetalChart.tsx`**

  **组件结构**:
  ```typescript
  interface PetalChartProps {
    matrixData: MatrixData
    config: PetalConfig
    vendors: MatrixVendor[]
    statusFilter: StatusFilter
    onPetalClick?: (petal: PetalData) => void
    onPetalHover?: (petal: PetalData | null) => void
  }

  export const PetalChart: React.FC<PetalChartProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<PetalChartRenderer | null>(null)
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)
    const [mounted, setMounted] = useState(false)

    // 初始化渲染器
    useEffect(() => {
      if (!canvasRef.current) return
      rendererRef.current = new PetalChartRenderer(canvasRef.current)
      setMounted(true)
    }, [])

    // 渲染花瓣图
    useEffect(() => {
      if (!mounted || !rendererRef.current) return
      rendererRef.current.render(matrixData, config)
    }, [matrixData, config, mounted])

    // 鼠标事件监听
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      // ...
    }, [])

    const handleClick = useCallback((e: React.MouseEvent) => {
      // ...
    }, [])

    return (
      <div className={styles.container}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && <PetalTooltip {...tooltip} />}
      </div>
    )
  }
  ```

  **功能实现**:
  - [ ] Canvas 初始化
  - [ ] 渲染器生命周期管理
  - [ ] 鼠标事件处理
  - [ ] Tooltip 显示/隐藏
  - [ ] 响应式尺寸（监听容器大小变化）

- [ ] **创建 `src/components/productMatrix/modules/visualization/PetalChart.module.css`**
  - [ ] Canvas 容器样式
  - [ ] 响应式布局
  - [ ] Cursor 样式

### 4.5.5 花瓣 Tooltip

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/PetalTooltip.tsx`**

  **Tooltip 内容**:
  ```
  ┌──────────────────────────────┐
  │ ● TP-Link | WiFi 6 + AX3000  │
  ├──────────────────────────────┤
  │ 产品数量: 5                  │
  │ 平均价格: ¥892               │
  │ 价格范围: ¥399 - ¥1499       │
  │                              │
  │ 产品列表:                    │
  │  1. Archer AX55   ¥399  ●在售 │
  │  2. Archer AX3000 ¥699  ●在售 │
  │  3. Archer AX73   ¥899  ●在售 │
  │  4. Archer AX90  ¥1299  ◑预售 │
  │  5. Archer AX95  ¥1499  ○停产 │
  │                              │
  │ [点击查看详情 →]             │
  └──────────────────────────────┘
  ```

  **功能实现**:
  - [ ] 动态位置（跟随鼠标）
  - [ ] 避免超出边界
  - [ ] 淡入淡出动画
  - [ ] 产品列表显示（最多显示 5 个，超过显示 "+N"）
  - [ ] 状态图标和颜色

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/PetalTooltip.module.css`**
  - [ ] 玻璃态样式（backdrop-filter）
  - [ ] 阴影和边框
  - [ ] 淡入淡出动画

### 4.5.6 花瓣动画系统

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/animation.ts`**
  ```typescript
  // 动画控制器
  export class PetalAnimationController {
    private startTime: number
    private duration: number
    private fromData: PetalData[]
    private toData: PetalData[]
    private onUpdate: (progress: number) => void
    private animationId: number | null

    start(): void
    stop(): void
    private animate(currentTime: number): void
  }

  // 缓动函数
  export const EASING_FUNCTIONS = {
    linear: (t: number) => t,
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t: number) => t * (2 - t),
  }

  // 插值函数
  export function interpolatePetalData(
    from: PetalData,
    to: PetalData,
    progress: number
  ): PetalData
  ```

  **实现**:
  - [ ] requestAnimationFrame 循环
  - [ ] 缓动函数（easing）
  - [ ] 数据插值（颜色、透明度、大小）
  - [ ] 动画取消机制

### 4.5.7 性能优化

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/optimization.ts`**
  ```typescript
  // 四叉树空间索引（用于加速交互检测）
  export class QuadTree {
    private bounds: BoundingBox
    private capacity: number
    private petals: PetalData[]
    private divided: boolean
    private children: QuadTree[]

    insert(petal: PetalData): void
    query(range: BoundingBox): PetalData[]
  }

  // 脏区域追踪
  export class DirtyRegionTracker {
    private regions: BoundingBox[]

    markDirty(bbox: BoundingBox): void
    getDirtyRegions(): BoundingBox[]
    clear(): void
  }

  // 离屏渲染缓存
  export class OffscreenCache {
    private cache: Map<string, HTMLCanvasElement>

    get(key: string): HTMLCanvasElement | null
    set(key: string, canvas: HTMLCanvasElement): void
    clear(): void
  }
  ```

  **实现**:
  - [ ] 四叉树空间分割（加速交互检测）
  - [ ] 脏区域追踪（只重绘变化部分）
  - [ ] 离屏渲染缓存（缓存不变的单元格）

### 4.5.8 高 DPI 屏幕适配

- [ ] **更新 `PetalChartRenderer` 构造函数**
  ```typescript
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!

    // 高 DPI 适配
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    this.ctx.scale(dpr, dpr)
  }
  ```

  **功能**:
  - [ ] 检测 devicePixelRatio
  - [ ] 设置 Canvas 物理尺寸和 CSS 尺寸
  - [ ] 缩放 context（保证坐标系一致）

### 4.5.9 集成到 MatrixChart

- [ ] **更新 `src/components/productMatrix/modules/visualization/MatrixChart.tsx`**
  ```typescript
  export const MatrixChart: React.FC<MatrixChartProps> = (props) => {
    const { matrixConfig, ... } = props

    // 根据布局模式选择渲染器
    if (matrixConfig.cellLayout === 'petal') {
      return <PetalChart {...props} config={matrixConfig.petalConfig!} />
    }

    // 原有的 ECharts 散点图渲染
    return <EChartsScatterChart {...props} />
  }
  ```

  **功能**:
  - [ ] 布局模式切换逻辑
  - [ ] Props 传递
  - [ ] 组件懒加载（可选）

### 4.5.10 花瓣图工具函数

- [ ] **创建 `src/utils/petalHelpers.ts`**
  ```typescript
  // 计算平均价格
  export function calculateAveragePrice(products: Product[]): number

  // 计算价格范围
  export function calculatePriceRange(products: Product[]): [number, number]

  // 按状态分组产品
  export function groupProductsByStatus(
    products: Product[]
  ): Record<ProductStatus, Product[]>

  // 格式化价格
  export function formatPrice(price: number | undefined): string

  // 生成单元格 Key
  export function getCellKey(xValue: string, yValue: string): string

  // 解析单元格 Key
  export function parseCellKey(cellKey: string): { x: string; y: string }
  ```

### 4.5.11 花瓣图单元测试

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/__tests__/`**
  - [ ] `PetalChartRenderer.test.ts` - 渲染器测试
  - [ ] `shapes.test.ts` - 形状绘制测试
  - [ ] `hitDetection.test.ts` - 交互检测测试
  - [ ] `animation.test.ts` - 动画系统测试
  - [ ] `petalLayout.test.ts` - 布局算法测试

  **测试用例**:
  - [ ] 花瓣位置计算正确性
  - [ ] 花瓣大小缩放正确性
  - [ ] 颜色映射正确性
  - [ ] 点在多边形内检测准确性
  - [ ] 动画插值平滑性

---

## Phase 5.5: 花瓣图高级特性（多维度编码）（2-3天）

> 优先级：P1 (增强)
> 前置：Phase 4.5（花瓣图基础）

### 5.5.1 颜色编码 - 价格热力模式

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/colorModes/priceHeatmap.ts`**
  ```typescript
  export function mapPriceTオColor(
    avgPrice: number,
    priceColorScale: PriceColorScale
  ): string

  // D3-scale 风格的颜色插值
  export function createColorScale(
    colors: string[],
    domain: [number, number]
  ): (value: number) => string
  ```

  **实现**:
  - [ ] 线性插值
  - [ ] 分段颜色（如 <500: 蓝, 500-2000: 黄, >2000: 红）
  - [ ] 预设配色方案（ColorBrewer）

- [ ] **更新 `PetalChartRenderer.drawPetal()`**
  - [ ] 支持 `colorMode: 'price'`
  - [ ] 调用价格热力映射函数

### 5.5.2 颜色编码 - 产品状态模式

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/colorModes/statusPartition.ts`**
  ```typescript
  export function drawStatusPartitionedPetal(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    angle: number,
    statusDistribution: Record<ProductStatus, number>
  ): void
  ```

  **实现**:
  - [ ] 计算各状态占比
  - [ ] 分区填充（扇形分区）
  - [ ] 渐变过渡（可选）

- [ ] **更新 `PetalChartRenderer.drawPetal()`**
  - [ ] 支持 `colorMode: 'status'`
  - [ ] 调用状态分区渲染函数

### 5.5.3 透明度编码

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/opacityModes.ts`**
  ```typescript
  // 价格透明度映射
  export function mapPriceToOpacity(
    avgPrice: number,
    priceRange: [number, number],
    opacityRange: [number, number] = [0.3, 1.0]
  ): number

  // 数量透明度映射
  export function mapCountToOpacity(
    count: number,
    maxCount: number,
    opacityRange: [number, number] = [0.3, 1.0]
  ): number
  ```

  **实现**:
  - [ ] 线性映射
  - [ ] 对数映射（可选）

- [ ] **更新 `PetalChartRenderer`**
  - [ ] 支持 `opacityMode: 'price' | 'count'`
  - [ ] 调用透明度映射函数

### 5.5.4 花瓣图配色方案库

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/colorSchemes.ts`**
  ```typescript
  export const COLOR_SCHEMES: Record<string, ColorScheme> = {
    blueToRed: {
      name: '蓝→红',
      colors: ['#e0f3ff', '#6baed6', '#2171b5', '#ff7f00', '#ff4d4f'],
      description: '低价(冷色) → 高价(暖色)'
    },
    greenYellowOrange: {
      name: '绿→黄→橙',
      colors: ['#52c41a', '#faad14', '#ff7a45'],
      description: '低价(绿) → 中价(黄) → 高价(橙)'
    },
    grayscale: {
      name: '灰度',
      colors: ['#f5f5f5', '#8c8c8c', '#262626'],
      description: '黑白打印友好'
    },
    // ColorBrewer 配色方案
    spectral: {
      name: 'Spectral',
      colors: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
      description: '光谱配色（色盲友好）'
    }
  }
  ```

  **功能**:
  - [ ] 预设配色方案
  - [ ] 配色方案预览
  - [ ] 色盲友好标记

### 5.5.5 花瓣图导出功能

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/export.ts`**
  ```typescript
  // 导出为 PNG
  export function exportPetalChartAsPNG(
    canvas: HTMLCanvasElement,
    filename: string
  ): void

  // 导出为 SVG
  export function exportPetalChartAsSVG(
    petalData: PetalData[],
    config: PetalConfig,
    filename: string
  ): void

  // 导出花瓣数据为 CSV
  export function exportPetalDataAsCSV(
    petalData: PetalData[],
    filename: string
  ): void
  ```

  **实现**:
  - [ ] Canvas toBlob / toDataURL
  - [ ] SVG 生成（使用 DOM API）
  - [ ] CSV 数据导出

### 5.5.6 花瓣图主题支持

- [ ] **创建 `src/components/productMatrix/modules/visualization/petal/themes.ts`**
  ```typescript
  export interface PetalChartTheme {
    gridColor: string
    backgroundColor: string
    textColor: string
    borderColor: string
    shadowColor: string
  }

  export const LIGHT_THEME: PetalChartTheme = {
    gridColor: '#d9d9d9',
    backgroundColor: '#ffffff',
    textColor: '#262626',
    borderColor: '#8c8c8c',
    shadowColor: 'rgba(0, 0, 0, 0.1)'
  }

  export const DARK_THEME: PetalChartTheme = {
    gridColor: '#434343',
    backgroundColor: '#141414',
    textColor: '#ffffff',
    borderColor: '#595959',
    shadowColor: 'rgba(255, 255, 255, 0.1)'
  }
  ```

  **实现**:
  - [ ] 主题切换逻辑
  - [ ] 从全局 UI Store 读取主题
  - [ ] 动态更新 Canvas 颜色

---

## 验收标准（花瓣图模块）

### 功能完整性
- [ ] 菱形花瓣渲染正确（P0）
- [ ] 扇形/圆形花瓣渲染正确（P1）
- [ ] 厂商位置固定且均匀分布
- [ ] 花瓣大小根据产品数量动态缩放
- [ ] 颜色编码 = 厂商（基础功能）
- [ ] 颜色编码 = 价格热力（增强功能）
- [ ] 透明度编码 = 价格/数量（增强功能）
- [ ] Hover 效果和 Tooltip 显示
- [ ] 点击查看产品详情
- [ ] 厂商筛选 → 花瓣显隐动画

### 交互体验
- [ ] 鼠标悬停流畅无卡顿
- [ ] Tooltip 位置合理（不超出边界）
- [ ] 花瓣动画平滑（300ms 淡入淡出）
- [ ] 高 DPI 屏幕显示清晰

### 性能指标
- [ ] 100 单元格 + 6 厂商 = 600 花瓣，渲染时间 < 100ms
- [ ] 交互检测响应时间 < 16ms（60fps）
- [ ] 动画帧率 ≥ 60fps

### 代码质量
- [ ] TypeScript 类型完整，无 any
- [ ] Canvas 代码模块化
- [ ] 花瓣形状渲染函数可复用
- [ ] 单元测试覆盖率 > 80%

---

## 关键文件清单（花瓣图模块）

### 核心渲染
- `src/components/productMatrix/modules/visualization/petal/PetalChartRenderer.ts`
- `src/components/productMatrix/modules/visualization/PetalChart.tsx`

### 形状绘制
- `src/components/productMatrix/modules/visualization/petal/shapes/diamond.ts`
- `src/components/productMatrix/modules/visualization/petal/shapes/sector.ts`
- `src/components/productMatrix/modules/visualization/petal/shapes/petal.ts`
- `src/components/productMatrix/modules/visualization/petal/shapes/circle.ts`
- `src/components/productMatrix/modules/visualization/petal/shapes/index.ts`

### 交互和动画
- `src/components/productMatrix/modules/visualization/petal/hitDetection.ts`
- `src/components/productMatrix/modules/visualization/petal/animation.ts`
- `src/components/productMatrix/modules/visualization/petal/PetalTooltip.tsx`

### 多维度编码
- `src/components/productMatrix/modules/visualization/petal/colorModes/priceHeatmap.ts`
- `src/components/productMatrix/modules/visualization/petal/colorModes/statusPartition.ts`
- `src/components/productMatrix/modules/visualization/petal/opacityModes.ts`
- `src/components/productMatrix/modules/visualization/petal/colorSchemes.ts`

### 工具和优化
- `src/utils/petalLayout.ts`
- `src/utils/petalHelpers.ts`
- `src/components/productMatrix/modules/visualization/petal/optimization.ts`
- `src/components/productMatrix/modules/visualization/petal/themes.ts`
- `src/components/productMatrix/modules/visualization/petal/export.ts`

### 测试
- `src/components/productMatrix/modules/visualization/petal/__tests__/`

---

## 技术难点和解决方案（花瓣图）

### 难点 1：Canvas 交互检测性能

**问题**：600+ 花瓣遍历检测慢

**解决方案**：
1. 边界框快速剔除（先检查边界框）
2. 四叉树空间索引（将花瓣组织成树形结构）
3. 事件节流（mousemove 节流到 16ms）

### 难点 2：花瓣重叠时的视觉清晰度

**问题**：多个花瓣重叠时难以区分

**解决方案**：
1. Z-index 排序（产品数量少的花瓣在上层）
2. 半透明叠加（重叠区域自然叠加）
3. Hover 高亮（当前花瓣提升到顶层，其他半透明）
4. 边框描边（使用厂商颜色描边）

### 难点 3：颜色映射的可访问性

**问题**：色盲用户无法区分颜色

**解决方案**：
1. 使用 ColorBrewer 色盲友好配色
2. 图案辅助（如斜线填充）
3. 边框颜色增强
4. 提供灰度模式

### 难点 4：动画性能优化

**问题**：同时动画 600+ 花瓣导致卡顿

**解决方案**：
1. 使用 requestAnimationFrame（浏览器优化）
2. 降低动画时长（300ms 而非 600ms）
3. 降级策略（>200 花瓣时禁用动画）
4. 使用 Web Workers（可选，离线计算插值）

---

## 总结

Phase 4.5 和 5.5 新增了 **花瓣图可视化** 功能，主要工作包括：

### ✅ 核心功能（P0）
- Canvas 2D 渲染器
- 4 种花瓣形状（菱形/扇形/花瓣/圆形）
- 厂商位置映射算法
- 花瓣大小动态缩放
- 交互检测（点在多边形内）
- Hover 效果和 Tooltip
- 动画系统

### ✅ 高级特性（P1）
- 多维度编码（颜色、透明度）
- 价格热力图模式
- 产品状态分区填充
- 配色方案库
- 导出功能（PNG/SVG/CSV）
- 主题支持

**预计开发时间**：
- P0（基础功能）：3-4 天
- P1（高级特性）：2-3 天

**新增代码量**：约 3000-4000 行（包含测试）
