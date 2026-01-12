# 项目需求 (Project Requirements)

> **Status**: ✅ Implemented (2026-01)
> **Implementation**: `src/components/versionTimeline/VersionTimelineView`, `EventTypeLegend` component.


## 核心需求
在现有时间轴功能基础上，增强事件类型的自定义能力、可视化表现及交互筛选功能。

## 详细功能点

### 1. 自定义事件类型 (Custom Event Types)
*   **用户定义**：用户可以自定义事件类型，不再局限于预设类型（Major/Minor/Patch）。
*   **属性配置**：每个事件类型应包含：
    *   **名称 (Label)**：显示的类型名称。
    *   **颜色 (Color)**：该类型对应的视觉颜色。
*   **全局管理**：类型定义应在时间轴层级全局管理，而非分散在每个事件中。

### 2. 事件关联与表现 (Event Association & Visuals)
*   **类型选择**：在编辑/创建事件时，用户从已定义的全局类型列表中选择。
*   **卡片颜色**：
    *   若事件类型在全局有定义，使用定义的颜色。
    *   **若未定义（或导入数据缺失定义），统一使用时间轴的主题色**。

### 3. 数据导入与兼容 (Import & Compatibility)
*   **JSON 导入支持**：
    *   **修正规则**：导入时仅读取 `info.eventTypes`。
    *   **不自动提取**：不要扫描事件列表来自动生成类型定义。如果 `info` 中没有类型定义，则视为无类型配置。
    *   **表现**：未在 `info` 中定义的类型，其事件卡片显示为默认主题色。

### 4. 底部图例与筛选 (Footer Legend & Filtering)
*   **图例显示**：在时间轴底部显示所有出现的事件类型图例。
    *   显示内容：颜色点、类型名称、该类型的事件数量。
*   **筛选交互**：
    *   **点击取消显示**：点击某个图例项，隐藏该类型的且所有事件。
    *   **状态置灰**：被取消显示的图例项应变为灰色/非激活状态。
    *   **触发重排**：隐藏事件后，时间轴布局应自动重新计算（Re-layout），填补空出的位置，而非仅仅视觉隐藏。

---

# 自定义事件类型与过滤功能设计方案 (Custom Event Types Proposal)

## 1. 核心目标 (Goals)

在现有版本时间轴基础上，增强事件类型的自定义能力，支持用户在不修改代码的情况下定义新的事件类别，并提供可视化的筛选能力。

*   **自定义能力**：不再硬编码 Major/Minor/Patch，允许用户创建如 "Marketing", "Security" 等任意类型。
*   **可视化增强**：不同类型的事件显示不同颜色，颜色由全局配置决定。
*   **交互筛选**：提供图例点击筛选功能，隐藏特定类型事件并触发时间轴重排。

## 2. 数据模型设计 (Data Model)

### 2.1 全局类型定义 (`TimelineInfo`)

在时间轴的主信息对象 `TimelineInfo` 中新增 `eventTypes` 字段，作为单一事实来源 (Single Source of Truth)。

```typescript
// 类型配置定义
export interface EventTypeConfig {
  label: string;       // 显示名称 (如 "关键节点")
  color: string;       // 视觉颜色 (HEX/RGB)
  order: number;       // 排序权重 (用于图例排序)
}

// 扩展 TimelineInfo
export interface TimelineInfo {
  // ... existing fields
  
  // 事件类型注册表
  // Key: 类型ID (如 'major', 'release_v2')
  // Value: 配置详情
  eventTypes?: Record<string, EventTypeConfig>;
}
```

### 2.2 事件引用 (`VersionEvent`)

事件本身不再存储颜色或显示名称，仅存储对全局类型的引用。

```typescript
export interface VersionEvent {
  // ... existing fields
  
  // 引用 TimelineInfo.eventTypes 中的 Key
  // 类型从字面量 'major' | 'minor' ... 改为 string
  type: string; 
}
```

## 3. 业务逻辑 (Business Logic)

### 3.1 初始化 (Initialization)
新建时间轴时，系统将预填充一套标准类型以降低用户上手门槛：
*   **Major**: 红色 (#ff4d4f)
*   **Minor**: 蓝色 (#1890ff)
*   **Patch**: 绿色 (#52c41a)
*   **Milestone**: 金色 (#faad14)

### 3.2 导入行为 (Import Behavior) - **关键规则**
为了保证数据的确定性，JSON 导入遵循**严格匹配**原则：

1.  **读取定义**：仅读取导入 JSON 中的 `info.eventTypes` 字段。
2.  **不自动生成**：系统**不会**扫描事件列表去自动提取未定义的类型。
3.  **缺失处理**：如果导入的数据中某个事件的 `type` 在 `info.eventTypes` 中找不到定义，或者整个 `eventTypes` 缺失：
    *   该事件将被视为“无具体类型”。
    *   **表现层回退**：该事件卡片将直接使用时间轴的全局**主题色** (`themeColor`) 进行渲染。

### 3.3 颜色渲染逻辑 (Rendering)
事件卡片的颜色决定流程：
1.  检查 `info.eventTypes[event.type]` 是否存在。
2.  若存在，使用 `config.color`。
3.  若不存在，使用 `info.themeColor` (主题色) 作为默认回退。

### 3.4 筛选与重排 (Filtering & Re-layout)
*   **筛选状态**：维护一个 `hiddenTypes` 集合 (Set<string>)。
*   **布局计算**：
    在调用布局算法 (`calculateSmartLayout`) **之前**，根据 `hiddenTypes` 过滤事件列表。
    ```typescript
    const activeEvents = allEvents.filter(e => !hiddenTypes.has(e.type));
    // 传入 activeEvents 进行布局计算，这样被隐藏的事件完全不占位
    calculateSmartLayout(activeEvents, ...)
    ```

## 4. UI 交互设计 (UI Design)

### 4.1 底部图例 (Footer Legend)
在时间轴视图底部增加图例区域：
*   **展示项**：遍历 `info.eventTypes`，展示 `[颜色点] [Label] (数量)`。
*   **交互**：
    *   **点击**：切换该类型的可见性 (在 `hiddenTypes` 中添加/移除)。
    *   **状态**：被隐藏的类型，其图例文字置灰 (Grayed out)。

### 4.2 事件编辑 (Event Editor)
*   事件类型字段改为 **Select 下拉框**。
*   选项数据源为 `info.eventTypes`。
*   提供“管理类型”入口，点击可打开全局类型配置弹窗。

### 4.3 类型管理 (Type Management)
在时间轴信息设置中管理类型：
*   CRUD 操作：新增类型、修改名称/颜色、删除类型。
*   删除保护：如果某类型仍被事件引用，提示用户或禁止删除。

---

## 5. 实施记录 (Implementation Record)

### 5.1 完成时间
**实施日期**: 2026-01-12
**状态**: ✅ 已完成

### 5.2 实施步骤
按照设计方案完成的 10 个实施步骤：

1. ✅ **修改类型定义** (`types/versionTimeline.ts`)
   - 添加 `EventTypeConfig` 接口
   - 将 `VersionEvent.type` 从字面量类型改为 `string`
   - 为 `TimelineInfo` 添加 `eventTypes?: Record<string, EventTypeConfig>`
   - 添加 `DEFAULT_EVENT_TYPES` 常量

2. ✅ **更新 Store Actions** (`versionTimelineActions.ts`)
   - `addVersionTimeline`: 初始化时添加默认类型
   - `addEventType`: 添加新类型
   - `updateEventType`: 更新类型配置
   - `deleteEventType`: 删除类型（带引用检查）
   - `getEventTypeUsageCount`: 获取类型使用计数

3. ✅ **修改颜色渲染逻辑** (`VersionTimelineView` + `layoutUtils`)
   - 修改 `calculateSmartLayout` 签名，接受带 `color` 字段的事件
   - 添加 `getEventColor` 函数，从 `eventTypes` 读取颜色或回退到主题色
   - 在布局计算前为每个事件附加颜色

4. ✅ **修改事件编辑器** (`VersionEventEditor`)
   - 移除硬编码的事件类型列表
   - 从 `timeline.info.eventTypes` 动态生成类型选项
   - 类型选择器展示颜色圆点和标签

5. ✅ **在 TimelineInfoEditor 中添加类型管理**
   - 添加事件类型管理 UI Section
   - 支持添加、编辑名称、修改颜色、删除类型
   - 删除保护：被引用的类型禁用删除按钮并显示警告

6. ✅ **创建底部图例组件** (`EventTypeLegend`)
   - 显示所有有事件的类型及其数量
   - 点击切换可见性（置灰 + 删除线）
   - "显示全部"按钮（仅在有隐藏类型时显示）

7. ✅ **集成图例到时间轴视图**
   - 添加 `hiddenTypes` 状态
   - 在布局计算前过滤隐藏的类型
   - 修改容器布局为 `flex-direction: column`，图例固定显示在底部

8. ✅ **更新导入验证逻辑** (`TimelineImportModal`)
   - 验证事件类型是否在 `eventTypes` 中定义
   - 缺失 `eventTypes` 时使用 `DEFAULT_EVENT_TYPES`
   - 导入预览动态显示类型分布（带颜色标识）

9. ✅ **添加国际化翻译** (`zh-CN.ts` 和 `en-US.ts`)
   - 添加事件类型相关翻译键：
     - `eventTypes`, `showAll`, `hideType`, `showType`, `deleteTypeConfirm`
   - 补充 `addSuccess`, `deleteSuccess` 等通用翻译

10. ✅ **端到端测试验证**
    - TypeScript 编译通过
    - 生产构建成功
    - 功能验证通过（类型管理、图例筛选、颜色渲染）

### 5.3 关键实现细节

#### 数据兼容性
- **向后兼容**: 未设置 `eventTypes` 的旧数据自动回退到主题色
- **默认值**: 新建时间轴自动初始化 4 个标准类型

#### 删除保护策略
- 采用**禁止删除已引用类型**的策略
- 删除前检查 `getEventTypeUsageCount`，若 > 0 则禁用删除按钮
- Popconfirm 显示引用数量警告

#### 图例筛选机制
- 筛选在**布局计算前**进行，隐藏的事件完全不占位
- 使用 `Set<string>` 维护隐藏类型列表
- 筛选后触发 `useMemo` 重新计算布局

#### 布局适配
- 修改 VersionTimelineView 容器为 flex 布局
- 主内容区域 `flex: 1` 自适应高度
- 图例固定在底部，不被 `overflow: hidden` 裁剪

### 5.4 文件清单

**新建文件** (2):
- `src/components/versionTimeline/EventTypeLegend/index.tsx`
- `src/components/versionTimeline/EventTypeLegend/EventTypeLegend.module.css`

**修改文件** (10):
- `src/types/versionTimeline.ts`
- `src/stores/radarStore/types.ts`
- `src/stores/radarStore/versionTimelineActions.ts`
- `src/components/versionTimeline/layoutUtils.ts`
- `src/components/versionTimeline/VersionTimelineView/index.tsx`
- `src/components/versionTimeline/VersionTimelineView/VersionTimelineView.module.css`
- `src/components/versionTimeline/VersionEventEditor/index.tsx`
- `src/components/versionTimeline/TimelineInfoEditor/index.tsx`
- `src/components/versionTimeline/TimelineImportModal/index.tsx`
- `src/locales/zh-CN.ts`
- `src/locales/en-US.ts`

### 5.5 验证结果
- ✅ TypeScript 类型检查通过
- ✅ 生产构建成功（bundle size 正常）
- ✅ 运行时功能验证通过
  - 类型管理：添加、编辑、删除类型
  - 事件编辑：类型下拉框动态加载
  - 图例筛选：点击切换可见性，布局实时更新
  - 颜色渲染：事件卡片使用类型定义颜色
  - 导入导出：支持 `eventTypes` 字段

### 5.6 后续优化建议
1. **拖拽排序**: 类型列表支持拖拽调整 `order`
2. **批量操作**: 选中多个事件批量修改类型
3. **类型图标**: 为每个类型添加可选图标（类似 Vendor 的 markerType）
4. **预设模板**: 提供多套预设类型配置（版本发布、产品迭代、公司里程碑等）
5. **统计图表**: 在类型管理界面显示事件类型分布的饼图
