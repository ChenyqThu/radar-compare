import { supabase, isSupabaseConfigured } from './client'
import type { Database } from '@/types/supabase'

type ShareRow = Database['radar_compare']['Tables']['shares']['Row']
type ShareInsert = Database['radar_compare']['Tables']['shares']['Insert']

export type ShareType = 'readonly' | 'editable'

export interface ShareLink {
  id: string
  projectId: string
  shareToken: string
  shareType: ShareType
  password?: string
  expiresAt?: string
  maxViews?: number
  viewCount: number
  isActive: boolean
  createdAt: string
}

export interface CreateShareOptions {
  projectId: string
  shareType: ShareType
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
 * Get all share links for a project
 */
export async function getProjectShares(projectId: string): Promise<ShareLink[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('project_id', projectId)
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
 * Revoke (deactivate) a share link
 */
export async function revokeShareLink(shareId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('shares')
    .update({ is_active: false } as never)
    .eq('id', shareId)

  if (error) {
    console.error('[Share] Failed to revoke share link:', error)
    return false
  }

  return true
}

/**
 * Delete a share link permanently
 */
export async function deleteShareLink(shareId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('shares')
    .delete()
    .eq('id', shareId)

  if (error) {
    console.error('[Share] Failed to delete share link:', error)
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
    shareType: row.share_type as ShareType,
    password: row.password_hash || undefined,
    expiresAt: row.expires_at || undefined,
    maxViews: row.max_views || undefined,
    viewCount: row.view_count,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}
