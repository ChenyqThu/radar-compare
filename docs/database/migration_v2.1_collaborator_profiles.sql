-- Migration v2.1: Fix collaborator profile visibility
-- Issue: RLS policy on profiles table prevents project owners from seeing collaborator names
-- Solution: Add SECURITY DEFINER function and RLS policy

-- =============================================================================
-- 1. Add RLS policy for project owners to view collaborator profiles
-- =============================================================================

-- Allow project owners to view profiles of their collaborators
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

-- Drop the old policy and recreate with combined logic
DROP POLICY IF EXISTS "Users can view own profile" ON radar_compare.profiles;

-- =============================================================================
-- 2. Grant permissions
-- =============================================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA radar_compare TO authenticated;
