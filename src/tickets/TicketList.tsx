import { useState, useEffect } from 'react'
import { Table, Group, Text, Select, Pagination, Stack, TextInput } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { Ticket, TicketStatus } from '../types/database.types'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { TicketActions } from './TicketActions'

interface SortState {
  column: keyof Ticket | null
  direction: 'asc' | 'desc'
}

export function TicketList() {
  const { user, userProfile } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState<SortState>({ column: 'created_at', direction: 'desc' })
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetchTickets()
  }, [user, page, sort, statusFilter, searchQuery])

  const fetchTickets = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })

      // Apply role-based filters
      if (userProfile?.role === 'customer') {
        query = query.eq('created_by', user.id)
      } else if (userProfile?.role === 'agent') {
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

      setTickets(data || [])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (err) {
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

  if (error) {
    return <Text c="red">{error}</Text>
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          w={300}
        />
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as TicketStatus | 'all')}
          data={[
            { value: 'all', label: 'All Statuses' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' }
          ]}
          w={200}
        />
      </Group>

      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>
              Title {sort.column === 'title' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Status</th>
            <th>Priority</th>
            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
              Created {sort.column === 'created_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('updated_at')}>
              Updated {sort.column === 'updated_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6}>
                <Text ta="center">Loading...</Text>
              </td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <Text ta="center">No tickets found</Text>
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <tr key={ticket.id} style={{ cursor: 'pointer' }}>
                <td>{ticket.title}</td>
                <td><StatusBadge status={ticket.status} /></td>
                <td><PriorityBadge priority={ticket.priority} /></td>
                <td>{formatDate(ticket.created_at)}</td>
                <td>{formatDate(ticket.updated_at)}</td>
                <td><TicketActions ticket={ticket} onUpdate={fetchTickets} /></td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Group justify="center">
        <Pagination
          total={totalPages}
          value={page}
          onChange={setPage}
          withEdges
        />
      </Group>
    </Stack>
  )
} 