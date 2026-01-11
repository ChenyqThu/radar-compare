-- Radar Compare - Supabase Database Schema
-- 实际部署版本 (2026-01-10)
-- 注意: project.id 使用 TEXT 类型以兼容前端 nanoid

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

-- Projects table
-- 注意: id 使用 TEXT 类型，因为前端使用 nanoid 生成 ID
CREATE TABLE IF NOT EXISTS radar_compare.projects (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES radar_compare.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shares table (for future sharing feature)
-- 注意: project_id 使用 TEXT 类型以匹配 projects.id
CREATE TABLE IF NOT EXISTS radar_compare.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES radar_compare.profiles(id),
  share_type TEXT NOT NULL CHECK (share_type IN ('readonly', 'editable')),
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators table (for future collaboration feature)
-- 注意: project_id 使用 TEXT 类型以匹配 projects.id
CREATE TABLE IF NOT EXISTS radar_compare.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES radar_compare.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID REFERENCES radar_compare.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =============================================================================
-- 3. Create Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_rc_projects_owner ON radar_compare.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_rc_projects_updated ON radar_compare.projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_rc_shares_token ON radar_compare.shares(share_token);
CREATE INDEX IF NOT EXISTS idx_rc_shares_project ON radar_compare.shares(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_collaborators_project ON radar_compare.collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_collaborators_user ON radar_compare.collaborators(user_id);

-- =============================================================================
-- 4. Enable Row Level Security
-- =============================================================================

ALTER TABLE radar_compare.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_compare.collaborators ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS Policies - Profiles
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON radar_compare.profiles;
CREATE POLICY "Users can view own profile"
  ON radar_compare.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON radar_compare.profiles;
CREATE POLICY "Users can update own profile"
  ON radar_compare.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON radar_compare.profiles;
CREATE POLICY "Users can insert own profile"
  ON radar_compare.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 6. RLS Policies - Projects (简化版，避免循环依赖)
-- =============================================================================

-- Owner policies (分开 SELECT/INSERT/UPDATE/DELETE 避免 FOR ALL 的潜在问题)
DROP POLICY IF EXISTS "projects_select_owner" ON radar_compare.projects;
CREATE POLICY "projects_select_owner"
  ON radar_compare.projects FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "projects_insert_owner" ON radar_compare.projects;
CREATE POLICY "projects_insert_owner"
  ON radar_compare.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "projects_update_owner" ON radar_compare.projects;
CREATE POLICY "projects_update_owner"
  ON radar_compare.projects FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "projects_delete_owner" ON radar_compare.projects;
CREATE POLICY "projects_delete_owner"
  ON radar_compare.projects FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================================================
-- 7. RLS Policies - Shares (简化版)
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
-- 8. RLS Policies - Collaborators (简化版)
-- =============================================================================

DROP POLICY IF EXISTS "collaborators_select_self" ON radar_compare.collaborators;
CREATE POLICY "collaborators_select_self"
  ON radar_compare.collaborators FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "collaborators_insert_invited_by" ON radar_compare.collaborators;
CREATE POLICY "collaborators_insert_invited_by"
  ON radar_compare.collaborators FOR INSERT
  WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "collaborators_delete_invited_by" ON radar_compare.collaborators;
CREATE POLICY "collaborators_delete_invited_by"
  ON radar_compare.collaborators FOR DELETE
  USING (invited_by = auth.uid());

-- =============================================================================
-- 9. Functions
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

-- =============================================================================
-- 10. Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS update_rc_profiles_updated_at ON radar_compare.profiles;
CREATE TRIGGER update_rc_profiles_updated_at
  BEFORE UPDATE ON radar_compare.profiles
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

DROP TRIGGER IF EXISTS update_rc_projects_updated_at ON radar_compare.projects;
CREATE TRIGGER update_rc_projects_updated_at
  BEFORE UPDATE ON radar_compare.projects
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

-- =============================================================================
-- 11. Grant Permissions
-- =============================================================================

GRANT USAGE ON SCHEMA radar_compare TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA radar_compare TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA radar_compare TO anon, authenticated;
GRANT EXECUTE ON FUNCTION radar_compare.ensure_profile() TO authenticated;

-- =============================================================================
-- Schema Version: 1.1 (2026-01-10)
-- Changes:
--   - project.id: UUID -> TEXT (兼容前端 nanoid)
--   - shares.project_id: UUID -> TEXT
--   - collaborators.project_id: UUID -> TEXT
--   - RLS policies: 简化避免循环依赖
-- =============================================================================
