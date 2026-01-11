-- Migration: v1.2 -> v1.2.1
-- 修复 RLS 策略循环依赖问题
-- 问题: projects 策略查询 collaborators, collaborators 策略查询 projects = 无限递归
-- 方案: 使用 SECURITY DEFINER 函数绕过 RLS 获取数据

-- =============================================================================
-- 1. 创建辅助函数 (SECURITY DEFINER 绕过 RLS)
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
-- 2. 重建 Projects 表 RLS 策略 (使用辅助函数)
-- =============================================================================

-- SELECT: 协作者可查看项目
DROP POLICY IF EXISTS "projects_select_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_select_collaborator"
  ON radar_compare.projects FOR SELECT
  USING (id IN (SELECT radar_compare.get_collaborated_project_ids()));

-- UPDATE: 有编辑权限的协作者可更新
DROP POLICY IF EXISTS "projects_update_collaborator" ON radar_compare.projects;
CREATE POLICY "projects_update_collaborator"
  ON radar_compare.projects FOR UPDATE
  USING (radar_compare.is_project_editor(id));

-- =============================================================================
-- 3. 重建 Collaborators 表 RLS 策略 (使用辅助函数)
-- =============================================================================

-- SELECT: 项目所有者可查看协作者列表
DROP POLICY IF EXISTS "collaborators_select_owner" ON radar_compare.collaborators;
CREATE POLICY "collaborators_select_owner"
  ON radar_compare.collaborators FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- DELETE: 项目所有者可移除协作者
DROP POLICY IF EXISTS "collaborators_delete_owner" ON radar_compare.collaborators;
CREATE POLICY "collaborators_delete_owner"
  ON radar_compare.collaborators FOR DELETE
  USING (radar_compare.is_project_owner(project_id));

-- =============================================================================
-- 4. 授予函数执行权限
-- =============================================================================

GRANT EXECUTE ON FUNCTION radar_compare.get_owned_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.get_collaborated_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.is_project_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.is_project_editor(text) TO authenticated;

-- =============================================================================
-- 5. 创建分享访问函数 (允许通过有效分享链接访问项目)
-- =============================================================================

-- 通过分享 token 获取项目数据 (绕过 RLS)
CREATE OR REPLACE FUNCTION radar_compare.get_project_by_share_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_share radar_compare.shares%ROWTYPE;
  v_project radar_compare.projects%ROWTYPE;
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

  -- 获取项目数据
  SELECT * INTO v_project
  FROM radar_compare.projects
  WHERE id = v_share.project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 返回项目数据和分享信息
  RETURN jsonb_build_object(
    'project', v_project.data,
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

-- 授权匿名用户和登录用户都可以调用此函数
GRANT EXECUTE ON FUNCTION radar_compare.get_project_by_share_token(text) TO anon, authenticated;

-- =============================================================================
-- Migration complete - v1.2.1
-- =============================================================================
