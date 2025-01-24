import { Stack, Button, Group, Paper, Text, Select, Switch, Grid } from '@mantine/core'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabaseClient'

interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  default_ticket_view: string
  dashboard_layout: string[]
  quick_filters: string[]
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' }
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' }
]

const TICKET_VIEWS = [
  { value: 'list', label: 'List View' },
  { value: 'board', label: 'Board View' },
  { value: 'calendar', label: 'Calendar View' }
]

export function PreferenceSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<UIPreferences>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    default_ticket_view: 'list',
    dashboard_layout: ['tickets', 'performance', 'activity'],
    quick_filters: ['assigned', 'priority', 'status']
  })

  const handlePreferenceChange = (key: keyof UIPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          ui_preferences: preferences
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving UI preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="xl">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Appearance</Text>
          <Select
            label="Theme"
            description="Choose your preferred color theme"
            data={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' }
            ]}
            value={preferences.theme}
            onChange={(value) => handlePreferenceChange('theme', value)}
          />

          <Select
            label="Language"
            description="Select your preferred language"
            data={LANGUAGES}
            value={preferences.language}
            onChange={(value) => handlePreferenceChange('language', value)}
          />

          <Select
            label="Time Zone"
            description="Choose your local time zone"
            data={TIMEZONES}
            value={preferences.timezone}
            onChange={(value) => handlePreferenceChange('timezone', value)}
            searchable
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Layout & Views</Text>
          <Select
            label="Default Ticket View"
            description="Choose your preferred ticket view layout"
            data={TICKET_VIEWS}
            value={preferences.default_ticket_view}
            onChange={(value) => handlePreferenceChange('default_ticket_view', value)}
          />

          <Text size="sm" fw={500} mt="md">Dashboard Widgets</Text>
          <Grid>
            <Grid.Col span={6}>
              <Switch
                label="Ticket Overview"
                checked={preferences.dashboard_layout.includes('tickets')}
                onChange={(event) => {
                  const layout = event.currentTarget.checked
                    ? [...preferences.dashboard_layout, 'tickets']
                    : preferences.dashboard_layout.filter(w => w !== 'tickets')
                  handlePreferenceChange('dashboard_layout', layout)
                }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Performance Metrics"
                checked={preferences.dashboard_layout.includes('performance')}
                onChange={(event) => {
                  const layout = event.currentTarget.checked
                    ? [...preferences.dashboard_layout, 'performance']
                    : preferences.dashboard_layout.filter(w => w !== 'performance')
                  handlePreferenceChange('dashboard_layout', layout)
                }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Recent Activity"
                checked={preferences.dashboard_layout.includes('activity')}
                onChange={(event) => {
                  const layout = event.currentTarget.checked
                    ? [...preferences.dashboard_layout, 'activity']
                    : preferences.dashboard_layout.filter(w => w !== 'activity')
                  handlePreferenceChange('dashboard_layout', layout)
                }}
              />
            </Grid.Col>
          </Grid>

          <Text size="sm" fw={500} mt="md">Quick Filters</Text>
          <Grid>
            <Grid.Col span={6}>
              <Switch
                label="Assigned to Me"
                checked={preferences.quick_filters.includes('assigned')}
                onChange={(event) => {
                  const filters = event.currentTarget.checked
                    ? [...preferences.quick_filters, 'assigned']
                    : preferences.quick_filters.filter(f => f !== 'assigned')
                  handlePreferenceChange('quick_filters', filters)
                }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Priority Filter"
                checked={preferences.quick_filters.includes('priority')}
                onChange={(event) => {
                  const filters = event.currentTarget.checked
                    ? [...preferences.quick_filters, 'priority']
                    : preferences.quick_filters.filter(f => f !== 'priority')
                  handlePreferenceChange('quick_filters', filters)
                }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Status Filter"
                checked={preferences.quick_filters.includes('status')}
                onChange={(event) => {
                  const filters = event.currentTarget.checked
                    ? [...preferences.quick_filters, 'status']
                    : preferences.quick_filters.filter(f => f !== 'status')
                  handlePreferenceChange('quick_filters', filters)
                }}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={loading}>
          Save Changes
        </Button>
      </Group>
    </Stack>
  )
} 