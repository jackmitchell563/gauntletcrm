import { TicketPriority } from '../types/database.types'

interface PriorityBadgeProps {
  priority: TicketPriority
}

const priorityColors: Record<TicketPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-800' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-800' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800' },
  urgent: { bg: 'bg-red-100', text: 'text-red-800' }
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { bg, text } = priorityColors[priority]
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {priorityLabels[priority]}
    </span>
  )
} 