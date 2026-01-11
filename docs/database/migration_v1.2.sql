-- Migration: v1.1 -> v1.2
-- 分享与协作功能增强
-- 执行前请备份数据库

-- =============================================================================
-- 1. Update shares table
-- =============================================================================

-- 添加分享粒度字段（默认为 tabs，因为只支持 Tab 级分享）
ALTER TABLE radar_compare.shares
ADD COLUMN IF NOT EXISTS share_scope TEXT NOT NULL DEFAULT 'tabs'
CHECK (share_scope IN ('project', 'tabs'));

-- 添加分享的 Tab ID 列表
ALTER TABLE radar_compare.shares
ADD COLUMN IF NOT EXISTS shared_tab_ids TEXT[] DEFAULT NULL;

-- =============================================================================
-- 2. Update collaborators table
-- =============================================================================

-- 添加分享来源追踪
ALTER TABLE radar_compare.collaborators
ADD COLUMN IF NOT EXISTS share_id UUID REFERENCES radar_compare.shares(id) ON DELETE SET NULL;

-- 更新 role 约束 (移除 admin，只保留 viewer/editor)
-- 注意：如果已有数据使用 admin role，需要先迁移
UPDATE radar_compare.collaborators SET role = 'editor' WHERE role = 'admin';

-- 删除旧约束，添加新约束
ALTER TABLE radar_compare.collaborators DROP CONSTRAINT IF EXISTS collaborators_role_check;
ALTER TABLE radar_compare.collaborators
ADD CONSTRAINT collaborators_role_check CHECK (role IN ('viewer', 'editor'));

-- 设置默认值
ALTER TABLE radar_compare.collaborators ALTER COLUMN role SET DEFAULT 'editor';

-- =============================================================================
-- 3. Update RLS Policies - Projects
-- =============================================================================

-- 协作者可查看项目
DROP POLICY IF EXISTS "projects_select_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_select_collaborator"
  ON radar_compare.projects FOR SELECT
  USING (
    id IN (SELECT project_id FROM radar_compare.collaborators WHERE user_id = auth.uid())
  );

-- 协作者可更新项目（需要 editor 角色）
DROP POLICY IF EXISTS "projects_update_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_update_collaborator"
  ON radar_compare.projects FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM radar_compare.collaborators
      WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

-- =============================================================================
-- 4. Update RLS Policies - Collaborators
-- =============================================================================

-- 项目所有者可查看协作者列表
DROP POLICY IF EXISTS "collaborators_select_owner" ON radar_compare.collaborators;
CREATE POLICY "collaborators_select_owner"
  ON radar_compare.collaborators FOR SELECT
  USING (
    project_id IN (SELECT id FROM radar_compare.projects WHERE owner_id = auth.uid())
  );

-- 用户可通过分享链接自己加入
DROP POLICY IF EXISTS "collaborators_insert_self" ON radar_compare.collaborators;
CREATE POLICY "collaborators_insert_self"
  ON radar_compare.collaborators FOR INSERT
  WITH CHECK (user_id = auth.uid() AND share_id IS NOT NULL);

-- 项目所有者可移除协作者
DROP POLICY IF EXISTS "collaborators_delete_owner" ON radar_compare.collaborators;
DROP POLICY IF EXISTS "collaborators_delete_invited_by" ON radar_compare.collaborators;
CREATE POLICY "collaborators_delete_owner"
  ON radar_compare.collaborators FOR DELETE
  USING (
    project_id IN (SELECT id FROM radar_compare.projects WHERE owner_id = auth.uid())
  );

-- 协作者可自己退出
DROP POLICY IF EXISTS "collaborators_delete_self" ON radar_compare.collaborators;
CREATE POLICY "collaborators_delete_self"
  ON radar_compare.collaborators FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- Migration complete
-- =============================================================================
