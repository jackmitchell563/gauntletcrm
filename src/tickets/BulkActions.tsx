import { Button, Menu, Group, TextInput, Stack } from '@mantine/core'
import { IconChevronDown, IconSearch, IconUserCircle } from '@tabler/icons-react'
import { TicketStatus, TicketPriority } from '../types/database.types'
import { supabase } from '../supabaseClient'
import { useState, useEffect } from 'react'

interface Agent {
  id: string
  full_name: string
}

interface BulkActionsProps {
  selectedTickets: string[]
  onActionComplete: () => void
  disabled?: boolean
}

export function BulkActions({ selectedTickets, onActionComplete, disabled }: BulkActionsProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const updateTickets = async (updates: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string }) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .in('id', selectedTickets)

      if (error) throw error
      onActionComplete()
    } catch (err) {
      console.error('Failed to update tickets:', err)
    }
  }

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      console.log('Fetching agents with query:', searchQuery)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['agent', 'admin'])
        .ilike('full_name', `%${searchQuery}%`)
        .order('full_name')
      
      if (error) throw error
      console.log('Fetched agents:', data)
      setAgents(data || [])
    } catch (err) {
      console.error('Error fetching agents:', err)
    } finally {
      setLoadingAgents(false)
    }
  }

  // Fetch agents when menu opens
  useEffect(() => {
    if (menuOpen) {
      fetchAgents()
    }
  }, [menuOpen])

  return (
    <Group gap="xs">
      <Button.Group>
        <Button
          disabled={disabled || selectedTickets.length === 0}
          onClick={() => updateTickets({ status: 'resolved' })}
        >
          Resolve Selected
        </Button>

        <Menu 
          position="bottom-end" 
          withinPortal
          onOpen={() => setMenuOpen(true)}
          onClose={() => setMenuOpen(false)}
        >
          <Menu.Target>
            <Button
              disabled={disabled || selectedTickets.length === 0}
              rightSection={<IconChevronDown size={16} />}
            >
              More Actions
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Status</Menu.Label>
            <Menu.Item onClick={() => updateTickets({ status: 'open' })}>
              Mark as Open
            </Menu.Item>
            <Menu.Item onClick={() => updateTickets({ status: 'in_progress' })}>
              Mark as In Progress
            </Menu.Item>
            <Menu.Item onClick={() => updateTickets({ status: 'closed' })}>
              Mark as Closed
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Priority</Menu.Label>
            <Menu.Item onClick={() => updateTickets({ priority: 'low' })}>
              Set Low Priority
            </Menu.Item>
            <Menu.Item onClick={() => updateTickets({ priority: 'medium' })}>
              Set Medium Priority
            </Menu.Item>
            <Menu.Item onClick={() => updateTickets({ priority: 'high' })}>
              Set High Priority
            </Menu.Item>
            <Menu.Item onClick={() => updateTickets({ priority: 'urgent' })}>
              Set Urgent Priority
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Assignment</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>
              <Stack gap="xs">
                <TextInput
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.currentTarget.value)
                    fetchAgents()
                  }}
                  leftSection={<IconSearch size={16} />}
                  size="xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </Stack>
            </Menu.Item>

            {loadingAgents ? (
              <Menu.Item disabled>Loading agents...</Menu.Item>
            ) : agents.length === 0 ? (
              <Menu.Item disabled>No agents found</Menu.Item>
            ) : (
              agents.map((agent) => (
                <Menu.Item
                  key={agent.id}
                  onClick={() => updateTickets({ assigned_to: agent.id })}
                  leftSection={<IconUserCircle size={20} />}
                >
                  {agent.full_name}
                </Menu.Item>
              ))
            )}
          </Menu.Dropdown>
        </Menu>
      </Button.Group>
    </Group>
  )
} 