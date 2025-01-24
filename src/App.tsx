import { AuthProvider, useAuth } from './auth/AuthContext'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabaseClient'
import { Stack } from '@mantine/core'
import { MantineProvider, createTheme } from '@mantine/core'
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components'
import {
  HomePage,
  DashboardPage,
  TicketsPage,
  CustomersPage,
  ReportsPage,
  KnowledgeBasePage,
  SettingsPage
} from './pages'
import '@mantine/core/styles.css'
import './App.css'

const theme = createTheme({
  /** Put theme override here */
})

function AuthenticatedApp() {
  const { userProfile } = useAuth()

  if (!userProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading profile...
      </div>
    )
  }

  const isAgent = userProfile.role === 'agent' || userProfile.role === 'admin'

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to={isAgent ? "/dashboard" : "/tickets"} replace />} />
        {isAgent && <Route path="/dashboard" element={<DashboardPage />} />}
        <Route path="/tickets" element={<TicketsPage />} />
        {isAgent && <Route path="/customers" element={<CustomersPage />} />}
        {isAgent && <Route path="/reports" element={<ReportsPage />} />}
        <Route path="/knowledge" element={<KnowledgeBasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </AppLayout>
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
  const [showLogin, setShowLogin] = useState(false)

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
        <button onClick={() => setShowLogin(false)}>
          ← Back to Home
        </button>
      </Stack>
    )
  }

  return <AuthenticatedApp />
}

function AppWithProviders() {
  return (
    <BrowserRouter>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  )
}

export default AppWithProviders