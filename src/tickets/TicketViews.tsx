import { useState, useEffect } from 'react'
import { Menu, Button, Text, Modal, TextInput, Switch, Group } from '@mantine/core'
import { IconBookmark, IconPlus } from '@tabler/icons-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'
import { FilterState } from '../types/filters'

interface SavedView {
  id: string
  name: string
  filters: FilterState
  is_shared: boolean
  user_id: string
}

interface TicketViewsProps {
  currentFilters: FilterState
  onViewSelect: (filters: FilterState) => void
}

export function TicketViews({ currentFilters, onViewSelect }: TicketViewsProps) {
  const [views, setViews] = useState<SavedView[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [isShared, setIsShared] = useState(false)
  const { user, userProfile } = useAuth()
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'

  useEffect(() => {
    fetchViews()

    const channel = supabase
      .channel('ticket_views')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_views'
        },
        () => {
          fetchViews()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id])

  const fetchViews = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('ticket_views')
        .select('*')
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setViews(data || [])
    } catch (err) {
      console.error('Error fetching views:', err)
    }
  }

  const saveView = async () => {
    if (!user || !newViewName.trim()) return

    try {
      const { error } = await supabase
        .from('ticket_views')
        .insert([
          {
            name: newViewName.trim(),
            filters: currentFilters,
            is_shared: isShared,
            user_id: user.id
          }
        ])

      if (error) throw error
      setSaveModalOpen(false)
      setNewViewName('')
      setIsShared(false)
    } catch (err) {
      console.error('Error saving view:', err)
    }
  }

  const deleteView = async (viewId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_views')
        .delete()
        .eq('id', viewId)
        .eq('user_id', user?.id)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting view:', err)
    }
  }

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button variant="light" leftSection={<IconBookmark size={16} />}>
            Saved Views
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconPlus size={16} />}
            onClick={() => setSaveModalOpen(true)}
          >
            Save Current View
          </Menu.Item>

          {views.length > 0 && <Menu.Divider />}

          {views.map((view) => (
            <Menu.Item
              key={view.id}
              onClick={() => onViewSelect(view.filters)}
              rightSection={
                view.user_id === user?.id && (
                  <Text
                    size="xs"
                    c="red"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteView(view.id)
                    }}
                  >
                    Delete
                  </Text>
                )
              }
            >
              <Group gap="xs">
                <Text>{view.name}</Text>
                {view.is_shared && (
                  <Text size="xs" c="dimmed">(Shared)</Text>
                )}
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save View"
      >
        <TextInput
          label="View Name"
          placeholder="Enter a name for this view"
          value={newViewName}
          onChange={(e) => setNewViewName(e.currentTarget.value)}
          mb="md"
        />

        {isAgent && (
          <Switch
            label="Share with team"
            checked={isShared}
            onChange={(e) => setIsShared(e.currentTarget.checked)}
            mb="xl"
          />
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => setSaveModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveView}>
            Save View
          </Button>
        </Group>
      </Modal>
    </>
  )
} 