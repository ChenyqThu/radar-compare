# 时间轴布局优化与 Perfect Zoom 方案 (结构化提案)

> 创建时间: 2026-01-11
> 更新时间: 2026-01-11 (Part 1 & 2 已实现，新增 Part 3 优化建议)
> 状态: **Part 1 & 2 已投产** / **Part 3 建议中**

## 一、当前现状 (Current Status)

经过代码分析 (`src/components/versionTimeline/layoutUtils.ts` 和 `VersionTimelineView/index.tsx`)，我们确认以下核心逻辑已实现：

### 1. 智能排布 (Smart Layout - Best Fit)
已在 `layoutUtils.ts` 中实现。
*   **算法**: Cost-Based Best-Fit Slotting (基于代价的空位优先)。
*   **特性**: 放弃了僵硬的 Zig-Zag，改为评估 4 条轨道的代价 (Layer, Overlap, Crowd) 并选择最优解。
*   **参数**: 
    *   `COEFF_LAYER = 800` (优先内层)
    *   `OVERLAP_BASE = 1000` (严惩重叠)
    *   `OVERLAP_COEFF = 30000` (二次方重叠惩罚)

### 2. 自然缩放 (Natural Width Zoom)
已在 `VersionTimelineView/index.tsx` 的 `calculateZoomBounds` 中实现。
*   **逻辑**: 基于内容数量计算 `naturalWidth` (舒适宽) 和 `limitWidth` (极限宽)。
*   **Perfect Zoom**: `max(fitZoom, 100%)`，优先保证舒适度。

---

## 二、存在的问题 (Identified Issues)

尽管核心逻辑已上线，但在 `Current Analysis` 中发现以下深层问题，导致体验未达极致：

### 问题 1: 弹性布局与 Zoom 限制脱节 (Elasticity Mismatch)
*   **现象**: `VersionTimelineView` 允许缩放到 `minZoom` (约 `13.5px/event`)，但 `layoutUtils` 内部强制使用 `MIN_EVENT_SPACING = 28px`。
*   **后果**: 当用户缩放到最小时，UI 容器变小了，但内部排布逻辑依然按照 28px 预留空间，导致时间轴实际宽度超出容器，或者排布异常拥挤（因为 `naturalWidth` 变小但 `requiredWidth` 卡在 28px）。
*   **根本原因**: 渲染层的 Zoom 逻辑与计算层的 Spacing 逻辑使用了两套不同的常量。

### 问题 2: 断轴策略过于保守 (Broken Axis Too Conservative)
*   **现象**: 目前断轴触发阈值是 `MIN_GAP_RATIO = 0.15` (15%)。
*   **后果**: 对于一个跨度 50 年的时间轴，需要 **7.5 年** 的空白才会触发断轴。这在很多中等跨度的项目中难以触发，导致大量屏幕空间被空白占据。

### 问题 3: 逻辑分散 (Logic Scattering)
*   **现象**: Zoom 的核心计算 (`calculateZoomBounds`) 位于 View 组件中，而排布逻辑位于 Util 中。两者复用了相似的逻辑（如 `CARD_WIDTH`, `Tracks`）但没有共享常量，增加了维护风险。

---

## 三、Part 3: 深度优化建议 (Optimization Proposal - Jan 2026)

### 优化 A: 统一弹性约束 (Unified Elasticity)

我们需要将 Render 层和 Layout 层的密度标准统一。

**建议方案**:
1.  **定义标准密度**:
    *   `D_comfort` (舒适): 54px/event (4轨道, 216px宽, 无重叠) -> 对应 Zoom 100%
    *   `D_limit` (极限): 16px/event (4轨道, 70%重叠) -> 对应 Min Zoom
2.  **动态 Spacing**:
    *   在 `generateTimeSegments` 中，不再硬编码 `28px`。
    *   而是根据当前的 `pixelsPerYear` 动态调整 `MIN_EVENT_SPACING`，或者直接将 `D_limit` 作为硬底线 (`16px`)。
    *   或者，将 `MIN_EVENT_SPACING` 提升至 `40px` 并配合 Zoom 限制，确保 Layout 出来的结果总是可读的。
    *   **推荐**: 将 `layoutUtils.ts` 的 `MIN_EVENT_SPACING` 调整为 **45px** (接近 Comfort)，但在 Zoom 极小时允许压缩。或者保持 28px 但承认这是极限值。

### 优化 B: 激进断轴策略 (Aggressive Broken Axis)

降低断轴门槛，让时间轴更紧凑。

**参数调整**:
*   `MIN_GAP_RATIO`: **0.15 -> 0.08 (8%)**
    *   *效果*: 50 年跨度下，4 年空白即可触发断轴。
*   `MIN_GAP_PIXELS`: 保持 **400px** 或降至 **300px**。

### 优化 C: 架构重构 (Architecture Refactor)

**行动**:
1.  将 `calculateZoomBounds` 移入 `layoutUtils.ts` (或 `zoomUtils.ts`)。
2.  共享常量 `CARD_WIDTH`, `PARALLEL_TRACKS`。
3.  Layout 算法直接返回 `recommendedMinZoom`。

---

## 四、参数对比 (Parameter Tuning)

| 参数 | 当前值 (Current) | 建议值 (Proposed) | 说明 |
| :--- | :--- | :--- | :--- |
| **Gap Ratio** | 15% | **8%** | 更容易触发断轴，节省空间 |
| **Gap Pixels** | 400px | **400px** | 保持视觉节奏 |
| **Min Event Spacing** | 28px | **45px** (Ideal) / **16px** (Limit) | 需要与 Zoom 逻辑统一 |
| **Zoom Limit** | ~13.5px / event | **Sync with Spacing** | 防止 Layout 与 Render 脱节 |

## 五、实施计划 (Action Plan)

1.  **重构**: 将 Zoom 计算逻辑抽取至 `layoutUtils`。
2.  **调整**: 修改 `generateTimeSegments` 中的 Spacing 逻辑，使其与 Zoom Limit 对齐。
3.  **调优**: 更新断轴阈值参数。
