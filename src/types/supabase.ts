// Supabase Database Types
// This file defines the database schema types for TypeScript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          data: Json
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string
          data: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string
          data?: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      shares: {
        Row: {
          id: string
          project_id: string
          created_by: string
          share_type: 'readonly' | 'editable'
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
          share_type: 'readonly' | 'editable'
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
          share_type?: 'readonly' | 'editable'
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
          role: 'viewer' | 'editor' | 'admin'
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'viewer' | 'editor' | 'admin'
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'viewer' | 'editor' | 'admin'
          invited_by?: string | null
          created_at?: string
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['radar_compare']['Tables']['profiles']['Row']
export type CloudProject = Database['radar_compare']['Tables']['projects']['Row']
export type Share = Database['radar_compare']['Tables']['shares']['Row']
export type Collaborator = Database['radar_compare']['Tables']['collaborators']['Row']
