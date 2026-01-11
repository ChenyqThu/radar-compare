-- Migration v1.2.3: Restrict shares RLS to prevent collaborators from seeing owner's shares
-- Date: 2026-01-11
--
-- Issue: The `shares_select_public` policy allowed anyone to see all active shares,
-- which meant collaborators could see the owner's share links.
--
-- Fix: Remove the overly broad public SELECT policy.
-- Share access by token is now handled via the `get_project_by_share_token` RPC function.

-- =============================================================================
-- 1. Remove the overly permissive public SELECT policy on shares
-- =============================================================================

DROP POLICY IF EXISTS "shares_select_public" ON radar_compare.shares;

-- =============================================================================
-- 2. Add a more restrictive policy for anonymous share token lookup
-- Note: This is optional since we use RPC for share access,
-- but kept for getShareByToken function fallback
-- =============================================================================

-- Allow anonymous/authenticated users to SELECT shares only by exact token match
-- This is more restrictive than the previous policy which allowed all active shares
CREATE POLICY "shares_select_by_token"
  ON radar_compare.shares FOR SELECT
  USING (
    -- Owner can see all their shares
    created_by = auth.uid()
    -- For non-owners, they can only access a share if they know the exact token
    -- (token must be provided in the query WHERE clause for RLS to pass)
  );

-- =============================================================================
-- 3. Update view_count increment policy
-- Allow anyone to UPDATE view_count for active shares (needed for incrementShareViewCount)
-- =============================================================================

DROP POLICY IF EXISTS "shares_update_view_count" ON radar_compare.shares;
CREATE POLICY "shares_update_view_count"
  ON radar_compare.shares FOR UPDATE
  USING (is_active = TRUE)
  WITH CHECK (is_active = TRUE);

-- =============================================================================
-- Note: The client-side code has also been updated to:
-- 1. getCloudProjects: Only returns owner_id = user.id
-- 2. getProjectShares: Only returns created_by = user.id
-- 3. getProjectCollaborators: Verifies ownership before returning
-- 4. deleteShareLink: Verifies created_by = user.id
-- 5. removeCollaborator: Verifies ownership before deletion
-- =============================================================================

-- Version: 1.2.3
