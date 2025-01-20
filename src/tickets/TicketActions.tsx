import { Group, Menu, ActionIcon, Text } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { Ticket, TicketStatus, TicketPriority } from '../types/database.types'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'

interface TicketActionsProps {
  ticket: Ticket
  onUpdate: () => void
}

export function TicketActions({ ticket, onUpdate }: TicketActionsProps) {
  const { userProfile } = useAuth()
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'

  const updateTicket = async (updates: Partial<Ticket>) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Failed to update ticket:', err)
    }
  }

  const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']
  const priorityOptions: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

  return (
    <Group gap="xs">
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon variant="subtle" size="sm">
            <StatusBadge status={ticket.status} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Update Status</Menu.Label>
          {statusOptions.map((status) => (
            <Menu.Item
              key={status}
              onClick={() => updateTicket({ status })}
              disabled={!isAgent || ticket.status === status}
            >
              <Group gap="xs">
                <StatusBadge status={status} />
                <Text size="sm">{status.replace('_', ' ').toUpperCase()}</Text>
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon variant="subtle" size="sm">
            <PriorityBadge priority={ticket.priority} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Update Priority</Menu.Label>
          {priorityOptions.map((priority) => (
            <Menu.Item
              key={priority}
              onClick={() => updateTicket({ priority })}
              disabled={!isAgent || ticket.priority === priority}
            >
              <Group gap="xs">
                <PriorityBadge priority={priority} />
                <Text size="sm">{priority.toUpperCase()}</Text>
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      {isAgent && (
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm">
              👤
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Assignment</Menu.Label>
            <Menu.Item
              onClick={() => updateTicket({ assigned_to: userProfile.id })}
              disabled={ticket.assigned_to === userProfile.id}
            >
              Assign to me
            </Menu.Item>
            <Menu.Item
              onClick={() => updateTicket({ assigned_to: null })}
              disabled={!ticket.assigned_to}
            >
              Unassign
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  )
} 