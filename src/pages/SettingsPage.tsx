import { Container, Paper, Stack, Text, Tabs } from '@mantine/core'
import { 
  IconUser, 
  IconBell, 
  IconShield, 
  IconLayoutDashboard,
  IconUsers,
  IconSettings
} from '@tabler/icons-react'
import { FadeIn } from '../components'
import { useAuth } from '../auth/AuthContext'
import { AccountSettings } from '../components/settings/AccountSettings'
import { NotificationSettings } from '../components/settings/NotificationSettings'
import { SecuritySettings } from '../components/settings/SecuritySettings'
import { PreferenceSettings } from '../components/settings/PreferenceSettings'
import { TeamSettings } from '../components/settings/TeamSettings'
import { SystemSettings } from '../components/settings/SystemSettings'

export function SettingsPage() {
  const { userProfile } = useAuth()
  const isAdmin = userProfile?.role === 'admin'
  const isAgent = userProfile?.role === 'agent' || isAdmin

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <FadeIn>
          <Paper withBorder p="md" radius="md">
            <Stack gap="lg">
              <Text size="xl" fw={600}>Settings</Text>
              
              <Tabs defaultValue="account">
                <Tabs.List>
                  <Tabs.Tab 
                    value="account" 
                    leftSection={<IconUser size={16} />}
                  >
                    Account
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="notifications" 
                    leftSection={<IconBell size={16} />}
                  >
                    Notifications
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="security" 
                    leftSection={<IconShield size={16} />}
                  >
                    Security
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="preferences" 
                    leftSection={<IconLayoutDashboard size={16} />}
                  >
                    Preferences
                  </Tabs.Tab>
                  {isAgent && (
                    <Tabs.Tab 
                      value="team" 
                      leftSection={<IconUsers size={16} />}
                    >
                      Team
                    </Tabs.Tab>
                  )}
                  {isAdmin && (
                    <Tabs.Tab 
                      value="system" 
                      leftSection={<IconSettings size={16} />}
                    >
                      System
                    </Tabs.Tab>
                  )}
                </Tabs.List>

                <Tabs.Panel value="account" pt="xl">
                  <FadeIn>
                    <AccountSettings />
                  </FadeIn>
                </Tabs.Panel>

                <Tabs.Panel value="notifications" pt="xl">
                  <FadeIn>
                    <NotificationSettings />
                  </FadeIn>
                </Tabs.Panel>

                <Tabs.Panel value="security" pt="xl">
                  <FadeIn>
                    <SecuritySettings />
                  </FadeIn>
                </Tabs.Panel>

                <Tabs.Panel value="preferences" pt="xl">
                  <FadeIn>
                    <PreferenceSettings />
                  </FadeIn>
                </Tabs.Panel>

                {isAgent && (
                  <Tabs.Panel value="team" pt="xl">
                    <FadeIn>
                      <TeamSettings />
                    </FadeIn>
                  </Tabs.Panel>
                )}

                {isAdmin && (
                  <Tabs.Panel value="system" pt="xl">
                    <FadeIn>
                      <SystemSettings />
                    </FadeIn>
                  </Tabs.Panel>
                )}
              </Tabs>
            </Stack>
          </Paper>
        </FadeIn>
      </Stack>
    </Container>
  )
} 