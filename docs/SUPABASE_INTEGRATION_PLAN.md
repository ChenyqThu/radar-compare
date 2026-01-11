# Supabase 集成规划文档

> 为 Radar Compare 项目添加账号登录、后端数据存储、跨端同步，并为协作分享功能打基础

## 1. 项目背景

### 1.1 现有架构
- **前端**: React 18 + TypeScript + Vite
- **状态管理**: Zustand (with subscribeWithSelector)
- **本地存储**: IndexedDB (Dexie.js) - 防抖 500ms 自动保存
- **数据模型**: Project → RadarChart[] → Dimensions/Vendors

### 1.2 目标
1. 复用已有 Supabase 后端（ubiquiti 财报分析项目）
2. 实现 Google/Notion OAuth 登录
3. 云端数据存储与跨端同步
4. 为分享功能（只读/可编辑）打基础

---

## 2. 技术方案概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Zustand    │◄──►│  SyncEngine │◄──►│  Supabase Client    │  │
│  │  (State)    │    │  (同步引擎) │    │  @supabase/supabase-js│ │
│  └──────┬──────┘    └─────────────┘    └──────────┬──────────┘  │
│         │                                          │             │
│         ▼                                          │             │
│  ┌─────────────┐                                   │             │
│  │  IndexedDB  │ ← 离线缓存/本地优先               │             │
│  │  (Dexie)    │                                   │             │
│  └─────────────┘                                   │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase Backend                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Auth       │    │  Database   │    │  Realtime           │  │
│  │  (OAuth)    │    │  (Postgres) │    │  (WebSocket)        │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Row Level Security (RLS) - 数据权限控制                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 表结构

```sql
-- 用户表（Supabase Auth 自动管理，扩展 profile）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT,  -- 'google' | 'notion'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  data JSONB NOT NULL,  -- 完整的 Project JSON (包含 radarCharts)
  version INTEGER DEFAULT 1,  -- 用于乐观锁
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分享链接表（为未来分享功能准备）
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  share_type TEXT NOT NULL CHECK (share_type IN ('readonly', 'editable')),
  share_token TEXT UNIQUE NOT NULL,  -- 分享链接 token
  password_hash TEXT,  -- 可选密码保护
  expires_at TIMESTAMPTZ,  -- 可选过期时间
  max_views INTEGER,  -- 可选最大查看次数
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 协作者表（为未来协作功能准备）
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 索引
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_updated ON projects(updated_at);
CREATE INDEX idx_shares_token ON shares(share_token);
CREATE INDEX idx_shares_project ON shares(project_id);
CREATE INDEX idx_collaborators_project ON collaborators(project_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);
```

### 3.2 Row Level Security (RLS) 策略

```sql
-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能查看和更新自己的 profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- projects: 所有者可以 CRUD，协作者可以 SELECT/UPDATE
CREATE POLICY "Owners can manage own projects"
  ON projects FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Collaborators can view projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE project_id = projects.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Editor collaborators can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE project_id = projects.id
      AND user_id = auth.uid()
      AND role IN ('editor', 'admin')
    )
  );

-- shares: 只有项目所有者或管理员可以管理分享
CREATE POLICY "Owners can manage shares"
  ON shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = shares.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- collaborators: 只有项目所有者或管理员可以管理协作者
CREATE POLICY "Owners can manage collaborators"
  ON collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = collaborators.project_id
      AND projects.owner_id = auth.uid()
    )
  );
```

### 3.3 数据迁移策略

```
本地 IndexedDB (Project)          云端 Supabase (projects.data)
┌─────────────────────┐           ┌─────────────────────┐
│ id                  │    ──►    │ data.id             │
│ name                │    ──►    │ name (冗余)         │
│ description         │    ──►    │ description (冗余)  │
│ radarCharts[]       │    ──►    │ data.radarCharts[]  │
│ activeRadarId       │    ──►    │ data.activeRadarId  │
│ createdAt           │    ──►    │ created_at          │
│ updatedAt           │    ──►    │ updated_at          │
└─────────────────────┘           └─────────────────────┘
```

**设计决策**: 将完整的 `Project` JSON 存储在 `data` JSONB 字段中
- **优点**: 保持前端数据结构不变，迁移简单
- **缺点**: 无法直接查询内部字段（如按维度搜索）
- **权衡**: 当前场景下，项目是原子操作单位，不需要细粒度查询

---

## 4. 认证方案

### 4.1 OAuth Providers

| Provider | 配置来源 | 说明 |
|----------|----------|------|
| Google | 复用 ubiquiti 项目 | 已配置，直接使用 |
| Notion | 复用 ubiquiti 项目 | 已配置，直接使用 |

### 4.2 认证流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  用户    │     │  前端    │     │ Supabase │     │ Provider │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │  点击登录       │                │                │
     │ ────────────► │                │                │
     │                │  signInWithOAuth│                │
     │                │ ────────────► │                │
     │                │                │  OAuth 跳转    │
     │                │                │ ────────────► │
     │                │                │◄──────────────│
     │                │                │  callback      │
     │                │◄──────────────│  + JWT token   │
     │                │  session       │                │
     │◄──────────────│                │                │
     │  登录成功       │                │                │
```

### 4.3 会话管理

```typescript
// src/services/auth/index.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // 同步本地数据到云端
    syncLocalToCloud()
  } else if (event === 'SIGNED_OUT') {
    // 清理云端状态，保留本地数据
    clearCloudState()
  }
})
```

---

## 5. 同步策略

### 5.1 设计原则

1. **本地优先 (Local-First)**: 离线时可正常使用，联网后自动同步
2. **最终一致性**: 允许短暂不一致，保证最终数据一致
3. **冲突解决**: Last-Write-Wins (LWW) + 用户确认

### 5.2 同步流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        同步状态机                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    登录成功    ┌─────────┐    数据变更    ┌───────┐│
│  │  IDLE   │ ────────────► │ SYNCING │ ────────────► │ DIRTY ││
│  └─────────┘                └────┬────┘                └───┬───┘│
│       ▲                          │                         │    │
│       │         同步完成          │                         │    │
│       └──────────────────────────┘                         │    │
│       │                                                     │    │
│       │                    防抖 1s 后                       │    │
│       └─────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 冲突解决

```typescript
interface SyncConflict {
  projectId: string
  localVersion: number
  remoteVersion: number
  localData: Project
  remoteData: Project
  localUpdatedAt: number
  remoteUpdatedAt: number
}

// 冲突解决策略
type ConflictResolution =
  | 'keep_local'      // 保留本地版本
  | 'keep_remote'     // 使用云端版本
  | 'merge'           // 合并（未来支持）

// 默认策略: Last-Write-Wins
function resolveConflict(conflict: SyncConflict): ConflictResolution {
  return conflict.localUpdatedAt > conflict.remoteUpdatedAt
    ? 'keep_local'
    : 'keep_remote'
}
```

### 5.4 实时同步 (Realtime)

```typescript
// 订阅项目变更
const subscription = supabase
  .channel('projects')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        // 检查是否是当前项目
        // 如果版本号大于本地，提示用户刷新
      }
    }
  )
  .subscribe()
```

---

## 6. 前端架构变更

### 6.1 新增目录结构

```
src/
├── services/
│   ├── auth/                    # 新增: 认证服务
│   │   ├── index.ts             # Supabase 客户端 + auth 方法
│   │   ├── providers.ts         # OAuth provider 配置
│   │   └── hooks.ts             # useAuth, useUser hooks
│   ├── sync/                    # 新增: 同步服务
│   │   ├── index.ts             # SyncEngine 主类
│   │   ├── strategies.ts        # 同步策略
│   │   └── conflicts.ts         # 冲突解决
│   └── db/                      # 现有: 本地存储
│       └── index.ts
├── stores/
│   ├── authStore.ts             # 新增: 认证状态
│   ├── syncStore.ts             # 新增: 同步状态
│   └── radarStore/              # 现有: 业务数据
├── components/
│   ├── auth/                    # 新增: 认证组件
│   │   ├── LoginModal/          # 登录弹窗
│   │   ├── UserMenu/            # 用户菜单
│   │   └── AuthGuard/           # 路由守卫（可选）
│   └── sync/                    # 新增: 同步组件
│       ├── SyncStatus/          # 同步状态指示器
│       └── ConflictModal/       # 冲突解决弹窗
└── types/
    ├── auth.ts                  # 新增: 认证类型
    └── sync.ts                  # 新增: 同步类型
```

### 6.2 Store 变更

```typescript
// src/stores/authStore.ts
interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null

  // Actions
  signInWithGoogle: () => Promise<void>
  signInWithNotion: () => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// src/stores/syncStore.ts
interface SyncState {
  status: 'idle' | 'syncing' | 'dirty' | 'error' | 'offline'
  lastSyncedAt: number | null
  pendingChanges: number
  conflicts: SyncConflict[]

  // Actions
  syncNow: () => Promise<void>
  resolveConflict: (id: string, resolution: ConflictResolution) => void
  retrySync: () => Promise<void>
}
```

### 6.3 环境变量

```env
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 7. 实现阶段

### Phase 1: 基础设施 (Foundation) ✅ 已完成

**目标**: 建立认证和数据库基础

**任务清单**:
- [x] 在 Supabase 创建 `radar_compare` schema（或复用现有 schema）
- [x] 创建数据库表 (profiles, projects, shares, collaborators)
- [x] 配置 RLS 策略
- [x] 前端添加 `@supabase/supabase-js` 依赖
- [x] 创建 Supabase 客户端配置
- [x] 创建 `authStore` 和 `useAuth` hook
- [x] 实现 Google/Notion OAuth 登录

**交付物**:
- ✅ 用户可以登录/登出
- ✅ 登录状态在页面刷新后保持

### Phase 2: 数据同步 (Sync Engine) ✅ 已完成

**目标**: 实现本地与云端数据同步

**任务清单**:
- [x] 创建 `syncStore` 管理同步状态
- [x] 实现云端 CRUD 操作 (`src/services/supabase/projects.ts`)
- [x] 登录时上传本地项目到云端
- [x] 登录时拉取云端项目到本地
- [x] 修改 `debouncedSave` 同时触发云端同步
- [x] 实现基本的冲突检测 (基于时间戳)
- [x] 实现 Last-Write-Wins 冲突解决
- [x] 添加同步状态 UI 指示器

**交付物**:
- ✅ 数据在多设备间同步
- ✅ 显示同步状态（同步中/已同步/离线）

**实现细节**:
- 项目 ID 使用前端 nanoid，数据库字段类型为 TEXT
- 首次登录自动上传所有本地项目
- 编辑自动触发云端同步（500ms 防抖）
- 同步状态在用户头像旁显示

### Phase 3: 用户体验优化 (UX Polish)

**目标**: 完善用户体验

**任务清单**:
- [ ] 登录弹窗 UI
- [ ] 用户头像和菜单
- [ ] 离线模式检测和提示
- [ ] 冲突解决弹窗（让用户选择保留哪个版本）
- [ ] 同步错误处理和重试
- [ ] 迁移向导（首次登录时处理本地数据）

**交付物**:
- 完整的登录/登出流程
- 友好的同步状态反馈

### Phase 4: 分享基础 (Sharing Foundation)

**目标**: 为分享功能打基础

**任务清单**:
- [ ] 创建分享链接 API
- [ ] 实现分享链接访问（只读模式）
- [ ] 分享设置面板（类型、密码、过期时间）
- [ ] 分享链接管理（查看、撤销）

**交付物**:
- 用户可以生成只读分享链接
- 访客可以通过链接查看项目

---

## 8. 用户需要配合提供的信息

### 8.1 Supabase 配置

| 项目 | 说明 | 获取方式 |
|------|------|----------|
| **Project URL** | Supabase 项目 URL | Project Settings → API → Project URL |
| **Anon Key** | 公开的 API Key | Project Settings → API → anon/public |
| **Service Role Key** | 后端管理 Key (可选) | 仅用于后端操作，前端不需要 |

### 8.2 OAuth 配置确认

请确认以下 OAuth 配置已在 Supabase Dashboard 中启用：

- [ ] **Google OAuth**
  - Authentication → Providers → Google → Enabled
  - 已配置 Client ID 和 Client Secret

- [ ] **Notion OAuth**
  - Authentication → Providers → Notion → Enabled
  - 已配置 Client ID 和 Client Secret

### 8.3 Redirect URLs

需要在 OAuth Provider 和 Supabase 中添加 radar-compare 的回调 URL：

```
# 开发环境
http://localhost:3000/auth/callback

# 生产环境（根据实际部署地址）
https://radar-compare.example.com/auth/callback
```

### 8.4 决策确认

请确认以下设计决策：

1. **数据隔离**: radar-compare 的数据是否需要与 ubiquiti 项目隔离？
   - [ ] 共用 schema（数据在同一个库）
   - [ ] 独立 schema（推荐，隔离性更好）

2. **匿名使用**: 是否允许未登录用户使用？
   - [ ] 允许（现有行为，数据仅本地存储）
   - [ ] 强制登录

3. **数据迁移**: 用户首次登录时，如何处理本地已有数据？
   - [ ] 自动上传到云端
   - [ ] 询问用户是否上传
   - [ ] 不处理（本地和云端独立）

---

## 9. 风险和注意事项

### 9.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| IndexedDB 与 Supabase 数据不一致 | 数据丢失 | 版本号 + 冲突检测 |
| OAuth Token 过期 | 同步失败 | 自动刷新 token |
| 大项目同步慢 | 用户体验差 | 增量同步（未来） |
| RLS 配置错误 | 数据泄露 | 充分测试 + Code Review |

### 9.2 安全注意事项

1. **永远不要**在前端代码中使用 `service_role` key
2. **确保** RLS 策略覆盖所有表
3. **测试** 不同用户无法访问他人数据
4. **分享链接** token 要足够随机（使用 `gen_random_uuid()`）

### 9.3 向后兼容

- 现有用户的本地数据必须保留
- 未登录用户仍可使用（本地模式）
- 登录后可选择是否同步本地数据

---

## 10. 后续扩展

### 10.1 协作编辑（未来）

- 基于 Supabase Realtime 实现多人同时编辑
- 需要更细粒度的冲突解决（OT 或 CRDT）
- 协作者管理和权限控制

### 10.2 版本历史（未来）

- 记录每次修改的快照
- 支持回滚到历史版本
- 查看变更记录

### 10.3 团队空间（未来）

- 组织/团队概念
- 共享项目库
- 角色和权限管理

---

## 附录 A: 依赖清单

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x"
  }
}
```

## 附录 B: 类型定义示例

```typescript
// src/types/auth.ts
export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
  provider: 'google' | 'notion'
}

// src/types/sync.ts
export type SyncStatus = 'idle' | 'syncing' | 'dirty' | 'error' | 'offline'

export interface SyncConflict {
  projectId: string
  localVersion: number
  remoteVersion: number
  localData: Project
  remoteData: Project
  localUpdatedAt: number
  remoteUpdatedAt: number
}

export interface CloudProject {
  id: string
  owner_id: string
  name: string
  description: string
  data: Project
  version: number
  created_at: string
  updated_at: string
}
```

---

## 11. 确认的配置和决策

### 11.1 Supabase 配置

| 项目 | 值 |
|------|-----|
| Project URL | `https://ymwmqhlyblczfbprsqnz.supabase.co` |
| 生产域名 | `https://tools.chenge.ink` |

### 11.2 OAuth Providers

- [x] Google OAuth - 已启用
- [x] Notion OAuth - 已启用
- [x] Email Auth - 已启用

### 11.3 设计决策

| 问题 | 决策 |
|------|------|
| 数据隔离方式 | **独立 schema** (`radar_compare`) |
| 匿名使用 | **允许** - 未登录用户数据仅本地存储 |
| 本地数据迁移 | **自动上传** - 首次登录时自动同步到云端 |

---

**文档版本**: 1.1
**创建日期**: 2026-01-10
**更新日期**: 2026-01-10
**作者**: Claude (AI Assistant)
**状态**: 已确认，开始实施
