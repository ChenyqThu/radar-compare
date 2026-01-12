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
