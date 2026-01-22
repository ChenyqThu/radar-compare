// Supabase Database Types
// This file defines the database schema types for TypeScript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ShareType = 'readonly' | 'editable'
export type ShareScope = 'project' | 'tabs'
export type CollaboratorRole = 'viewer' | 'editor'
export type ChartType = 'radar' | 'timeline' | 'version_timeline' | 'manpower' | 'product_matrix'

export interface Database {
  radar_compare: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar_url: string | null
          provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          provider?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string
          active_chart_id: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string
          active_chart_id?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string
          active_chart_id?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      radar_charts: {
        Row: {
          id: string
          project_id: string
          name: string
          chart_type: ChartType
          order_index: number
          data: Json
          time_marker: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          project_id: string
          name: string
          chart_type?: ChartType
          order_index?: number
          data: Json
          time_marker?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          chart_type?: ChartType
          order_index?: number
          data?: Json
          time_marker?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      shares: {
        Row: {
          id: string
          project_id: string
          created_by: string
          share_type: ShareType
          share_scope: ShareScope
          shared_tab_ids: string[] | null
          share_token: string
          password_hash: string | null
          expires_at: string | null
          max_views: number | null
          view_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          created_by: string
          share_type: ShareType
          share_scope?: ShareScope
          shared_tab_ids?: string[] | null
          share_token?: string
          password_hash?: string | null
          expires_at?: string | null
          max_views?: number | null
          view_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          created_by?: string
          share_type?: ShareType
          share_scope?: ShareScope
          shared_tab_ids?: string[] | null
          share_token?: string
          password_hash?: string | null
          expires_at?: string | null
          max_views?: number | null
          view_count?: number
          is_active?: boolean
          created_at?: string
        }
      }
      collaborators: {
        Row: {
          id: string
          project_id: string
          user_id: string
          share_id: string | null
          role: CollaboratorRole
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          share_id?: string | null
          role?: CollaboratorRole
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          share_id?: string | null
          role?: CollaboratorRole
          invited_by?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      get_project_by_share_token: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['radar_compare']['Tables']['profiles']['Row']
export type CloudProject = Database['radar_compare']['Tables']['projects']['Row']
export type RadarChartRow = Database['radar_compare']['Tables']['radar_charts']['Row']
export type Share = Database['radar_compare']['Tables']['shares']['Row']
export type Collaborator = Database['radar_compare']['Tables']['collaborators']['Row']

// Extended types for frontend use
export interface ShareWithOwner extends Share {
  owner?: Profile
  project?: { name: string }
}

export interface CollaboratorWithProfile extends Collaborator {
  profile?: Profile
}

export interface ProjectWithMeta extends CloudProject {
  isOwner: boolean
  isCollaborator: boolean
  ownerName?: string
  collaboratorCount?: number
}

// Cloud project metadata (for list view)
export interface CloudProjectMeta {
  id: string
  name: string
  description: string
  activeChartId: string | null
  updatedAt: string
  createdAt: string
}
