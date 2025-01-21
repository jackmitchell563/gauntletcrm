import { TicketPriority } from '../types/database.types'
import { Menu, Group, Text } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'

interface PriorityBadgeProps {
  priority: TicketPriority
  onUpdate?: (priority: TicketPriority) => void
}

const priorityColors: Record<TicketPriority, { bg: string; text: string; hover: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-200' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200' },
  urgent: { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200' }
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

const priorityOptions: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export function PriorityBadge({ priority, onUpdate }: PriorityBadgeProps) {
  const { bg, text, hover } = priorityColors[priority]
  const { userProfile } = useAuth()
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'
  
  if (!onUpdate) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {priorityLabels[priority]}
      </span>
    )
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text} ${hover} transition-colors duration-150 cursor-pointer`}>
          {priorityLabels[priority]}
        </span>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Update Priority</Menu.Label>
        {priorityOptions.map((priorityOption) => (
          <Menu.Item
            key={priorityOption}
            onClick={() => onUpdate(priorityOption)}
            disabled={!isAgent || priority === priorityOption}
          >
            <Group gap="xs">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[priorityOption].bg} ${priorityColors[priorityOption].text}`}>
                {priorityLabels[priorityOption]}
              </span>
              <Text size="sm">{priorityOption.toUpperCase()}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
} 