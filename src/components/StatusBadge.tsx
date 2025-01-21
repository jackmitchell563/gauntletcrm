import { TicketStatus } from '../types/database.types'
import { Menu, Group, Text } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'

interface StatusBadgeProps {
  status: TicketStatus
  onUpdate?: (status: TicketStatus) => void
}

const statusColors: Record<TicketStatus, { bg: string; text: string; hover: string }> = {
  open: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200' },
  resolved: { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-200' }
}

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
}

const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

export function StatusBadge({ status, onUpdate }: StatusBadgeProps) {
  const { bg, text, hover } = statusColors[status]
  const { userProfile } = useAuth()
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'
  
  if (!onUpdate) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {statusLabels[status]}
      </span>
    )
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text} ${hover} transition-colors duration-150 cursor-pointer`}>
          {statusLabels[status]}
        </span>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Update Status</Menu.Label>
        {statusOptions.map((statusOption) => (
          <Menu.Item
            key={statusOption}
            onClick={() => onUpdate(statusOption)}
            disabled={!isAgent || status === statusOption}
          >
            <Group gap="xs">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[statusOption].bg} ${statusColors[statusOption].text}`}>
                {statusLabels[statusOption]}
              </span>
              <Text size="sm">{statusOption.replace('_', ' ').toUpperCase()}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
} 