import { Stack, NavLink, Text, Button, Group } from '@mantine/core'
import { 
  IconTicket, 
  IconDashboard, 
  IconUsers, 
  IconReportAnalytics, 
  IconSettings,
  IconBook,
  IconPlus
} from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import classes from './Sidebar.module.css'
import { FilterState } from '../types/filters'
import { TicketStatus, TicketPriority } from '../types/database.types'
import { TabContext } from '../pages/TicketsPage'
import { useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

interface SidebarProps {
  onFilterChange?: (filters: FilterState) => void;
  filters?: FilterState;
}

interface QuickFilterCounts {
  recentlyUpdated: number;
  assignedToMe: number;
  highPriority: number;
  myOpenTickets: number;
}

export function Sidebar({ onFilterChange, filters = { status: 'all', priority: 'all', assignedTo: null, tags: [], search: '', tagSearchMode: 'or' } }: SidebarProps) {
  const { userProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { setActiveTab } = useContext(TabContext)
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'
  const [counts, setCounts] = useState<QuickFilterCounts>({
    recentlyUpdated: 0,
    assignedToMe: 0,
    highPriority: 0,
    myOpenTickets: 0
  })

  const navItems = [
    { label: 'Dashboard', icon: IconDashboard, path: '/dashboard', agentOnly: true },
    { label: 'Tickets', icon: IconTicket, path: '/tickets' },
    { label: 'Customers', icon: IconUsers, path: '/customers', agentOnly: true },
    { label: 'Reports', icon: IconReportAnalytics, path: '/reports', agentOnly: true },
    { label: 'Knowledge Base', icon: IconBook, path: '/knowledge' },
    { label: 'Settings', icon: IconSettings, path: '/settings' }
  ]

  const quickFilters = [
    { 
      label: 'Recently Updated', 
      count: counts.recentlyUpdated, 
      filters: { status: 'all' as const, assignedTo: null, priority: 'all' as const, tags: [], search: '', tagSearchMode: 'or' as const },
      sort: { column: 'updated_at', direction: 'desc' as const }
    },
    { 
      label: 'Assigned to Me', 
      count: counts.assignedToMe, 
      filters: { status: 'all' as const, assignedTo: userProfile?.id || null, priority: 'all' as const, tags: [], search: '', tagSearchMode: 'or' as const } 
    },
    { 
      label: 'High Priority', 
      count: counts.highPriority, 
      filters: { status: 'all' as const, assignedTo: null, priority: ['high', 'urgent'] as TicketPriority[], tags: [], search: '', tagSearchMode: 'or' as const } 
    },
    { 
      label: 'My Open Tickets', 
      count: counts.myOpenTickets, 
      filters: { status: ['open', 'in_progress'] as TicketStatus[], assignedTo: userProfile?.id || null, priority: 'all' as const, tags: [], search: '', tagSearchMode: 'or' as const } 
    }
  ]

  const fetchTicketCounts = async () => {
    if (!userProfile) return

    try {
      // For each quick filter, run the same query as TicketList but just get the count
      const counts = await Promise.all(quickFilters.map(async (filter) => {
        let query = supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })

        // Apply role-based filters
        if (userProfile.role === 'customer') {
          query = query.eq('created_by', userProfile.id)
        } else if (userProfile.role === 'agent') {
          query = query.or(`created_by.eq.${userProfile.id},assigned_to.eq.${userProfile.id}`)
        }

        // Apply filters from the quick filter
        if (filter.filters.status !== 'all') {
          query = query.in('status', filter.filters.status)
        }
        if (filter.filters.priority !== 'all') {
          query = query.in('priority', filter.filters.priority)
        }
        if (filter.filters.assignedTo) {
          query = query.eq('assigned_to', filter.filters.assignedTo)
        }

        if (filter.filters.search) {
          query = query.or(`title.ilike.%${filter.filters.search}%,description.ilike.%${filter.filters.search}%`)
        }

        const { count, error } = await query
        if (error) throw error
        return count || 0
      }))

      setCounts({
        recentlyUpdated: counts[0],
        assignedToMe: counts[1],
        highPriority: counts[2],
        myOpenTickets: counts[3]
      })
    } catch (err) {
      console.error('Error fetching ticket counts:', err)
    }
  }

  useEffect(() => {
    fetchTicketCounts()

    // Set up realtime subscription for ticket changes
    const channel = supabase
      .channel('sidebar_tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTicketCounts()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userProfile])

  const handleQuickFilterClick = (filter: typeof quickFilters[0]) => {
    navigate('/tickets')
    if (onFilterChange) {
      onFilterChange(filter.filters)
    }
  }

  return (
    <Stack h="100%" p="md" className={classes.sidebar}>
      {(userProfile?.role === 'customer' || userProfile?.role === 'agent' || userProfile?.role === 'admin') && (
        <Button 
          leftSection={<IconPlus size={16} />}
          fullWidth
          onClick={() => {
            console.log('New Ticket button clicked')
            console.log('Current location:', location.pathname)
            const value = 'new-ticket'
            console.log('Tab value to set:', value)
            if (location.pathname !== '/tickets') {
              console.log('Navigating to /tickets')
              navigate('/tickets')
              setTimeout(() => {
                console.log('Setting active tab to:', value)
                setActiveTab(value)
                console.log('Active tab should now be set')
              }, 0)
            } else {
              console.log('Setting active tab to:', value)
              setActiveTab(value)
              console.log('Active tab should now be set')
            }
          }}
        >
          New Ticket
        </Button>
      )}

      <Stack gap="xs">
        {navItems
          .filter(item => !item.agentOnly || isAgent)
          .map((item) => (
            <NavLink
              key={item.path}
              active={location.pathname === item.path}
              label={item.label}
              leftSection={<item.icon size={20} />}
              onClick={() => navigate(item.path)}
            />
          ))}
      </Stack>

      <Text size="sm" fw={500} mt="xl">Quick Filters</Text>
      <Stack gap="xs">
        {quickFilters
          .filter(filter => filter.label !== 'Assigned to Me' || isAgent)
          .map((filter) => (
          <NavLink
            key={filter.label}
            label={
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm">{filter.label}</Text>
                <Text size="xs" c="dimmed">{filter.count}</Text>
              </Group>
            }
            variant="light"
            active={location.pathname === '/tickets' && 
              (filters.status === filter.filters.status || 
                (Array.isArray(filters.status) && Array.isArray(filter.filters.status) && 
                filters.status.length === filter.filters.status.length && 
                filters.status.every(s => filter.filters.status.includes(s)))) && 
              filters.assignedTo === filter.filters.assignedTo && 
              (filters.priority === filter.filters.priority ||
                (Array.isArray(filters.priority) && Array.isArray(filter.filters.priority) && 
                filters.priority.length === filter.filters.priority.length && 
                filters.priority.every(p => filter.filters.priority.includes(p))))}
            onClick={() => handleQuickFilterClick(filter)}
          />
        ))}
      </Stack>
    </Stack>
  )
} 