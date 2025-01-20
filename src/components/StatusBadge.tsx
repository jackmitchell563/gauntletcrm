import { TicketStatus } from '../types/database.types'

interface StatusBadgeProps {
  status: TicketStatus
}

const statusColors: Record<TicketStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-100', text: 'text-blue-800' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  resolved: { bg: 'bg-green-100', text: 'text-green-800' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-800' }
}

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text } = statusColors[status]
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {statusLabels[status]}
    </span>
  )
} 