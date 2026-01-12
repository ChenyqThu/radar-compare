# 实时协作功能技术方案

## 1. 背景与需求

### 1.1 背景
当前 Radar Compare 项目支持多用户协作编辑同一个项目（Project）和图表（Radar/Timeline）。随着协作场景的增加，用户反馈了一个痛点：当协作者 B 修改了数据后，原作者 A 无法立即感知，必须手动刷新页面才能看到最新的更改。这导致了协作效率低下，且容易出现基于过期数据进行编辑的情况。

### 1.2 需求
- **实时性**：当一个用户对数据进行增删改操作后，其他在线的协作者应尽可能快地（毫秒-秒级）看到变更。
- **范围**：主要覆盖 `radar_charts` 表的数据，即图表的创建、更新、删除、排序等操作。
- **一致性**：最终所有在线用户看到的数据状态应保持一致。
- **低侵入性**：尽量利用现有架构，避免引入全新的重型中间件（如 WebSocket Server 集群）。

## 2. 当前方案分析

### 2.1 现状
- **架构**：React 前端 + Supabase (Postgres) 后端。
- **数据流**：
  - **读**：组件挂载时，调用 `getChartsByProject` 等 Service 方法，通过 `supabase-js` HTTP 接口拉取数据。
  - **写**：调用 `updateChart` 等方法，发送 HTTP 请求到 Supabase。成功后，前端通常采用“乐观更新”或“重新拉取”的方式更新本地 Zustand Store。
- **问题**：
  - 数据更新是单向的（Client -> Server）。
  - 缺乏 Server -> Client 的推送机制。
  - 其他 Client 只有在触发特定动作（如刷新页面、重新进入）时才会获取最新数据。

## 3. 优化方案：Supabase Realtime

### 3.1 方案概述
利用 Supabase 原生支持的 [Realtime](https://supabase.com/docs/guides/realtime) 功能（基于 PostgreSQL 的 Replication Log），监听数据库表的 `INSERT`, `UPDATE`, `DELETE` 事件，并自动推送给订阅了该 Channel 的前端客户端。

### 3.2 架构设计
1.  **数据库层**：开启 `radar_charts` 表的 Realtime 复制功能 (`Replica Identity: FULL`)。
2.  **传输层**：使用 `supabase-js` 客户端建立 WebSocket 长连接，订阅 `project_id` 维度的变更。
3.  **前端 Store**：
    - 在 Zustand Store 中新增 `subscribe` 动作。
    - 收到 Realtime Payload 后，直接 Merge 到当前 Store 的 `currentProject.radarCharts` 数组中。

### 3.3 详细设计

#### 3.3.1 订阅模型
- **Channel**: `project-{projectId}`
- **Filter**: `project_id=eq.{projectId}`
- **Events**: `*` (All events: INSERT, UPDATE, DELETE)

```typescript
// 伪代码示例
supabase.channel(`project-${projectId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'radar_charts', filter: `project_id=eq.${projectId}` }, handlePayload)
  .subscribe()
```

#### 3.3.2 状态同步策略
- **INSERT**: 将新记录转换为前端 Model，`push` 到数组末尾或根据 `order_index` 插入。
- **UPDATE**: 根据 `id` 查找数组中的项，使用 Payload 中的 `new` 数据覆盖旧数据。
- **DELETE**: 根据 `id` 从数组中移除。

#### 3.3.3 并发与冲突处理 (Phase 1)
采用 **最后写入者胜 (Last-Write-Wins, LWW)** 策略。
Postgres 确保了事务的串行化，Realtime 消息也是有序的。前端总是以收到的最新消息为准。

*注：对于极高频的文本协同编辑（Google Docs 级别），此方案不够（需要 OT/CRDT），但对于图表配置、元数据修改等场景，LWW 足够且性价比最高。*

## 4. 方案对比

| 维度 | 方案 A: 轮询 (Polling) | 方案 B: WebSocket (自定义) | 方案 C: Supabase Realtime (推荐) |
| :--- | :--- | :--- | :--- |
| **实时性** | 低 (取决于轮询间隔，如 5s) | 高 (ms 级) | **高 (ms 级)** |
| **开发成本** | 低 | 高 (需维护 WS Server、心跳、断连) | **极低 (开箱即用)** |
| **资源消耗** | 高 (频繁 HTTP 请求，浪费带宽) | 中 (需长连接资源) | **低 (基于现有连接)** |
| **架构复杂度** | 低 | 高 | **低 (无需新增组件)** |
| **一致性维护** | 容易 (全量替换) | 难 (需处理增量同步) | **中 (需处理增量 Payload)** |

## 5. 结论
推荐采用 **方案 C: Supabase Realtime**。
- **优势**：无缝集成现有技术栈，开发工作量小，实时性满足需求，运维成本几乎为零。
- **风险**：Postgres Replication 在极端高并发写入下可能有延迟（当前业务量级忽略不计）。
