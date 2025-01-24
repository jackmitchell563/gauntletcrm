import { useState, useEffect, createContext, useContext } from 'react'
import { Group, Text, Checkbox, Stack, Pagination, Paper } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { Ticket } from '../types/database.types'
import { FilterState } from '../types/filters'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { TagBadge } from '../components/TagBadge'
import { TicketThread } from './TicketThread'
import { TicketFilters } from './TicketFilters'
import { BulkActions } from './BulkActions'
import { TicketViews } from './TicketViews'
import { FiltersContext } from '../components/Header'

interface SortState {
  column: keyof Ticket | null
  direction: 'asc' | 'desc'
}

interface TicketWithTags extends Ticket {
  ticket_tags: { tag: string }[]
}

// Create a context for filters
export const FilterContext = createContext<{
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}>({
  filters: {
    status: 'all',
    priority: 'all',
    assignedTo: null,
    tags: [],
    search: '',
    tagSearchMode: 'or'
  },
  setFilters: () => {}
})

export function useFilters() {
  return useContext(FilterContext)
}

export function TicketList() {
  const { user, userProfile } = useAuth()
  const { filters, setFilters } = useFilters()
  const [tickets, setTickets] = useState<TicketWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState<SortState>({ column: 'created_at', direction: 'desc' })
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketWithTags | null>(null)
  const [agents, setAgents] = useState<{ value: string; label: string }[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const { filtersVisible, setFiltersVisible } = useContext(FiltersContext)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (!user || !userProfile) return
    fetchTickets()
    fetchAgents()
    fetchTags()

    // Set up realtime subscription for tickets
    const ticketsChannel = supabase
      .channel('tickets-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const ticket = payload.new as Ticket
            const shouldRefresh = await checkTicketAccess(ticket)
            if (shouldRefresh) {
              fetchTickets()
            }
          }
        }
      )
      .subscribe()

    // Set up realtime subscription for ticket tags
    const tagsChannel = supabase
      .channel('ticket-tags-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_tags',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            // When tags change, refresh tickets to get updated tag data
            fetchTickets()
          }
        }
      )
      .subscribe()

    return () => {
      ticketsChannel.unsubscribe()
      tagsChannel.unsubscribe()
    }
  }, [user, userProfile, page, sort, filters])

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['agent', 'admin'])

      if (error) throw error
      setAgents((data || []).map(agent => ({
        value: agent.id,
        label: agent.full_name
      })))
    } catch (err) {
      console.error('Error fetching agents:', err)
    }
  }

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_tags')
        .select('tag')
        .order('tag')

      if (error) throw error
      const uniqueTags = Array.from(new Set((data || []).map(t => t.tag)))
      setAvailableTags(uniqueTags)
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const fetchTickets = async () => {
    if (!user || !userProfile) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags (
            tag
          )
        `, { count: 'exact' })

      // Apply role-based filters
      if (userProfile.role === 'customer') {
        query = query.eq('created_by', user.id)
      } else if (userProfile.role === 'agent') {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      }

      // Apply filters
      if (filters.status !== 'all') {
        query = query.in('status', filters.status)
      }
      if (filters.priority !== 'all') {
        query = query.in('priority', filters.priority)
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      
      // Handle tag filtering
      if (filters.tags.length > 0) {
        if (filters.tagSearchMode === 'and') {
          // For AND search, we need to ensure all tags are present
          for (const tag of filters.tags) {
            const { data: taggedTickets, error: tagError } = await supabase
              .from('ticket_tags')
              .select('ticket_id')
              .eq('tag', tag)

            if (tagError) throw tagError

            if (taggedTickets && taggedTickets.length > 0) {
              // Intersect with previous results
              query = query.in('id', taggedTickets.map(t => t.ticket_id))
            } else {
              // If any tag has no matches, return empty result
              setTickets([])
              setTotalPages(0)
              setLoading(false)
              return
            }
          }
        } else {
          // OR search (existing behavior)
          const { data: taggedTickets, error: tagError } = await supabase
            .from('ticket_tags')
            .select('ticket_id')
            .in('tag', filters.tags)

          if (tagError) throw tagError

          if (taggedTickets && taggedTickets.length > 0) {
            query = query.in('id', taggedTickets.map(t => t.ticket_id))
          } else {
            setTickets([])
            setTotalPages(0)
            setLoading(false)
            return
          }
        }
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
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

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? tickets.map(t => t.id) : [])
  }

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    setSelectedTickets(current =>
      checked
        ? [...current, ticketId]
        : current.filter(id => id !== ticketId)
    )
  }

  const checkTicketAccess = async (ticket: Ticket): Promise<boolean> => {
    if (!user || !userProfile) return false
    if (userProfile.role === 'admin') return true
    if (userProfile.role === 'customer') {
      return ticket.created_by === user.id
    }
    if (userProfile.role === 'agent') {
      return ticket.created_by === user.id || ticket.assigned_to === user.id
    }
    return false
  }

  const handleTagClick = (tag: string) => {
    setFiltersVisible(true)
    
    const newFilters: FilterState = {
      ...filters,
      tags: filters.tags.includes(tag) ? filters.tags : [...filters.tags, tag]
    }
    setFilters(newFilters)
  }

  if (error) {
    return <Text c="red">{error}</Text>
  }

  if (selectedTicket) {
    return (
      <TicketThread
        ticketId={selectedTicket.id}
        ticket={{
          title: selectedTicket.title,
          status: selectedTicket.status,
          priority: selectedTicket.priority,
          description: selectedTicket.description,
          created_by: selectedTicket.created_by,
          created_at: selectedTicket.created_at,
          assigned_to: selectedTicket.assigned_to
        }}
        onBack={() => setSelectedTicket(null)}
      />
    )
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" p="md">
        <TicketViews
          currentFilters={filters}
          onViewSelect={setFilters}
        />
        <BulkActions
          selectedTickets={selectedTickets}
          onActionComplete={() => {
            setSelectedTickets([])
            fetchTickets()
          }}
          disabled={loading}
        />
      </Group>

      <TicketFilters
        onFilterChange={setFilters}
        agents={agents}
        availableTags={availableTags}
        expanded={filtersVisible}
        onExpandedChange={setFiltersVisible}
        filters={filters}
      />

      <Stack gap="xs">
        {/* Header */}
        <Group wrap="nowrap" px="xs" align="center" gap="xs">
          <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                height: 'fit-content'
              }}
            >
              <Checkbox
                checked={selectedTickets.length === tickets.length && tickets.length > 0}
                indeterminate={selectedTickets.length > 0 && selectedTickets.length < tickets.length}
                onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                disabled={loading}
                size="sm"
              />
            </div>
          </div>
          <Text 
            style={{ flex: 1, cursor: 'pointer', minWidth: 0, paddingRight: 20, overflow: 'hidden', textOverflow: 'ellipsis' }} 
            onClick={() => handleSort('title')}
            fw={500}
            size="sm"
          >
            Title {sort.column === 'title' && (sort.direction === 'asc' ? '↑' : '↓')}
          </Text>
          <div style={{ width: '120px', paddingRight: 20, overflow: 'hidden' }}>
            <Text fw={500} size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Status</Text>
          </div>
          <div style={{ width: '100px', paddingRight: 20, overflow: 'hidden' }}>
            <Text fw={500} size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Priority</Text>
          </div>
          <div style={{ width: '160px', paddingRight: 20, overflow: 'hidden' }}>
            <Text 
              style={{ cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onClick={() => handleSort('created_at')}
              fw={500}
              size="sm"
            >
              Created {sort.column === 'created_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </Text>
          </div>
          <div style={{ width: '160px', paddingRight: 20, overflow: 'hidden' }}>
            <Text 
              style={{ cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onClick={() => handleSort('updated_at')}
              fw={500}
              size="sm"
            >
              Updated {sort.column === 'updated_at' && (sort.direction === 'asc' ? '↑' : '↓')}
            </Text>
          </div>
          <div style={{ width: '150px', overflow: 'hidden' }}>
            <div style={{ 
              whiteSpace: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              maxWidth: '100%'
            }}>
              <Text fw={500} size="sm" style={{ whiteSpace: 'nowrap' }}>Tags</Text>
            </div>
          </div>
        </Group>

        {/* Loading State */}
        {loading ? (
          <Text ta="center" p="xl">Loading...</Text>
        ) : tickets.length === 0 ? (
          <Text ta="center" p="xl">No tickets found</Text>
        ) : (
          /* Ticket Rows */
          tickets.map((ticket) => (
            <Paper 
              key={ticket.id}
              withBorder
              p="xs"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTicket(ticket)}
            >
              <Group wrap="nowrap" align="center" gap="xs">
                <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 'fit-content'
                    }}
                  >
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onChange={(e) => {
                        handleSelectTicket(ticket.id, e.currentTarget.checked)
                      }}
                      size="sm"
                    />
                  </div>
                </div>
                <Text style={{ flex: 1, minWidth: 0, paddingRight: 20, overflow: 'hidden', textOverflow: 'ellipsis' }} lineClamp={1} size="sm">
                  {ticket.title}
                </Text>
                <div style={{ width: '120px', paddingRight: 20, overflow: 'hidden' }}>
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      height: 'fit-content'
                    }}
                  >
                    <StatusBadge 
                      status={ticket.status} 
                      onUpdate={async (status) => {
                        try {
                          console.log('Status update triggered:', { status, ticketId: ticket.id, agentId: userProfile?.id })
                          
                          // If status is being set to resolved, create satisfaction_ratings entry first
                          if (status === 'resolved') {
                            console.log('Ticket resolved, checking for existing rating...')
                            
                            // First check if a rating exists
                            const { data: existingRating, error: fetchError } = await supabase
                              .from('satisfaction_ratings')
                              .select('*')
                              .eq('ticket_id', ticket.id)
                              .single()

                            console.log('Existing rating check result:', { existingRating, error: fetchError })

                            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

                            if (!existingRating) {
                              console.log('Creating new rating with agent_id:', userProfile?.id)
                              // Create new rating
                              const { error: insertError } = await supabase
                                .from('satisfaction_ratings')
                                .insert({
                                  ticket_id: ticket.id,
                                  agent_id: userProfile?.id
                                })

                              if (insertError) {
                                console.error('Error inserting rating:', insertError)
                                throw insertError
                              }
                              console.log('Successfully created new rating')
                            }
                          } else if (ticket.status === 'resolved') {
                            // If changing from resolved to another status, delete the satisfaction rating
                            console.log('Un-resolving ticket, deleting satisfaction rating...')
                            const { error: deleteError } = await supabase
                              .from('satisfaction_ratings')
                              .delete()
                              .eq('ticket_id', ticket.id)

                            if (deleteError) {
                              console.error('Error deleting rating:', deleteError)
                              throw deleteError
                            }
                            console.log('Successfully deleted rating')
                          }

                          // Update ticket status
                          const { error: ticketError } = await supabase
                            .from('tickets')
                            .update({ status })
                            .eq('id', ticket.id)
                          
                          if (ticketError) throw ticketError

                          fetchTickets()
                        } catch (err) {
                          console.error('Failed to update ticket:', err)
                        }
                      }}
                    />
                  </div>
                </div>
                <div style={{ width: '100px', paddingRight: 20, overflow: 'hidden' }}>
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      height: 'fit-content'
                    }}
                  >
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
                </div>
                <div style={{ width: '160px', paddingRight: 20, overflow: 'hidden' }}>
                  <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} size="sm">{formatDate(ticket.created_at)}</Text>
                </div>
                <div style={{ width: '160px', paddingRight: 20, overflow: 'hidden' }}>
                  <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} size="sm">{formatDate(ticket.updated_at)}</Text>
                </div>
                <div style={{ width: '150px', overflow: 'hidden' }}>
                  <div style={{ 
                    whiteSpace: 'nowrap',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    maxWidth: '100%'
                  }}>
                    <TagBadge 
                      tags={ticket.ticket_tags.map(t => t.tag)} 
                      onClick={(tag) => {
                        handleTagClick(tag)
                        event?.stopPropagation()
                      }}
                    />
                  </div>
                </div>
              </Group>
            </Paper>
          ))
        )}
      </Stack>

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