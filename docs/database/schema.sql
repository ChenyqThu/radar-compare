-- Radar Compare - Supabase Database Schema
-- 版本 2.2.0 (2026-01-13)
-- 新增人力排布图表类型 (manpower)
--
-- 注意:
-- - project.id 使用 TEXT 类型以兼容前端 nanoid
-- - 每个图表独立存储在 radar_charts 表中
-- - projects.data 字段已弃用，保留仅用于数据回滚

-- =============================================================================
-- 1. Create Schema
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS radar_compare;

-- =============================================================================
-- 2. Create Tables
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS radar_compare.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table (项目元数据)
-- 注意: id 使用 TEXT 类型，因为前端使用 nanoid 生成 ID
CREATE TABLE IF NOT EXISTS radar_compare.projects (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES radar_compare.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  active_chart_id TEXT,                    -- 当前激活的图表 ID
  data JSONB,                               -- [已弃用] 旧版数据，保留用于回滚
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN radar_compare.projects.active_chart_id IS '当前激活的图表 ID，引用 radar_charts.id';
COMMENT ON COLUMN radar_compare.projects.data IS '[已弃用] 旧版 JSON blob 存储，v2.0 后不再使用';

-- Radar Charts table (图表数据)
-- 每个 Tab 对应一条记录，支持细粒度更新
CREATE TABLE IF NOT EXISTS radar_compare.radar_charts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chart_type TEXT NOT NULL DEFAULT 'radar' CHECK (chart_type IN ('radar', 'timeline', 'version_timeline', 'manpower', 'product_matrix')),
  order_index INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,                        -- 图表数据 (根据类型不同)
  time_marker JSONB,                          -- 时间标记 { year, month? }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE radar_compare.radar_charts IS '雷达图表数据，每个 Tab 对应一条记录';
COMMENT ON COLUMN radar_compare.radar_charts.chart_type IS '图表类型: radar=普通雷达图, timeline=时间轴雷达图, version_timeline=版本时间轴, manpower=人力排布, product_matrix=产品矩阵';
COMMENT ON COLUMN radar_compare.radar_charts.data IS '图表数据: radar={dimensions,vendors}, timeline={sourceRadarIds}, version_timeline={info,events}, manpower={metadata,teams,projects,timePoints,allocations}';
COMMENT ON COLUMN radar_compare.radar_charts.time_marker IS '时间标记，用于时间轴对比功能';

-- Shares table (for sharing feature)
-- 注意: project_id 使用 TEXT 类型以匹配 projects.id
CREATE TABLE IF NOT EXISTS radar_compare.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES radar_compare.profiles(id),
  share_type TEXT NOT NULL CHECK (share_type IN ('readonly', 'editable')),
  share_scope TEXT NOT NULL DEFAULT 'tabs' CHECK (share_scope IN ('project', 'tabs')),
  shared_tab_ids TEXT[] DEFAULT NULL,  -- 存储分享的 Tab ID 列表 (引用 radar_charts.id)
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN radar_compare.shares.shared_tab_ids IS '分享的图表 ID 列表，引用 radar_charts.id';

-- Collaborators table (for collaboration feature)
-- 注意: project_id 使用 TEXT 类型以匹配 projects.id
CREATE TABLE IF NOT EXISTS radar_compare.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES radar_compare.profiles(id) ON DELETE CASCADE,
  share_id UUID REFERENCES radar_compare.shares(id) ON DELETE SET NULL,  -- 通过哪个分享链接加入
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  invited_by UUID REFERENCES radar_compare.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =============================================================================
-- 3. Create Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_rc_projects_owner ON radar_compare.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_rc_projects_updated ON radar_compare.projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_rc_charts_project ON radar_compare.radar_charts(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_charts_order ON radar_compare.radar_charts(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rc_charts_type ON radar_compare.radar_charts(chart_type);
CREATE INDEX IF NOT EXISTS idx_rc_shares_token ON radar_compare.shares(share_token);
CREATE INDEX IF NOT EXISTS idx_rc_shares_project ON radar_compare.shares(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_collaborators_project ON radar_compare.collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_collaborators_user ON radar_compare.collaborators(user_id);

-- =============================================================================
-- 4. Enable Row Level Security
-- =============================================================================

ALTER TABLE radar_compare.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.radar_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.collaborators ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS Policies - Profiles
-- =============================================================================

-- SELECT: 用户可查看自己的 profile，项目所有者可查看协作者的 profile
DROP POLICY IF EXISTS "Users can view own profile" ON radar_compare.profiles;
DROP POLICY IF EXISTS "profiles_select_collaborator" ON radar_compare.profiles;
CREATE POLICY "profiles_select_collaborator"
  ON radar_compare.profiles FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    OR
    -- Project owner can view collaborator profiles
    id IN (
      SELECT c.user_id
      FROM radar_compare.collaborators c
      JOIN radar_compare.projects p ON p.id = c.project_id
      WHERE p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON radar_compare.profiles;
CREATE POLICY "Users can update own profile"
  ON radar_compare.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON radar_compare.profiles;
CREATE POLICY "Users can insert own profile"
  ON radar_compare.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 6. Helper Functions (SECURITY DEFINER to avoid RLS recursion)
-- =============================================================================

-- 获取当前用户拥有的项目 ID 列表
CREATE OR REPLACE FUNCTION radar_compare.get_owned_project_ids()
RETURNS SETOF text AS $$
  SELECT id FROM radar_compare.projects WHERE owner_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 获取当前用户作为协作者的项目 ID 列表
CREATE OR REPLACE FUNCTION radar_compare.get_collaborated_project_ids()
RETURNS SETOF text AS $$
  SELECT project_id FROM radar_compare.collaborators WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 检查当前用户是否为指定项目的所有者
CREATE OR REPLACE FUNCTION radar_compare.is_project_owner(p_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM radar_compare.projects WHERE id = p_id AND owner_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 检查当前用户是否为指定项目的编辑者
CREATE OR REPLACE FUNCTION radar_compare.is_project_editor(p_id text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM radar_compare.collaborators
    WHERE project_id = p_id AND user_id = auth.uid() AND role = 'editor'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 7. RLS Policies - Projects (支持所有者和协作者)
-- =============================================================================

-- SELECT: 所有者 OR 协作者
DROP POLICY IF EXISTS "projects_select_owner" ON radar_compare.projects;
DROP POLICY IF EXISTS "projects_select_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_select_owner"
  ON radar_compare.projects FOR SELECT
  USING (owner_id = auth.uid());

-- 使用 SECURITY DEFINER 函数避免 RLS 循环依赖
CREATE POLICY "projects_select_collaborator"
  ON radar_compare.projects FOR SELECT
  USING (id IN (SELECT radar_compare.get_collaborated_project_ids()));

-- INSERT: 仅所有者
DROP POLICY IF EXISTS "projects_insert_owner" ON radar_compare.projects;
CREATE POLICY "projects_insert_owner"
  ON radar_compare.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: 所有者 OR 有编辑权限的协作者
DROP POLICY IF EXISTS "projects_update_owner" ON radar_compare.projects;
DROP POLICY IF EXISTS "projects_update_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_update_owner"
  ON radar_compare.projects FOR UPDATE
  USING (owner_id = auth.uid());

-- 使用 SECURITY DEFINER 函数避免 RLS 循环依赖
CREATE POLICY "projects_update_collaborator"
  ON radar_compare.projects FOR UPDATE
  USING (radar_compare.is_project_editor(id));

-- DELETE: 仅所有者
DROP POLICY IF EXISTS "projects_delete_owner" ON radar_compare.projects;
CREATE POLICY "projects_delete_owner"
  ON radar_compare.projects FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================================================
-- 8. RLS Policies - Radar Charts (图表级权限)
-- =============================================================================

-- SELECT: 项目所有者可读
DROP POLICY IF EXISTS "charts_select_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_select_owner" ON radar_compare.radar_charts FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- SELECT: 协作者可读
DROP POLICY IF EXISTS "charts_select_collaborator" ON radar_compare.radar_charts;
CREATE POLICY "charts_select_collaborator" ON radar_compare.radar_charts FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_collaborated_project_ids()));

-- INSERT: 项目所有者可插入
DROP POLICY IF EXISTS "charts_insert_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_insert_owner" ON radar_compare.radar_charts FOR INSERT
  WITH CHECK (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- INSERT: 编辑者可插入
DROP POLICY IF EXISTS "charts_insert_editor" ON radar_compare.radar_charts;
CREATE POLICY "charts_insert_editor" ON radar_compare.radar_charts FOR INSERT
  WITH CHECK (radar_compare.is_project_editor(project_id));

-- UPDATE: 项目所有者可更新
DROP POLICY IF EXISTS "charts_update_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_update_owner" ON radar_compare.radar_charts FOR UPDATE
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- UPDATE: 编辑者可更新
DROP POLICY IF EXISTS "charts_update_editor" ON radar_compare.radar_charts;
CREATE POLICY "charts_update_editor" ON radar_compare.radar_charts FOR UPDATE
  USING (radar_compare.is_project_editor(project_id));

-- DELETE: 项目所有者可删除
DROP POLICY IF EXISTS "charts_delete_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_delete_owner" ON radar_compare.radar_charts FOR DELETE
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- =============================================================================
-- 9. RLS Policies - Shares (简化版)
-- =============================================================================

DROP POLICY IF EXISTS "shares_select_owner" ON radar_compare.shares;
CREATE POLICY "shares_select_owner"
  ON radar_compare.shares FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "shares_insert_owner" ON radar_compare.shares;
CREATE POLICY "shares_insert_owner"
  ON radar_compare.shares FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "shares_update_owner" ON radar_compare.shares;
CREATE POLICY "shares_update_owner"
  ON radar_compare.shares FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "shares_delete_owner" ON radar_compare.shares;
CREATE POLICY "shares_delete_owner"
  ON radar_compare.shares FOR DELETE
  USING (created_by = auth.uid());

-- Public access to active shares (for share link feature)
DROP POLICY IF EXISTS "shares_select_public" ON radar_compare.shares;
CREATE POLICY "shares_select_public"
  ON radar_compare.shares FOR SELECT
  USING (is_active = TRUE);

-- =============================================================================
-- 10. RLS Policies - Collaborators
-- =============================================================================

-- SELECT: 自己的协作记录 OR 项目所有者可查看协作者列表
DROP POLICY IF EXISTS "collaborators_select_self" ON radar_compare.collaborators;
DROP POLICY IF EXISTS "collaborators_select_owner" ON radar_compare.collaborators;
CREATE POLICY "collaborators_select_self"
  ON radar_compare.collaborators FOR SELECT
  USING (user_id = auth.uid());

-- 使用 SECURITY DEFINER 函数避免 RLS 循环依赖
CREATE POLICY "collaborators_select_owner"
  ON radar_compare.collaborators FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- INSERT: 项目所有者邀请 OR 用户自己通过分享链接加入
DROP POLICY IF EXISTS "collaborators_insert_invited_by" ON radar_compare.collaborators;
DROP POLICY IF EXISTS "collaborators_insert_self" ON radar_compare.collaborators;
CREATE POLICY "collaborators_insert_invited_by"
  ON radar_compare.collaborators FOR INSERT
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "collaborators_insert_self"
  ON radar_compare.collaborators FOR INSERT
  WITH CHECK (user_id = auth.uid() AND share_id IS NOT NULL);

-- DELETE: 项目所有者可移除协作者 OR 协作者自己退出
DROP POLICY IF EXISTS "collaborators_delete_invited_by" ON radar_compare.collaborators;
DROP POLICY IF EXISTS "collaborators_delete_self" ON radar_compare.collaborators;
DROP POLICY IF EXISTS "collaborators_delete_owner" ON radar_compare.collaborators;

-- 使用 SECURITY DEFINER 函数避免 RLS 循环依赖
CREATE POLICY "collaborators_delete_owner"
  ON radar_compare.collaborators FOR DELETE
  USING (radar_compare.is_project_owner(project_id));

CREATE POLICY "collaborators_delete_self"
  ON radar_compare.collaborators FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- 11. Functions
-- =============================================================================

-- Function to ensure user profile exists
CREATE OR REPLACE FUNCTION radar_compare.ensure_profile()
RETURNS UUID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO radar_compare.profiles (id, email, name, avatar_url, provider)
  SELECT
    current_user_id,
    auth.jwt()->>'email',
    COALESCE(
      auth.jwt()->'user_metadata'->>'full_name',
      auth.jwt()->'user_metadata'->>'name',
      split_part(auth.jwt()->>'email', '@', 1)
    ),
    COALESCE(
      auth.jwt()->'user_metadata'->>'avatar_url',
      auth.jwt()->'user_metadata'->>'picture'
    ),
    auth.jwt()->'app_metadata'->>'provider'
  ON CONFLICT (id) DO NOTHING;

  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION radar_compare.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get project data via share token (bypasses RLS for shared access)
-- 返回项目元数据和图表数据 (从 radar_charts 表获取)
CREATE OR REPLACE FUNCTION radar_compare.get_project_by_share_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_share radar_compare.shares%ROWTYPE;
  v_project radar_compare.projects%ROWTYPE;
  v_charts jsonb;
BEGIN
  -- 查找有效的分享链接
  SELECT * INTO v_share
  FROM radar_compare.shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_views IS NULL OR view_count < max_views);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 查找项目元数据
  SELECT * INTO v_project
  FROM radar_compare.projects
  WHERE id = v_share.project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 查找图表数据 (从 radar_charts 表)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'chartType', c.chart_type,
      'order', c.order_index,
      'data', c.data,
      'timeMarker', c.time_marker,
      'createdAt', extract(epoch from c.created_at) * 1000,
      'updatedAt', extract(epoch from c.updated_at) * 1000
    ) ORDER BY c.order_index
  ) INTO v_charts
  FROM radar_compare.radar_charts c
  WHERE c.project_id = v_share.project_id
    AND (v_share.shared_tab_ids IS NULL OR c.id = ANY(v_share.shared_tab_ids));

  -- 返回项目元数据和图表数据
  RETURN jsonb_build_object(
    'project', jsonb_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'description', v_project.description,
      'activeChartId', v_project.active_chart_id
    ),
    'charts', COALESCE(v_charts, '[]'::jsonb),
    'share', jsonb_build_object(
      'id', v_share.id,
      'shareType', v_share.share_type,
      'shareScope', v_share.share_scope,
      'sharedTabIds', v_share.shared_tab_ids,
      'ownerId', v_share.created_by
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 12. Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS update_rc_profiles_updated_at ON radar_compare.profiles;
CREATE TRIGGER update_rc_profiles_updated_at
  BEFORE UPDATE ON radar_compare.profiles
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

DROP TRIGGER IF EXISTS update_rc_projects_updated_at ON radar_compare.projects;
CREATE TRIGGER update_rc_projects_updated_at
  BEFORE UPDATE ON radar_compare.projects
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

DROP TRIGGER IF EXISTS update_rc_charts_updated_at ON radar_compare.radar_charts;
CREATE TRIGGER update_rc_charts_updated_at
  BEFORE UPDATE ON radar_compare.radar_charts
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

-- =============================================================================
-- 13. Grant Permissions
-- =============================================================================

GRANT USAGE ON SCHEMA radar_compare TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA radar_compare TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA radar_compare TO anon, authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.ensure_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.get_owned_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.get_collaborated_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.is_project_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.is_project_editor(text) TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.get_project_by_share_token(text) TO anon, authenticated;

-- =============================================================================
-- Schema Version: 2.2.0 (2026-01-13)
--
-- 架构变更 (v2.2):
--   - 新增 chart_type='manpower' 人力排布图表类型
--   - manpower data 结构: {metadata,teams,projects,timePoints,allocations}
--
-- 架构变更 (v2.1):
--   - 更新 profiles RLS 策略，允许项目所有者查看协作者 profile (name/email)
--
-- 架构变更 (v2.0):
--   - 新增 radar_charts 表，支持图表级独立存储
--   - 新增 projects.active_chart_id 字段
--   - projects.data 字段已弃用 (保留用于数据回滚)
--   - 更新 get_project_by_share_token 函数，从 radar_charts 表获取数据
--
-- 数据结构:
--   projects: 项目元数据 (id, name, description, active_chart_id)
--   radar_charts: 图表数据 (每个 Tab 一条记录)
--     - chart_type='radar': data={dimensions, vendors}
--     - chart_type='timeline': data={sourceRadarIds}
--     - chart_type='version_timeline': data={info, events}
--     - chart_type='manpower': data={metadata, teams, projects, timePoints, allocations}
--     - chart_type='product_matrix': data={vendors, dimensions, products, matrixConfig, petalConfig}
--
-- 迁移说明:
--   v2.2: 参见 migration_v2.2_manpower_chart.sql
--   v2.0: 参见 migration_v2.0_chart_storage.sql
--   v2.1: 参见 migration_v2.1_collaborator_profiles.sql
--
-- Previous versions:
--   v2.2.0 (2026-01-13): 新增人力排布图表类型
--   v2.1.0 (2026-01-11): 协作者 Profile 可见性
--   v2.0.0 (2026-01-11): 图表级独立存储架构
--   v1.2.2 (2026-01-11): get_project_by_share_token 函数
--   v1.2.1 (2026-01-11): 修复 RLS 循环依赖，新增辅助函数
--   v1.2 (2026-01-11): shares/collaborators 支持 Tab 级分享和协作
--   v1.1 (2026-01-10): project.id UUID -> TEXT, 简化 RLS
-- =============================================================================
