import { ref, computed, type Ref } from 'vue'
import { supabase } from '@/utils/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: Ref<User | null>
  session: Ref<Session | null>
  loading: Ref<boolean>
  isAuthenticated: Ref<boolean>
}

// Shared state across all composable instances
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const isAuthenticated = computed(() => !!session.value)

// Cache for onboarding check to avoid repeated queries
let onboardingCache: boolean | null = null

// Initialize auth state on module load
let initialized = false
async function initializeAuth() {
  if (initialized) return

  try {
    // Get current session
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null

      // Clear onboarding cache when auth state changes
      if (!newSession) {
        onboardingCache = null
      }
    })

    initialized = true
  } finally {
    loading.value = false
  }
}

// Auto-initialize on module load
initializeAuth()

export function useAuth(): AuthState & {
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  checkOnboarding: () => Promise<boolean>
} {
  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    return { error }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error }
  }

  async function signOut() {
    onboardingCache = null
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    return { error }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }

  async function checkOnboarding(): Promise<boolean> {
    // Return cached value if available
    if (onboardingCache !== null) {
      return onboardingCache
    }

    // Query style_emails count
    const { count, error } = await supabase
      .from('style_emails')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('[useAuth] Error checking onboarding status:', error)
      return false
    }

    // User needs onboarding if they have < 10 style emails
    const needsOnboarding = (count ?? 0) < 10
    onboardingCache = needsOnboarding

    return needsOnboarding
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    checkOnboarding,
  }
}
