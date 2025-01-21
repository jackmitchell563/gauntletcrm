import { useState, useEffect } from 'react'
import { Table, Group, Text, Select, Pagination, Stack, TextInput } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { Ticket, TicketStatus } from '../types/database.types'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { TagBadge } from '../components/TagBadge'
import { TicketThread } from './TicketThread'

interface SortState {
  column: keyof Ticket | null
  direction: 'asc' | 'desc'
}

interface TicketWithTags extends Ticket {
  ticket_tags: { tag: string }[]
}

export function TicketList() {
  const { user, userProfile } = useAuth()
  const [tickets, setTickets] = useState<TicketWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState<SortState>({ column: 'created_at', direction: 'desc' })
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<TicketWithTags | null>(null)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (!user || !userProfile) return
    fetchTickets()

    // Set up realtime subscription
    const channel = supabase
      .channel('tickets-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        async (payload) => {
          // For INSERT events, check if the user should have access
          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as Ticket
            const shouldRefresh = await checkTicketAccess(newTicket)
            if (shouldRefresh) {
              fetchTickets()
            }
          }
          // For UPDATE events, check if the user has access to the ticket
          else if (payload.eventType === 'UPDATE') {
            const updatedTicket = payload.new as Ticket
            const shouldRefresh = await checkTicketAccess(updatedTicket)
            if (shouldRefresh) {
              fetchTickets()
            }
          }
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      channel.unsubscribe()
    }
  }, [user, userProfile, page, sort, statusFilter, searchQuery])

  const fetchTickets = async () => {
    if (!user || !userProfile) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags!inner (
            tag
          )
        `, { count: 'exact' })

      // Apply role-based filters
      if (userProfile.role === 'customer') {
        query = query.eq('created_by', user.id)
      } else if (userProfile.role === 'agent') {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Apply sorting
      if (sort.column) {
        query = query.order(sort.column, { ascending: sort.direction === 'asc' })
      }

      // Apply pagination
      const start = (page - 1) * ITEMS_PER_PAGE
      query = query.range(start, start + ITEMS_PER_PAGE - 1)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      // Transform the data to ensure ticket_tags is always an array
      const transformedData = (data || []).map(ticket => ({
        ...ticket,
        ticket_tags: Array.isArray(ticket.ticket_tags) ? ticket.ticket_tags : []
      }))

      setTickets(transformedData)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: keyof Ticket) => {
    setSort(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ]

  // Helper function to check if user has access to a ticket
  const checkTicketAccess = async (ticket: Ticket): Promise<boolean> => {
    if (!user || !userProfile) return false

    // Admins have access to all tickets
    if (userProfile.role === 'admin') return true

    // Customers only have access to their own tickets
    if (userProfile.role === 'customer') {
      return ticket.created_by === user.id
    }

    // Agents have access to tickets they created or are assigned to
    if (userProfile.role === 'agent') {
      return ticket.created_by === user.id || ticket.assigned_to === user.id
    }

    return false
  }

  if (error) {
    return <Text c="red">{error}</Text>
  }

  if (selectedTicket) {
    return (
      <TicketThread 
        ticketId={selectedTicket.id}
        ticket={selectedTicket}
        onBack={() => setSelectedTicket(null)}
      />
    )
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" p="md">
        <TextInput
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          w={400}
          size="md"
        />
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as TicketStatus | 'all')}
          data={statusOptions}
          w={250}
          size="md"
        />
      </Group>

      <Table 
        striped 
        highlightOnHover 
        horizontalSpacing="xl" 
        verticalSpacing="md"
        className="ticket-table"
      >
        <thead>
          <tr>
            <th style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('title')}>
              Title {sort.column === 'title' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ whiteSpace: 'nowrap' }}>Status</th>
            <th style={{ whiteSpace: 'nowrap' }}>Priority</th>
            <th style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('created_at')}>
              Created {sort.column === 'created_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('updated_at')}>
              Updated {sort.column === 'updated_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ whiteSpace: 'nowrap' }}>Tags</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6}>
                <Text ta="center" p="xl">Loading...</Text>
              </td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <Text ta="center" p="xl">No tickets found</Text>
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ticket.title}
                </td>
                <td>
                  <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block', borderRadius: '4px' }}>
                    <StatusBadge 
                      status={ticket.status} 
                      onUpdate={async (status) => {
                        try {
                          const { error } = await supabase
                            .from('tickets')
                            .update({ status })
                            .eq('id', ticket.id)
                          if (error) throw error
                          fetchTickets()
                        } catch (err) {
                          console.error('Failed to update ticket:', err)
                        }
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block', borderRadius: '4px' }}>
                    <PriorityBadge 
                      priority={ticket.priority} 
                      onUpdate={async (priority) => {
                        try {
                          const { error } = await supabase
                            .from('tickets')
                            .update({ priority })
                            .eq('id', ticket.id)
                          if (error) throw error
                          fetchTickets()
                        } catch (err) {
                          console.error('Failed to update ticket:', err)
                        }
                      }}
                    />
                  </div>
                </td>
                <td>{formatDate(ticket.created_at)}</td>
                <td>{formatDate(ticket.updated_at)}</td>
                <td><TagBadge tags={ticket.ticket_tags.map(t => t.tag)} /></td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Group justify="center" p="md">
        <Pagination
          total={totalPages}
          value={page}
          onChange={setPage}
          withEdges
          size="md"
        />
      </Group>
    </Stack>
  )
} 