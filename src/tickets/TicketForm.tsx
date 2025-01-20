import { useState } from 'react'
import { useForm } from '@mantine/form'
import { TextInput, Textarea, Select, Button, Box, Group, Text } from '@mantine/core'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { TicketPriority } from '../types/database.types'
import { PriorityBadge } from '../components/PriorityBadge'

interface TicketFormValues {
  title: string
  description: string
  priority: TicketPriority
  tags: string
}

interface SelectItemProps extends React.ComponentPropsWithoutRef<'div'> {
  value: string
  label: string
  group: string
}

export function TicketForm() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<TicketFormValues>({
    initialValues: {
      title: '',
      description: '',
      priority: 'medium',
      tags: ''
    },

    validate: {
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
      description: (value) => (value.length < 10 ? 'Description must be at least 10 characters' : null),
      tags: (value) => {
        if (!value) return null
        const tags = value.split(',').map(tag => tag.trim())
        return tags.some(tag => tag.length < 2) ? 'Each tag must be at least 2 characters' : null
      }
    }
  })

  const SelectItem = ({ value, label }: SelectItemProps) => (
    <Group>
      <PriorityBadge priority={value as TicketPriority} />
      <Text>{label}</Text>
    </Group>
  )

  const handleSubmit = async (values: TicketFormValues) => {
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert([{
          title: values.title,
          description: values.description,
          priority: values.priority,
          created_by: user.id,
          status: 'open'
        }])
        .select()
        .single()

      if (ticketError) throw ticketError

      // Add tags if provided
      if (values.tags && ticket) {
        const tags = values.tags.split(',').map(tag => tag.trim())
        const tagInserts = tags.map(tag => ({
          ticket_id: ticket.id,
          tag
        }))

        const { error: tagError } = await supabase
          .from('ticket_tags')
          .insert(tagInserts)

        if (tagError) throw tagError
      }

      setSuccess(true)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box mx="auto" p="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          required
          label="Title"
          placeholder="Brief description of the issue"
          {...form.getInputProps('title')}
          mb="md"
        />

        <Textarea
          required
          label="Description"
          placeholder="Detailed explanation of your issue"
          minRows={4}
          {...form.getInputProps('description')}
          mb="md"
        />

        <Select
          label="Priority"
          data={[
            { value: 'low', label: 'Low', group: 'Priority' },
            { value: 'medium', label: 'Medium', group: 'Priority' },
            { value: 'high', label: 'High', group: 'Priority' },
            { value: 'urgent', label: 'Urgent', group: 'Priority' }
          ]}
          component={SelectItem}
          {...form.getInputProps('priority')}
          mb="md"
        />

        <TextInput
          label="Tags"
          placeholder="Enter tags separated by commas"
          description="Optional: Add relevant tags (e.g., bug, feature, question)"
          {...form.getInputProps('tags')}
          mb="md"
        />

        {error && (
          <Text color="red" mb="md">
            {error}
          </Text>
        )}

        {success && (
          <Text color="green" mb="md">
            Ticket created successfully!
          </Text>
        )}

        <Group justify="flex-end">
          <Button type="submit" loading={loading}>
            Create Ticket
          </Button>
        </Group>
      </form>
    </Box>
  )
} 