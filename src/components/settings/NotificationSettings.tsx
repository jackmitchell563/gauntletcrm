import { Switch, Stack, Button, Group, Paper, Text, Divider } from '@mantine/core'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabaseClient'

interface NotificationPreferences {
  email_notifications: boolean
  in_app_notifications: boolean
  mobile_push: boolean
  ticket_updates: boolean
  ticket_assigned: boolean
  ticket_resolved: boolean
  mentions: boolean
  knowledge_base_updates: boolean
  team_updates: boolean
}

export function NotificationSettings() {
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    in_app_notifications: true,
    mobile_push: false,
    ticket_updates: true,
    ticket_assigned: true,
    ticket_resolved: true,
    mentions: true,
    knowledge_base_updates: false,
    team_updates: userProfile?.role !== 'customer'
  })

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          notification_preferences: preferences
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Text fw={500}>Notification Channels</Text>
        <Stack gap="xs">
          <Switch
            label="Email Notifications"
            description="Receive notifications via email"
            checked={preferences.email_notifications}
            onChange={() => handleToggle('email_notifications')}
          />
          <Switch
            label="In-App Notifications"
            description="Show notifications in the application"
            checked={preferences.in_app_notifications}
            onChange={() => handleToggle('in_app_notifications')}
          />
          <Switch
            label="Mobile Push Notifications"
            description="Receive push notifications on your mobile device"
            checked={preferences.mobile_push}
            onChange={() => handleToggle('mobile_push')}
          />
        </Stack>

        <Divider />

        <Text fw={500}>Notification Types</Text>
        <Stack gap="xs">
          <Switch
            label="Ticket Updates"
            description="Get notified about updates to your tickets"
            checked={preferences.ticket_updates}
            onChange={() => handleToggle('ticket_updates')}
          />
          <Switch
            label="Ticket Assignments"
            description="Get notified when tickets are assigned to you"
            checked={preferences.ticket_assigned}
            onChange={() => handleToggle('ticket_assigned')}
          />
          <Switch
            label="Resolved Tickets"
            description="Get notified when your tickets are resolved"
            checked={preferences.ticket_resolved}
            onChange={() => handleToggle('ticket_resolved')}
          />
          <Switch
            label="Mentions"
            description="Get notified when someone mentions you"
            checked={preferences.mentions}
            onChange={() => handleToggle('mentions')}
          />
          <Switch
            label="Knowledge Base Updates"
            description="Get notified about new articles and updates"
            checked={preferences.knowledge_base_updates}
            onChange={() => handleToggle('knowledge_base_updates')}
          />
          {userProfile?.role !== 'customer' && (
            <Switch
              label="Team Updates"
              description="Get notified about team-related updates"
              checked={preferences.team_updates}
              onChange={() => handleToggle('team_updates')}
            />
          )}
        </Stack>

        <Group justify="flex-end">
          <Button onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
} 