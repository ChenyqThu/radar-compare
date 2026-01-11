import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/services/supabase'
import type { AuthStore } from '@/types/auth'
import { toAuthUser } from '@/types/auth'
import type { Database } from '@/types/supabase'
import { useSyncStore } from './syncStore'
import { useRadarStore } from './radarStore'

type ProfileInsert = Database['radar_compare']['Tables']['profiles']['Insert']

// Ensure user profile exists in radar_compare schema
async function ensureProfile(): Promise<void> {
  console.log('[Auth] Ensuring profile...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[Auth] No user found, skipping profile check')
      return
    }

    // Check if profile exists
    console.log('[Auth] Checking if profile exists...')
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" (not found, which is expected for new users)
      console.warn('[Auth] Profile check error:', selectError)
      // Don't block on error, continue anyway
      return
    }

    if (existing) {
      console.log('[Auth] Profile already exists')
      return
    }

    // Insert new profile
    console.log('[Auth] Creating new profile...')
    const profileData: ProfileInsert = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: user.app_metadata?.provider,
    }

    const { error } = await supabase
      .from('profiles')
      .insert(profileData as never)

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.warn('[Auth] Profile insert error:', error)
    } else {
      console.log('[Auth] Profile created successfully')
    }
  } catch (error) {
    console.warn('[Auth] Failed to ensure profile:', error)
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured' })
      return
    }

    set({ isLoading: true, error: null })

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  signInWithNotion: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured' })
      return
    }

    set({ isLoading: true, error: null })

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured' })
      return
    }

    set({ isLoading: true, error: null })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      set({ error: error.message, isLoading: false })
    } else if (data.user) {
      set({
        user: toAuthUser(data.user),
        session: data.session,
        isLoading: false,
      })
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured' })
      return
    }

    set({ isLoading: true, error: null })

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      set({ error: error.message, isLoading: false })
    } else if (data.user) {
      set({
        user: toAuthUser(data.user),
        session: data.session,
        isLoading: false,
      })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })

    const { error } = await supabase.auth.signOut()

    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ user: null, session: null, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))

// Initialize auth state listener
export function initializeAuth(): () => void {
  if (!isSupabaseConfigured) {
    useAuthStore.setState({ isLoading: false, isInitialized: true })
    return () => {}
  }

  // Listen for auth state changes - this handles all events including initial session
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[Auth] Event:', event, session?.user?.email)

      if (session?.user) {
        // User is signed in (handles INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED)
        // Set user state first, then ensure profile in background
        console.log('[Auth] Setting user state...')
        useAuthStore.setState({
          user: toAuthUser(session.user),
          session,
          isLoading: false,
          isInitialized: true,
        })
        console.log('[Auth] User state set:', useAuthStore.getState().user?.email)

        // Ensure profile exists (don't block UI on this)
        if (event === 'SIGNED_IN') {
          ensureProfile().catch(err => console.warn('[Auth] ensureProfile failed:', err))

          // Trigger data sync after sign in
          console.log('[Auth] Triggering data sync...')
          useSyncStore.getState().checkAndSync().then(() => {
            // Refresh project list after sync
            useRadarStore.getState().refreshProjectList()
          }).catch(err => console.warn('[Auth] Sync failed:', err))
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        useAuthStore.setState({
          user: null,
          session: null,
          isLoading: false,
          isInitialized: true,
        })
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No initial session - user is not logged in
        useAuthStore.setState({
          isLoading: false,
          isInitialized: true,
        })
      }
    }
  )

  return () => subscription.unsubscribe()
}
