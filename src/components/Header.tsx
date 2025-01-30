import { Group, Burger, Title, ActionIcon, Menu, Avatar, Text, UnstyledButton, rem } from '@mantine/core'
import { IconBell, IconSettings, IconLogout, IconChevronDown, IconFilter, IconRefresh } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { TabContext } from '../pages/TicketsPage'
import { useContext } from 'react'
import classes from './Header.module.css'
import { createContext } from 'react'

export interface HeaderProps {
  opened: boolean
  toggle: () => void
  onExpandedChange: (expanded: boolean) => void
}

// Create a context for filters visibility
export const FiltersContext = createContext<{
  filtersVisible: boolean;
  setFiltersVisible: (visible: boolean) => void;
}>({
  filtersVisible: false,
  setFiltersVisible: () => {}
})

export function Header({ opened, toggle, onExpandedChange }: HeaderProps) {
  const { userProfile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { setActiveTab } = useContext(TabContext)

  // Get current path segment and format it
  const currentPath = location.pathname.split('/').filter(Boolean)[0]
  const currentSection = currentPath ? 
    currentPath
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') 
    : ''

  const handleFilterClick = () => {
    if (location.pathname !== '/tickets') {
      navigate('/tickets')
      setTimeout(() => {
        setActiveTab('tickets')
        onExpandedChange(true)
      }, 0)
    } else {
      setActiveTab('tickets')
      onExpandedChange(true)
    }
  }

  const handleRefresh = () => {
    // Force a page reload while preserving the current URL
    window.location.reload()
  }

  return (
    <Group h="100%" px="md" style={{ width: '100%' }} align="center">
      <Group h="100%" gap="sm" wrap="nowrap" align="center">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Title order={3} className={classes.logo}>GauntletCRM</Title>
        {currentSection && (
          <Text>{currentSection}</Text>
        )}
      </Group>

      <Group h="100%" gap="sm" wrap="nowrap" ml="auto" align="center">
        <ActionIcon variant="light" size="lg" radius="md" onClick={handleFilterClick}>
          <IconFilter size={20} />
        </ActionIcon>

        <ActionIcon variant="light" size="lg" radius="md" onClick={handleRefresh}>
          <IconRefresh size={20} />
        </ActionIcon>

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="light" size="lg" radius="md">
              <IconBell size={20} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Notifications</Menu.Label>
            <Menu.Item>No new notifications</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <UnstyledButton className={classes.user}>
              <Group h="100%" gap={7} align="center">
                <Avatar size={30} radius="xl" />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {userProfile?.full_name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {userProfile?.role}
                  </Text>
                </div>
                <IconChevronDown style={{ width: rem(12), height: rem(12) }} />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Settings</Menu.Label>
            <Menu.Item 
              leftSection={<IconSettings size={14} />}
              onClick={() => navigate('/settings')}
            >
              Account settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item 
              leftSection={<IconLogout size={14} />}
              onClick={() => signOut()}
              color="red"
            >
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  )
} 