import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { UserProfile, UserRole } from '../types/database.types'

interface AuthContextType {
  session: Session | null
  user: User | null
  userProfile: UserProfile | null
  signOut: () => Promise<void>
  loading: boolean
  setUserRole: (role: UserRole) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrCreateProfile = async (userId: string, userData: User, retryCount = 3) => {
    console.log(`Attempting to fetch profile (attempt ${4 - retryCount}/3)`)
    try {
      // Create abort controller for this attempt
      const abortController = new AbortController()
      const timeout = setTimeout(() => {
        abortController.abort()
      }, 3000) // 3 second timeout

      try {
        const { data: existingProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .abortSignal(abortController.signal)
          .single()

        clearTimeout(timeout)
        console.log('Fetch profile result:', { existingProfile, fetchError })

        if (existingProfile) {
          console.log('Found existing profile:', existingProfile)
          setUserProfile(existingProfile)
          return existingProfile
        }
      } catch (fetchErr) {
        clearTimeout(timeout)
        console.log('Fetch attempt failed:', fetchErr)
      }

      // No profile found or error occurred, retry if we have attempts left
      if (retryCount > 1) {
        console.log(`No profile found, waiting 1s before retry... (${retryCount - 1} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return fetchOrCreateProfile(userId, userData, retryCount - 1)
      }

      // Last attempt, try to create profile
      console.log('All fetch attempts failed, trying to create profile')
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          full_name: userData.user_metadata?.full_name || userData.email,
          role: 'customer'
        }])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('Profile exists (duplicate key), trying one final fetch')
          // Create new abort controller for final fetch
          const finalAbortController = new AbortController()
          const finalTimeout = setTimeout(() => {
            finalAbortController.abort()
          }, 3000)

          try {
            const { data: finalProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .abortSignal(finalAbortController.signal)
              .single()

            clearTimeout(finalTimeout)
            if (finalProfile) {
              setUserProfile(finalProfile)
              return finalProfile
            }
          } catch (finalFetchErr) {
            clearTimeout(finalTimeout)
            console.log('Final fetch attempt failed:', finalFetchErr)
          }
        }
        throw insertError
      }

      if (newProfile) {
        console.log('Successfully created new profile:', newProfile)
        setUserProfile(newProfile)
        return newProfile
      }

      throw new Error('Failed to fetch or create profile after all attempts')
    } catch (err) {
      console.error(`Error in profile management (attempt ${4 - retryCount}/3):`, err)
      // Retry on error if we have attempts left
      if (retryCount > 1) {
        console.log(`Error occurred, waiting 1s before retry... (${retryCount - 1} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return fetchOrCreateProfile(userId, userData, retryCount - 1)
      }
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const handleAuthSession = async () => {
      console.log('Handling initial auth session')
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        console.log('Initial session check:', { initialSession })

        if (!mounted) return

        // Always start with a clean state
        if (!initialSession?.user) {
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          return
        }

        // Set session and user immediately
        setSession(initialSession)
        setUser(initialSession.user)

        // Try to get the profile directly first
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single()

        if (profile && mounted) {
          console.log('Found profile on initial load:', profile)
          setUserProfile(profile)
          setLoading(false)
          return
        }

        // If no profile exists, create one
        if (mounted) {
          console.log('No profile found, creating...')
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{
              id: initialSession.user.id,
              full_name: initialSession.user.user_metadata?.full_name || initialSession.user.email,
              role: 'customer'
            }])
            .select()
            .single()

          if (createError && createError.code === '23505') {
            // Profile was created by another process, fetch it
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', initialSession.user.id)
              .single()

            if (existingProfile && mounted) {
              console.log('Found profile after creation attempt:', existingProfile)
              setUserProfile(existingProfile)
            }
          } else if (newProfile && mounted) {
            console.log('Created new profile:', newProfile)
            setUserProfile(newProfile)
          }
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error in auth handling:', err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initial session check
    handleAuthSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', { event, session })
      
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }

      // For all other events, trigger a full session check
      handleAuthSession()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setUserProfile(null)
  }

  const setUserRole = async (role: UserRole) => {
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', user.id)
      .select()
      .single()

    if (profile) {
      setUserProfile(profile)
    }
  }

  const value = {
    session,
    user,
    userProfile,
    signOut,
    loading,
    setUserRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 