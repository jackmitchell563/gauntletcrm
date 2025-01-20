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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (!profile) {
          // New user, create profile as customer by default
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: session.user.id,
                full_name: session.user.user_metadata.full_name,
                role: 'customer'
              }
            ])
            .select()
            .single()
          
          setUserProfile(newProfile)
        } else {
          setUserProfile(profile)
        }
      } else {
        setUserProfile(null)
      }
    })

    setLoading(false)

    return () => {
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