import { AuthProvider, useAuth } from './auth/AuthContext'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabaseClient'
import './App.css'

function AuthenticatedApp() {
  const { userProfile, signOut } = useAuth()

  if (!userProfile) return null

  return (
    <div className="app-container">
      <header>
        <h1>GauntletCRM</h1>
        <div className="user-info">
          <span>{userProfile.full_name} ({userProfile.role})</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      </header>
      
      <main>
        {userProfile.role === 'customer' && (
          <div>Customer Dashboard (Coming Soon)</div>
        )}
        {userProfile.role === 'agent' && (
          <div>Agent Dashboard (Coming Soon)</div>
        )}
        {userProfile.role === 'admin' && (
          <div>Admin Dashboard (Coming Soon)</div>
        )}
      </main>
    </div>
  )
}

function UnauthenticatedApp() {
  return (
    <div className="auth-container">
      <h1>Welcome to GauntletCRM</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        redirectTo={window.location.origin}
      />
    </div>
  )
}

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  return session ? <AuthenticatedApp /> : <UnauthenticatedApp />
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

export default AppWithProviders