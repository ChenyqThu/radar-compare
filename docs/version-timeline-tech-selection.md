# 版本发布时间轴 - 技术选型文档

> **项目**: Radar Compare - 竞品能力对比可视化工具
> **功能**: 版本发布时间轴 (Version Release Timeline)
> **文档版本**: 1.0
> **创建日期**: 2026-01-10
> **状态**: 已确定

---

## 目录

1. [调研背景](#调研背景)
2. [候选方案对比](#候选方案对比)
3. [最终选型决策](#最终选型决策)
4. [实现方案设计](#实现方案设计)
5. [技术风险与应对](#技术风险与应对)

---

## 调研背景

### 业务需求

实现一个**版本发布时间轴**功能，用于：
- 可视化展示公司或产品的发展历程
- 对比竞品的版本发布节奏
- 管理多产品线的版本计划

### 核心技术要求

1. **视觉呈现**: 清晰、美观、专业
2. **交互体验**: 流畅、直观（缩放非必需）
3. **架构兼容**: 与现有技术栈（React + TypeScript + Ant Design）无缝集成
4. **可维护性**: 代码简洁、易于扩展
5. **性能**: 支持 100+ 事件流畅渲染

---

## 候选方案对比

### 方案 1: vis.js Timeline

**官方文档**: [visjs.github.io/vis-timeline](https://visjs.github.io/vis-timeline/docs/timeline/)

#### 优势

✅ **完整的编辑能力**: 支持拖拽移动、创建、删除事件
✅ **缩放和导航**: 自由缩放时间轴、滚轮缩放、拖拽导航
✅ **丰富的事件系统**: `select`, `timechange`, `rangechange` 等
✅ **分组支持**: 按产品线分组显示
✅ **多种布局**: 水平/垂直方向、堆叠模式
✅ **高度可定制**: 支持自定义模板、样式、渲染

#### 劣势

❌ 不是 React 原生组件（需要封装）
❌ 包体积较大 (~500KB)
❌ 主题定制相对复杂
❌ **过度复杂**: 对于简单的版本历程展示，功能过于丰富

#### 适用场景

✅ 适合需要复杂交互（拖拽编辑、缩放导航）的项目管理工具
❌ **不适合**本项目的简单展示需求

---

### 方案 2: react-chrono

**GitHub**: [prabhuignoto/react-chrono](https://github.com/prabhuignoto/react-chrono)

#### 优势

✅ 原生 React 组件
✅ 4 种布局模式 (horizontal, vertical, alternating, horizontal-all)
✅ 响应式设计
✅ 主题定制丰富 (36+ 属性)
✅ 支持嵌入自定义 React 组件
✅ 搜索和幻灯片模式

#### 劣势

❌ **缺少拖拽编辑能力**
❌ **缺少缩放能力**
❌ **无法实现水平上下交替布局**: 这是本项目的核心视觉需求（参考 Ubiquiti 时间轴）

#### 测试结果

在原型开发中，发现 react-chrono 的 `horizontal` 模式只能将所有事件放在时间轴上方或下方，**无法实现上下交替分布**。

#### 适用场景

✅ 适合垂直时间轴或单侧水平时间轴的展示场景
❌ **不适合**本项目需要的水平上下交替布局

---

### 方案 3: ECharts Timeline

**官方文档**: [echarts.apache.org](https://echarts.apache.org/en/feature.html)

#### 优势

✅ 项目已集成 ECharts (echarts-for-react)
✅ 强大的自定义渲染能力
✅ 与现有代码风格一致
✅ 支持 dataZoom 等交互组件

#### 劣势

❌ 时间轴组件功能有限（主要用于动画控制）
❌ 需要大量自定义开发
❌ 缺少原生的事件编辑能力
❌ **布局灵活性不足**: 实现上下交替需要手动计算坐标

#### 适用场景

✅ 适合需要复杂数据可视化和动画效果的场景
❌ 对于时间轴展示，自定义开发成本较高

---

### 方案 4: Ant Design Timeline

**官方文档**: [ant.design/components/timeline](https://ant.design/components/timeline/)

#### 优势

✅ 与项目 UI 风格统一
✅ 简单易用

#### 劣势

❌ 功能过于简单
❌ 不支持交互编辑
❌ **仅支持垂直布局**: 不支持水平方向

#### 适用场景

✅ 适合简单的垂直时间轴展示（如订单状态、操作日志）
❌ **不适合**本项目的水平布局需求

---

### 方案 5: 自定义实现 ⭐ **最终选择**

#### 优势

✅ **完全控制**: 精确实现设计需求（Ubiquiti 风格）
✅ **轻量级**: 无第三方库依赖，包体积小
✅ **React 原生**: 组件化开发，易于维护
✅ **灵活布局**: 轻松实现上下交替 + 垂直偏移
✅ **主题兼容**: 完美适配明暗主题切换
✅ **可扩展**: 未来可按需添加功能（拖拽、缩放等）

#### 劣势

❌ 需要自行实现布局算法
❌ 需要自行处理响应式设计
❌ 初期开发量相对较大

#### 实现难度评估

- **布局算法**: 中等（智能上下分布 + 垂直偏移）
- **视觉效果**: 简单（CSS 动画 + 渐变）
- **交互逻辑**: 简单（点击、悬停）

---

## 候选方案总结表

| 方案 | 包体积 | React 原生 | 水平上下交替 | 自定义灵活性 | 维护成本 | 推荐度 |
|------|--------|------------|--------------|--------------|----------|--------|
| **vis.js** | ~500KB | ❌ | ✅ | ⭐⭐⭐ | 高 | ⭐⭐ |
| **react-chrono** | ~100KB | ✅ | ❌ | ⭐⭐ | 中 | ⭐⭐ |
| **ECharts** | 已集成 | ✅ | ⚠️ 需大量开发 | ⭐⭐⭐⭐ | 高 | ⭐⭐ |
| **Ant Design** | 已集成 | ✅ | ❌ | ⭐ | 低 | ⭐ |
| **自定义实现** | ~0KB | ✅ | ✅ | ⭐⭐⭐⭐⭐ | 低 | ⭐⭐⭐⭐⭐ |

---

## 最终选型决策

### 决策结论

**选择方案 5: 自定义实现**

### 决策理由

1. **需求匹配度高**:
   - 参考 Ubiquiti 时间轴设计，需要水平上下交替布局
   - 第三方库均无法完美实现此布局（react-chrono 明确不支持）

2. **技术栈一致性**:
   - 纯 React + TypeScript 实现，与现有项目技术栈完全一致
   - 无需引入新的依赖和学习成本

3. **性能和包体积**:
   - 零额外依赖，不增加打包体积
   - 渲染性能可控，易于优化

4. **可维护性**:
   - 代码逻辑清晰，符合项目的组件化规范（单文件 < 400 行）
   - 未来扩展灵活（可按需添加拖拽、缩放等功能）

5. **开发成本可控**:
   - 核心布局算法已在原型中验证（`VersionTimelineEnhanced.tsx`）
   - 视觉效果和交互逻辑较简单

---

## 实现方案设计

### 技术架构

```
版本时间轴功能架构
├── 数据层
│   ├── types/versionTimeline.ts           # 类型定义
│   └── stores/timelineStore.ts            # Zustand 状态管理 (待开发)
├── 组件层
│   ├── VersionTimelineView/               # 主视图容器
│   ├── TimelineCanvas/                    # 时间轴画布
│   ├── EventCard/                         # 事件卡片
│   ├── YearAxis/                          # 年份轴
│   └── EventEditor/                       # 事件编辑器 (待开发)
├── 服务层
│   ├── layout/smartLayoutAlgorithm.ts     # 智能布局算法
│   └── io/timelineImportExport.ts         # 导入导出服务 (待开发)
└── 样式层
    └── VersionTimeline.css                # 主题适配 + 响应式
```

### 核心算法: 智能布局 (Smart Layout)

**目标**: 自动将事件在时间轴上下均匀分布，并纵向错位避免重叠

**算法逻辑**:

```typescript
function calculateSmartLayout(events: VersionEvent[], years: number[]): LayoutEvent[] {
  const eventsByYear = groupBy(events, 'year')
  const layoutEvents: LayoutEvent[] = []
  let topCount = 0
  let bottomCount = 0

  years.forEach(year => {
    const yearEvents = eventsByYear.get(year) || []

    yearEvents.forEach((event, index) => {
      // 策略 1: 均衡上下分布
      const shouldPlaceTop = topCount <= bottomCount
      const position = shouldPlaceTop ? 'top' : 'bottom'

      if (position === 'top') topCount++
      else bottomCount++

      // 策略 2: 同年事件纵向偏移 (每个事件偏移 30px)
      const offset = index * 30

      layoutEvents.push({
        ...event,
        position,
        offset,
      })
    })
  })

  return layoutEvents
}
```

**优势**:
- 自动平衡上下事件数量，视觉效果均衡
- 同年事件自动纵向错位，避免卡片重叠
- 无需手动配置，开箱即用

---

### 组件设计

#### 1. VersionTimelineView (主容器)

**职责**:
- 渲染时间轴 Header（标题、Logo）
- 渲染事件层（上层、下层）
- 渲染年份轴

**Props**:
```typescript
interface VersionTimelineViewProps {
  data: TimelineData
  onEventClick?: (event: VersionEvent) => void
}
```

**文件大小**: ~150 行

---

#### 2. TimelineCanvas (时间轴画布)

**职责**:
- 渲染上层事件、下层事件
- 渲染连接线
- 渲染年份标记

**Props**:
```typescript
interface TimelineCanvasProps {
  events: LayoutEvent[]
  years: number[]
}
```

**文件大小**: ~200 行

---

#### 3. EventCard (事件卡片)

**职责**:
- 渲染事件标题、描述
- 高亮关键词
- 悬停展开效果

**Props**:
```typescript
interface EventCardProps {
  event: VersionEvent
  onClick?: (event: VersionEvent) => void
}
```

**文件大小**: ~100 行

---

#### 4. YearAxis (年份轴)

**职责**:
- 渲染年份刻度
- 渲染时间线

**Props**:
```typescript
interface YearAxisProps {
  years: number[]
}
```

**文件大小**: ~80 行

---

### CSS 设计要点

#### 1. 主题适配

使用 CSS 变量实现明暗主题无缝切换：

```css
/* 浅色主题 */
.version-timeline {
  --bg-primary: #ffffff;
  --bg-secondary: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #d9d9d9;
  --primary-color: #1890ff;
}

/* 暗色主题 */
[data-theme='dark'] .version-timeline {
  --bg-primary: #1a1a1a;
  --bg-secondary: #262626;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #434343;
  --primary-color: #4096ff;
}
```

#### 2. 悬停展开效果

```css
.event-content {
  max-height: 120px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.event-content:hover {
  max-height: none;
  overflow: visible;
  z-index: 10;
  transform: translateY(-2px);
}
```

#### 3. 渐变遮罩

```css
.event-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  height: 30px;
  background: linear-gradient(to bottom, transparent, var(--bg-secondary));
}

.event-content:hover::after {
  opacity: 0;
}
```

---

### 数据模型

```typescript
// 事件类型
export type VersionEventType = 'major' | 'minor' | 'patch' | 'milestone'

// 版本事件
export interface VersionEvent {
  id: string
  year: number
  title: string
  description?: string
  type: VersionEventType
  position: 'top' | 'bottom'        // 由算法自动分配
  highlight?: string[]              // 高亮关键词
  icon?: string
  order: number                     // 同年内的排序
}

// 布局事件（包含偏移量）
export interface LayoutEvent extends VersionEvent {
  offset: number                    // 纵向偏移量（px）
}

// 时间轴数据
export interface TimelineData {
  info: {
    title: string
    logo?: string
    startYear?: number
    endYear?: number
  }
  events: VersionEvent[]
}
```

---

## 技术风险与应对

### 风险 1: 性能问题（大量事件渲染）

**影响**: 当事件数量 > 100 时，可能出现渲染卡顿

**应对措施**:
1. **虚拟滚动**: 引入 `react-window` 实现虚拟化渲染（P1 优先级）
2. **分页加载**: 按年份范围分批加载事件
3. **React.memo**: 优化组件重复渲染

---

### 风险 2: 响应式布局适配

**影响**: 小屏幕下，事件卡片可能重叠或超出边界

**应对措施**:
1. **媒体查询**: 在 1024px、1400px 断点调整卡片宽度和字号
2. **自适应算法**: 根据屏幕宽度动态调整事件偏移量
3. **移动端降级**: 在小屏幕下切换为垂直布局（P2 优先级）

---

### 风险 3: 主题切换延迟

**影响**: 切换明暗主题时，渐变遮罩颜色可能闪烁

**应对措施**:
1. **CSS 变量**: 使用 `var(--bg-secondary)` 确保实时更新
2. **Transition**: 添加 `transition: background 0.3s ease`
3. **测试**: 在两种主题下充分测试视觉一致性

---

## 原型验证结果

### 已完成的原型组件

1. **VersionTimeline.tsx**: 基础实现（固定位置）
2. **VersionTimelineEnhanced.tsx**: 智能布局实现（自动分布 + 偏移）
3. **ReactChronoTimeline.tsx**: react-chrono 对比原型（验证其局限性）

### 验证结论

- ✅ 智能布局算法运行良好，事件分布均衡
- ✅ 悬停展开效果流畅，用户体验良好
- ✅ 明暗主题切换无闪烁，视觉一致性高
- ❌ react-chrono 无法实现水平上下交替，证明自定义方案的必要性

---

## 实现计划

### Phase 1: 核心功能（当前）

- [x] 数据模型定义 (`types/versionTimeline.ts`)
- [x] 智能布局算法 (`VersionTimelineEnhanced.tsx`)
- [x] 事件卡片组件 (`EventCard`)
- [x] 主题适配 (`VersionTimeline.css`)
- [ ] Tab 管理集成（待开发）

### Phase 2: 数据流转（下一步）

- [ ] 创建 `timelineStore.ts`（Zustand）
- [ ] 实现事件编辑器 (`EventEditor`)
- [ ] 实现 Excel/JSON 导入导出
- [ ] IndexedDB 持久化

### Phase 3: 增强功能（未来）

- [ ] 垂直布局支持
- [ ] 事件筛选和搜索
- [ ] 图标库集成
- [ ] 导出图片（Canvas/SVG）

---

## 参考资料

### 设计参考

- [Ubiquiti Timeline](https://www.ui.com/about) - 视觉风格参考
- [Apple Events Timeline](https://www.apple.com/newsroom/) - 简洁风格

### 技术文档

- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Ant Design 5](https://ant.design/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

## 总结

### 核心决策

**选择自定义实现**，理由如下：
1. 完美匹配设计需求（水平上下交替）
2. 零额外依赖，轻量高效
3. 完全可控，易于维护和扩展
4. 原型验证成功，技术风险低

### 关键优势

- 🎨 **视觉效果**: 完全符合 Ubiquiti 风格，专业美观
- ⚡ **性能**: 轻量级，渲染流畅
- 🔧 **灵活性**: 可按需扩展功能
- 🌗 **主题**: 完美适配明暗主题
- 📦 **维护**: 代码简洁，符合项目规范

---

**文档状态**: ✅ 已确定
**最后更新**: 2026-01-10
**维护者**: 技术团队
