import { AuthProvider, useAuth } from './auth/AuthContext'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabaseClient'
import { TicketList } from './tickets/TicketList'
import { TicketForm } from './tickets/TicketForm'
import { Stack, Tabs, Button } from '@mantine/core'
import { MantineProvider, createTheme } from '@mantine/core'
import { HomePage } from './pages/HomePage'
import { useState } from 'react'
import '@mantine/core/styles.css'
import './App.css'

const theme = createTheme({
  /** Put theme override here */
})

function AuthenticatedApp() {
  const { userProfile, signOut } = useAuth()

  console.log('AuthenticatedApp render:', { userProfile })

  if (!userProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading profile...
      </div>
    )
  }

  return (
    <div className="app-container">
      <header>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>GauntletCRM</h1>
        <div className="user-info">
          <span style={{ fontSize: '0.9rem' }}>{userProfile.full_name} ({userProfile.role})</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      </header>
      
      <main>
        <Stack gap="md">
          <Tabs defaultValue="tickets" style={{ width: '100%' }}>
            <Tabs.List>
              <Tabs.Tab value="tickets" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
                Tickets
              </Tabs.Tab>
              {(userProfile.role === 'customer' || userProfile.role === 'agent' || userProfile.role === 'admin') && (
                <Tabs.Tab value="new-ticket" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
                  New Ticket
                </Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="tickets" pt="xl">
              <TicketList />
            </Tabs.Panel>

            <Tabs.Panel value="new-ticket" pt="xl">
              <TicketForm />
            </Tabs.Panel>
          </Tabs>
        </Stack>
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
  const { session, loading, userProfile } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  console.log('App render:', { session, loading, userProfile })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Show home page if not logged in and not explicitly showing login
  if (!session && !showLogin) {
    return <HomePage onGetStarted={() => setShowLogin(true)} />
  }

  // Show login page if not logged in but explicitly showing login
  if (!session) {
    return (
      <Stack gap="md" className="auth-container">
        <UnauthenticatedApp />
        <Button variant="subtle" onClick={() => setShowLogin(false)}>
          ← Back to Home
        </Button>
      </Stack>
    )
  }

  if (!userProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Setting up your account...</div>
      </div>
    )
  }

  return <AuthenticatedApp />
}

function AppWithProviders() {
  return (
    <MantineProvider defaultColorScheme="light" theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MantineProvider>
  )
}

export default AppWithProviders