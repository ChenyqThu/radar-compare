import type { User, Session } from '@supabase/supabase-js'

export type AuthProvider = 'google' | 'notion' | 'email'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  provider: AuthProvider
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>
  signInWithNotion: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export type AuthStore = AuthState & AuthActions

// Helper to convert Supabase User to AuthUser
export function toAuthUser(user: User): AuthUser {
  const provider = (user.app_metadata?.provider as AuthProvider) || 'email'

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User',
    avatarUrl: user.user_metadata?.avatar_url ||
               user.user_metadata?.picture ||
               null,
    provider,
  }
}
