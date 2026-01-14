import { supabase, isSupabaseConfigured } from './client'
import { getChartsByProject } from './radarCharts'
import type { AnyRadarChart } from '@/types'
import type { Database, ShareType, ShareScope, CollaboratorRole } from '@/types/supabase'

type ShareRow = Database['radar_compare']['Tables']['shares']['Row']
type ShareInsert = Database['radar_compare']['Tables']['shares']['Insert']

export interface ShareLink {
  id: string
  projectId: string
  shareToken: string
  shareType: ShareType
  shareScope: ShareScope
  sharedTabIds?: string[]
  password?: string
  expiresAt?: string
  maxViews?: number
  viewCount: number
  isActive: boolean
  createdAt: string
  createdBy?: string
}

export interface CreateShareOptions {
  projectId: string
  shareType: ShareType
  shareScope?: ShareScope
  sharedTabIds?: string[]
  password?: string
  expiresAt?: Date
  maxViews?: number
}

/**
 * Generate a random share token
 */
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Create a share link for a project
 */
export async function createShareLink(options: CreateShareOptions): Promise<ShareLink | null> {
  if (!isSupabaseConfigured) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const shareToken = generateShareToken()

  const insertData: ShareInsert = {
    project_id: options.projectId,
    created_by: user.id,
    share_type: options.shareType,
    share_scope: options.shareScope || 'project',
    shared_tab_ids: options.sharedTabIds || null,
    share_token: shareToken,
    password_hash: options.password || null,
    expires_at: options.expiresAt?.toISOString() || null,
    max_views: options.maxViews || null,
    view_count: 0,
    is_active: true,
  }

  const { data, error } = await supabase
    .from('shares')
    .insert(insertData as never)
    .select()
    .single()

  if (error) {
    console.error('[Share] Failed to create share link:', error)
    return null
  }

  const row = data as unknown as ShareRow
  return mapShareRowToLink(row)
}

/**
 * Get all share links for a project (only if user is the owner)
 */
export async function getProjectShares(projectId: string): Promise<ShareLink[]> {
  if (!isSupabaseConfigured) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Only return shares created by the current user (owner)
  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('project_id', projectId)
    .eq('created_by', user.id)  // Only show shares created by this user
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Share] Failed to get shares:', error)
    return []
  }

  const rows = data as unknown as ShareRow[]
  return rows.map(mapShareRowToLink)
}

/**
 * Get a share link by token (for accessing shared project)
 */
export async function getShareByToken(token: string): Promise<ShareLink | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('[Share] Failed to get share by token:', error)
    return null
  }

  const row = data as unknown as ShareRow
  return mapShareRowToLink(row)
}

/**
 * Get project data via share token (bypasses RLS using server function)
 */
export interface SharedProjectData {
  project: {
    id: string
    name: string
    description?: string
    activeChartId: string | null
  }
  charts: AnyRadarChart[]
  share: {
    id: string
    shareType: ShareType
    shareScope: ShareScope
    sharedTabIds?: string[]
    ownerId: string
  }
}

export async function getProjectByShareToken(token: string): Promise<SharedProjectData | null> {
  if (!isSupabaseConfigured) return null

  // Use type assertion for RPC call since the schema might not be fully typed
  const { data, error } = await (supabase.rpc as CallableFunction)('get_project_by_share_token', { p_token: token })

  if (error) {
    console.error('[Share] Failed to get project by share token:', error)
    return null
  }

  if (!data) return null

  // The RPC returns jsonb with new structure: { project, charts, share }
  interface RpcResult {
    project: {
      id: string
      name: string
      description?: string
      activeChartId: string | null
    }
    charts: Array<{
      id: string
      name: string
      chartType: string
      order: number
      data: Record<string, unknown>
      timeMarker?: { year: number; month?: number }
      createdAt: number
      updatedAt: number
    }>
    share: {
      id: string
      shareType: ShareType
      shareScope: ShareScope
      sharedTabIds?: string[]
      ownerId: string
    }
  }

  const result = data as RpcResult

  // Convert chart rows to frontend types
  const charts: AnyRadarChart[] = (result.charts || []).map(c => {
    if (c.chartType === 'timeline') {
      return {
        id: c.id,
        name: c.name,
        order: c.order,
        isTimeline: true as const,
        sourceRadarIds: (c.data.sourceRadarIds as string[]) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    }

    if (c.chartType === 'version_timeline') {
      return {
        id: c.id,
        name: c.name,
        order: c.order,
        isVersionTimeline: true as const,
        info: (c.data.info as { title: string; theme?: string }) || { title: '大事记' },
        events: (c.data.events as unknown[]) || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    }

    if (c.chartType === 'manpower') {
      return {
        id: c.id,
        name: c.name,
        order: c.order,
        isManpowerChart: true as const,
        metadata: (c.data.metadata as any) || {
          title: '研发人力排布',
          version: '1.0.0',
          totalPersons: 0,
        },
        teams: (c.data.teams as any[]) || [],
        projects: (c.data.projects as any[]) || [],
        timePoints: (c.data.timePoints as any[]) || [],
        allocations: (c.data.allocations as any) || {},
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    }

    // Regular radar chart
    return {
      id: c.id,
      name: c.name,
      order: c.order,
      dimensions: (c.data.dimensions as unknown[]) || [],
      vendors: (c.data.vendors as unknown[]) || [],
      timeMarker: c.timeMarker,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }
  }) as AnyRadarChart[]

  return {
    project: result.project,
    charts,
    share: result.share,
  }
}

/**
 * Increment view count for a share link
 */
export async function incrementShareViewCount(shareId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  // Get current view count
  const { data, error: getError } = await supabase
    .from('shares')
    .select('view_count')
    .eq('id', shareId)
    .single()

  if (getError) {
    console.error('[Share] Failed to get view count:', getError)
    return false
  }

  const currentCount = (data as { view_count: number })?.view_count || 0

  // Update with incremented count
  const { error } = await supabase
    .from('shares')
    .update({ view_count: currentCount + 1 } as never)
    .eq('id', shareId)

  if (error) {
    console.error('[Share] Failed to increment view count:', error)
    return false
  }

  return true
}

/**
 * Revoke (deactivate) a share link (owner only)
 */
export async function revokeShareLink(shareId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Only revoke if the share was created by this user
  const { data, error } = await supabase
    .from('shares')
    .update({ is_active: false } as never)
    .eq('id', shareId)
    .eq('created_by', user.id)  // Ensure user is the creator
    .select()

  if (error) {
    console.error('[Share] Failed to revoke share link:', error)
    return false
  }

  // Check if any rows were actually updated
  const updatedRows = data as unknown[] | null
  if (!updatedRows || updatedRows.length === 0) {
    console.error('[Share] No rows updated - share may not exist or user is not the creator')
    return false
  }

  return true
}

/**
 * Delete a share link permanently (owner only)
 */
export async function deleteShareLink(shareId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Only delete if the share was created by this user
  // Use .select() to get deleted rows and verify deletion actually occurred
  const { data, error } = await supabase
    .from('shares')
    .delete()
    .eq('id', shareId)
    .eq('created_by', user.id)  // Ensure user is the creator
    .select()

  if (error) {
    console.error('[Share] Failed to delete share link:', error)
    return false
  }

  // Check if any rows were actually deleted
  const deletedRows = data as unknown[] | null
  if (!deletedRows || deletedRows.length === 0) {
    console.error('[Share] No rows deleted - share may not exist or user is not the creator')
    return false
  }

  return true
}

/**
 * Check if a share link is valid (not expired, within view limit, active)
 */
export function isShareLinkValid(share: ShareLink): { valid: boolean; reason?: string } {
  if (!share.isActive) {
    return { valid: false, reason: 'Link has been revoked' }
  }

  if (share.expiresAt) {
    const expiry = new Date(share.expiresAt)
    if (expiry < new Date()) {
      return { valid: false, reason: 'Link has expired' }
    }
  }

  if (share.maxViews && share.viewCount >= share.maxViews) {
    return { valid: false, reason: 'Maximum views reached' }
  }

  return { valid: true }
}

/**
 * Get the full share URL
 */
export function getShareUrl(shareToken: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/share/${shareToken}`
}

// Helper function to map database row to ShareLink
function mapShareRowToLink(row: ShareRow): ShareLink {
  return {
    id: row.id,
    projectId: row.project_id,
    shareToken: row.share_token,
    shareType: row.share_type,
    shareScope: row.share_scope,
    sharedTabIds: row.shared_tab_ids || undefined,
    password: row.password_hash || undefined,
    expiresAt: row.expires_at || undefined,
    maxViews: row.max_views || undefined,
    viewCount: row.view_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }
}

// =============================================================================
// Collaborator Functions
// =============================================================================

/**
 * Join a project as a collaborator via share link
 */
export async function joinCollaboration(
  shareId: string,
  projectId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Don't allow owner to join as collaborator
  if (user.id === ownerId) {
    return { success: false, error: 'Cannot collaborate on your own project' }
  }

  // Check if already a collaborator
  const { data: existing } = await supabase
    .from('collaborators')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { success: true } // Already a collaborator
  }

  // Insert new collaborator
  const { error } = await supabase
    .from('collaborators')
    .insert({
      project_id: projectId,
      user_id: user.id,
      share_id: shareId,
      role: 'editor' as CollaboratorRole,
    } as never)

  if (error) {
    console.error('[Collaborator] Failed to join:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all projects the user is collaborating on
 */
export async function getCollaboratedProjects(): Promise<Array<{
  projectId: string
  role: CollaboratorRole
  joinedAt: string
}>> {
  if (!isSupabaseConfigured) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('collaborators')
    .select('project_id, role, created_at')
    .eq('user_id', user.id)

  if (error) {
    console.error('[Collaborator] Failed to get collaborations:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    projectId: row.project_id as string,
    role: row.role as CollaboratorRole,
    joinedAt: row.created_at as string,
  }))
}

/**
 * Leave a collaboration
 */
export async function leaveCollaboration(projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Collaborator] Failed to leave:', error)
    return false
  }

  return true
}

/**
 * Get collaborators for a project (owner only)
 */
export async function getProjectCollaborators(projectId: string): Promise<Array<{
  id: string
  userId: string
  role: CollaboratorRole
  joinedAt: string
  email?: string
  name?: string
}>> {
  if (!isSupabaseConfigured) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // First verify the user is the project owner
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (projectError || !projectData) {
    console.error('[Collaborator] Failed to verify ownership:', projectError)
    return []
  }

  // Only allow owner to see collaborators
  if ((projectData as { owner_id: string }).owner_id !== user.id) {
    return []
  }

  const { data, error } = await supabase
    .from('collaborators')
    .select(`
      id,
      user_id,
      role,
      created_at,
      profiles:user_id (email, name)
    `)
    .eq('project_id', projectId)

  if (error) {
    console.error('[Collaborator] Failed to get collaborators:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => {
    // Supabase foreign key join can return object or array
    const profiles = row.profiles
    let email: string | undefined
    let name: string | undefined

    if (profiles) {
      if (Array.isArray(profiles) && profiles.length > 0) {
        // If returned as array, take first element
        email = (profiles[0] as Record<string, unknown>)?.email as string | undefined
        name = (profiles[0] as Record<string, unknown>)?.name as string | undefined
      } else if (typeof profiles === 'object') {
        // If returned as object
        email = (profiles as Record<string, unknown>)?.email as string | undefined
        name = (profiles as Record<string, unknown>)?.name as string | undefined
      }
    }

    return {
      id: row.id as string,
      userId: row.user_id as string,
      role: row.role as CollaboratorRole,
      joinedAt: row.created_at as string,
      email,
      name,
    }
  })
}

/**
 * Remove a collaborator from project (owner only)
 */
export async function removeCollaborator(projectId: string, collaboratorId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // First verify the user is the project owner
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (projectError || !projectData) {
    console.error('[Collaborator] Failed to verify ownership:', projectError)
    return false
  }

  // Only allow owner to remove collaborators
  if ((projectData as { owner_id: string }).owner_id !== user.id) {
    console.error('[Collaborator] Not authorized to remove collaborators')
    return false
  }

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('id', collaboratorId)

  if (error) {
    console.error('[Collaborator] Failed to remove:', error)
    return false
  }

  return true
}

// Re-export types
export type { ShareType, ShareScope, CollaboratorRole }

// =============================================================================
// My Collaborations Functions
// =============================================================================

/**
 * Collaboration detail with project and share info
 * Each entry represents ONE shared Tab (not aggregated)
 */
export interface CollaborationDetail {
  id: string                    // unique key: `${collabId}-${tabId}`
  collabId: string              // collaborator record id
  projectId: string
  projectName: string
  tabId: string                 // specific Tab ID
  tabName: string               // Tab name
  role: CollaboratorRole
  joinedAt: string
  shareToken: string            // share token that contains this Tab
  shareType: ShareType
  expiresAt?: string
  isExpired: boolean
  ownerName?: string
  ownerEmail?: string
}

/**
 * Get all collaborations for the current user with full details
 * Returns ONE entry per shared Tab (not aggregated)
 */
export async function getMyCollaborations(): Promise<CollaborationDetail[]> {
  if (!isSupabaseConfigured) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Define types for query results
  interface CollabRow {
    id: string
    project_id: string
    role: string
    created_at: string
  }

  interface ShareRow {
    id: string
    share_token: string
    share_type: string
    shared_tab_ids: string[] | null
    expires_at: string | null
    is_active: boolean
    created_by: string
  }

  // Get all projects where user is a collaborator
  const { data: collabData, error: collabError } = await supabase
    .from('collaborators')
    .select('id, project_id, role, created_at')
    .eq('user_id', user.id)

  if (collabError) {
    console.error('[Collaborations] Failed to get collaborations:', collabError)
    return []
  }

  if (!collabData || collabData.length === 0) return []

  const collaborations: CollaborationDetail[] = []

  for (const collab of collabData as unknown as CollabRow[]) {
    const projectId = collab.project_id

    // Get project name
    const { data: projectData } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    if (!projectData) continue
    const projectName = (projectData as { name: string }).name

    // Get ALL active editable shares for this project
    const { data: sharesData } = await supabase
      .from('shares')
      .select('id, share_token, share_type, shared_tab_ids, expires_at, is_active, created_by')
      .eq('project_id', projectId)
      .eq('share_type', 'editable')
      .eq('is_active', true)

    if (!sharesData || sharesData.length === 0) continue

    // Get all charts for this project to resolve names
    const charts = await getChartsByProject(projectId)

    // Track which tabs we've already added (to avoid duplicates)
    const addedTabIds = new Set<string>()

    // Get owner info (from first share)
    let ownerId = ''
    let ownerName: string | undefined
    let ownerEmail: string | undefined

    for (const share of sharesData as unknown as ShareRow[]) {
      if (!ownerId && share.created_by) {
        ownerId = share.created_by
      }
    }

    if (ownerId) {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', ownerId)
        .single()

      if (ownerData) {
        const profile = ownerData as { name?: string; email?: string }
        ownerName = profile.name
        ownerEmail = profile.email
      }
    }

    // Create ONE entry per Tab
    for (const share of sharesData as unknown as ShareRow[]) {
      // Check if share is expired
      const isExpired = share.expires_at ? new Date(share.expires_at) < new Date() : false
      if (isExpired) continue

      const tabIds = share.shared_tab_ids || []

      for (const tabId of tabIds) {
        // Skip if already added
        if (addedTabIds.has(tabId)) continue
        addedTabIds.add(tabId)

        // Find chart name
        const chart = charts.find(c => c.id === tabId)
        if (!chart) continue

        collaborations.push({
          id: `${collab.id}-${tabId}`,
          collabId: collab.id,
          projectId,
          projectName,
          tabId,
          tabName: chart.name,
          role: collab.role as CollaboratorRole,
          joinedAt: collab.created_at,
          shareToken: share.share_token,
          shareType: 'editable',
          expiresAt: share.expires_at || undefined,
          isExpired: false,
          ownerName,
          ownerEmail,
        })
      }
    }
  }

  return collaborations
}
