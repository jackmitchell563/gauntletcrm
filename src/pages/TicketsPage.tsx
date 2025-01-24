import { Stack, Tabs } from '@mantine/core'
import { TicketList } from '../tickets/TicketList'
import { TicketForm } from '../tickets/TicketForm'
import { useAuth } from '../auth/AuthContext'
import { FadeIn } from '../components'
import { createContext, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const TabContext = createContext<{
  setTab: (tab: string) => void;
  setActiveTab: (tab: string | null) => void;
  activeTab?: string | null;
}>({
  setTab: () => {},
  setActiveTab: () => {}
})

export function TicketsPage() {
  const { userProfile } = useAuth()
  const { setActiveTab, activeTab } = useContext(TabContext)
  const location = useLocation()
  
  useEffect(() => {
    setActiveTab('tickets')
  }, [location.pathname])
  
  const handleTabChange = (value: string | null) => {
    console.log('Tab change triggered')
    console.log('Current location:', location.pathname)
    console.log('Tab value to set:', value)
    if (value) {
      console.log('Setting active tab to:', value)
      setActiveTab(value)
      console.log('Active tab should now be set')
    }
  }

  return (
    <FadeIn>
      <Stack gap="md">
        <FadeIn delay={100}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="tickets">
                Tickets
              </Tabs.Tab>
              {(userProfile?.role === 'customer' || userProfile?.role === 'agent' || userProfile?.role === 'admin') && (
                <Tabs.Tab value="new-ticket">
                  New Ticket
                </Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="tickets" pt="xl">
              <FadeIn delay={200}>
                <TicketList />
              </FadeIn>
            </Tabs.Panel>

            <Tabs.Panel value="new-ticket" pt="xl">
              <FadeIn delay={200}>
                <TicketForm />
              </FadeIn>
            </Tabs.Panel>
          </Tabs>
        </FadeIn>
      </Stack>
    </FadeIn>
  )
} 