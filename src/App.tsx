import { AuthProvider, useAuth } from './auth/AuthContext'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabaseClient'
import { TicketList } from './tickets/TicketList'
import { TicketForm } from './tickets/TicketForm'
import { Stack, Tabs } from '@mantine/core'
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
          <Stack gap="lg">
            <TicketForm />
            <TicketList />
          </Stack>
        )}
        {(userProfile.role === 'agent' || userProfile.role === 'admin') && (
          <Tabs defaultValue="tickets">
            <Tabs.List>
              <Tabs.Tab value="tickets">Tickets</Tabs.Tab>
              <Tabs.Tab value="create">Create Ticket</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="tickets" pt="md">
              <TicketList />
            </Tabs.Panel>

            <Tabs.Panel value="create" pt="md">
              <TicketForm />
            </Tabs.Panel>
          </Tabs>
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