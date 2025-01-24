import { useState, useEffect } from 'react'
import {
  Title, Stack, TextInput, Paper, Group,
  Avatar, Text, Pagination
} from '@mantine/core'
import {
  IconSearch, IconUserCircle, IconChevronDown
} from '@tabler/icons-react'
import { supabase } from '../supabaseClient'
import { FadeIn } from '../components'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { TicketWithTags } from '../types/database.types'

interface CustomerWithTickets {
  id: string
  full_name: string
  created_at: string
  tickets?: TicketWithTags[]
}

const ITEMS_PER_PAGE = 10

export function CustomersPage() {
  // State management
  const [customers, setCustomers] = useState<CustomerWithTickets[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())

  // Main data fetching function
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const start = (page - 1) * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE - 1

      const { data, error, count } = await supabase
        .from('user_profiles')
        .select('id, full_name, created_at', { count: 'exact' })
        .eq('role', 'customer')
        .ilike('full_name', `%${searchQuery}%`)
        .order('full_name')
        .range(start, end)

      if (error) throw error

      setCustomers(data || [])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (err) {
      setError('Failed to fetch customers')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch tickets for a specific customer when expanded
  const fetchCustomerTickets = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags (
            tag
          )
        `)
        .eq('created_by', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching customer tickets:', err)
      return []
    }
  }

  // Handle customer expansion
  const handleCustomerExpand = async (customerId: string) => {
    if (expandedCustomers.has(customerId)) {
      const newExpanded = new Set(expandedCustomers)
      newExpanded.delete(customerId)
      setExpandedCustomers(newExpanded)
    } else {
      const tickets = await fetchCustomerTickets(customerId)
      setCustomers(current =>
        current.map(c =>
          c.id === customerId
            ? { ...c, tickets }
            : c
        )
      )
      setExpandedCustomers(new Set([...expandedCustomers, customerId]))
    }
  }

  // Initial load and search/page changes
  useEffect(() => {
    fetchCustomers()
  }, [page, searchQuery])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('customers-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: 'role=eq.customer'
        },
        () => {
          fetchCustomers()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Helper function for date formatting
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <FadeIn>
      <Stack gap="xl">
        <Title>Customers</Title>

        {/* Search Bar */}
        <TextInput
          placeholder="Search customers..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        {/* Customer List */}
        <Stack gap="xs">
          {loading ? (
            <Text ta="center" p="xl">Loading customers...</Text>
          ) : error ? (
            <Text c="red" ta="center" p="xl">{error}</Text>
          ) : customers.length === 0 ? (
            <Text ta="center" p="xl">No customers found</Text>
          ) : (
            customers.map((customer) => (
              <Paper key={customer.id} withBorder>
                {/* Customer Header */}
                <Group
                  p="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCustomerExpand(customer.id)}
                >
                  <Avatar radius="xl">
                    <IconUserCircle size={24} />
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text fw={500}>{customer.full_name}</Text>
                    <Text size="sm" c="dimmed">
                      Joined {formatDate(customer.created_at)}
                    </Text>
                  </div>
                  <IconChevronDown
                    size={16}
                    style={{
                      transform: expandedCustomers.has(customer.id)
                        ? 'rotate(180deg)'
                        : 'none',
                      transition: 'transform 200ms ease',
                    }}
                  />
                </Group>

                {/* Expanded Ticket List */}
                {expandedCustomers.has(customer.id) && (
                  <Stack p="md" pt={0}>
                    {!customer.tickets ? (
                      <Text ta="center" size="sm" c="dimmed">Loading tickets...</Text>
                    ) : customer.tickets.length === 0 ? (
                      <Text ta="center" size="sm" c="dimmed">No tickets found</Text>
                    ) : (
                      customer.tickets.map((ticket) => (
                        <Paper key={ticket.id} withBorder p="xs">
                          <Group wrap="nowrap">
                            <Text style={{ flex: 1 }}>{ticket.title}</Text>
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                            <Text size="sm">{formatDate(ticket.created_at)}</Text>
                          </Group>
                        </Paper>
                      ))
                    )}
                  </Stack>
                )}
              </Paper>
            ))
          )}
        </Stack>

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <Group justify="center">
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              withEdges
            />
          </Group>
        )}
      </Stack>
    </FadeIn>
  )
} 