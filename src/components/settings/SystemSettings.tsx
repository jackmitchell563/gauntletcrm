import { Stack, Button, Group, Paper, Text, Select, NumberInput, Switch, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabaseClient'

interface SystemConfig {
  ticket_auto_close_days: number
  default_ticket_priority: string
  enable_customer_portal: boolean
  enable_knowledge_base: boolean
  enable_satisfaction_survey: boolean
  max_file_size_mb: number
  allowed_file_types: string[]
  business_hours: {
    start: string
    end: string
    timezone: string
    workdays: string[]
  }
  sla_config: {
    low: number
    medium: number
    high: number
    urgent: number
  }
}

const WORKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' }
]

export function SystemSettings() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<SystemConfig>({
    ticket_auto_close_days: 7,
    default_ticket_priority: 'medium',
    enable_customer_portal: true,
    enable_knowledge_base: true,
    enable_satisfaction_survey: true,
    max_file_size_mb: 10,
    allowed_file_types: ['image/*', 'application/pdf', '.doc', '.docx'],
    business_hours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
      workdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    sla_config: {
      low: 48,
      medium: 24,
      high: 8,
      urgent: 4
    }
  })

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSLAChange = (priority: keyof SystemConfig['sla_config'], hours: number) => {
    setConfig(prev => ({
      ...prev,
      sla_config: {
        ...prev.sla_config,
        [priority]: hours
      }
    }))
  }

  const handleBusinessHoursChange = (key: keyof SystemConfig['business_hours'], value: any) => {
    setConfig(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [key]: value
      }
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('system_config')
        .upsert({
          config: config,
          updated_by: userProfile?.id,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving system configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userProfile?.role !== 'admin') {
    return (
      <Paper withBorder p="md">
        <Text>You don't have permission to access system settings.</Text>
      </Paper>
    )
  }

  return (
    <Stack gap="xl">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Ticket Settings</Text>
          <NumberInput
            label="Auto-close Tickets After (Days)"
            description="Tickets will be automatically closed after this many days of inactivity"
            value={config.ticket_auto_close_days}
            onChange={(value) => handleConfigChange('ticket_auto_close_days', value)}
            min={1}
            max={90}
          />
          <Select
            label="Default Ticket Priority"
            value={config.default_ticket_priority}
            onChange={(value) => handleConfigChange('default_ticket_priority', value)}
            data={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Feature Settings</Text>
          <Switch
            label="Customer Portal"
            description="Enable the customer self-service portal"
            checked={config.enable_customer_portal}
            onChange={(event) => handleConfigChange('enable_customer_portal', event.currentTarget.checked)}
          />
          <Switch
            label="Knowledge Base"
            description="Enable the knowledge base system"
            checked={config.enable_knowledge_base}
            onChange={(event) => handleConfigChange('enable_knowledge_base', event.currentTarget.checked)}
          />
          <Switch
            label="Satisfaction Survey"
            description="Enable customer satisfaction surveys"
            checked={config.enable_satisfaction_survey}
            onChange={(event) => handleConfigChange('enable_satisfaction_survey', event.currentTarget.checked)}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Business Hours</Text>
          <Group grow>
            <TextInput
              label="Start Time"
              type="time"
              value={config.business_hours.start}
              onChange={(e) => handleBusinessHoursChange('start', e.currentTarget.value)}
            />
            <TextInput
              label="End Time"
              type="time"
              value={config.business_hours.end}
              onChange={(e) => handleBusinessHoursChange('end', e.currentTarget.value)}
            />
          </Group>
          <Select
            label="Time Zone"
            data={TIMEZONES}
            value={config.business_hours.timezone}
            onChange={(value) => handleBusinessHoursChange('timezone', value)}
          />
          <Select
            label="Work Days"
            data={WORKDAYS}
            value={config.business_hours.workdays as unknown as string}
            onChange={(value) => handleBusinessHoursChange('workdays', value?.split(',') || [])}
            multiple
            clearable
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>SLA Configuration (Hours)</Text>
          <Group grow>
            <NumberInput
              label="Low Priority"
              value={config.sla_config.low}
              onChange={(value) => handleSLAChange('low', Number(value) || 48)}
              min={1}
              max={168}
            />
            <NumberInput
              label="Medium Priority"
              value={config.sla_config.medium}
              onChange={(value) => handleSLAChange('medium', Number(value) || 24)}
              min={1}
              max={168}
            />
            <NumberInput
              label="High Priority"
              value={config.sla_config.high}
              onChange={(value) => handleSLAChange('high', Number(value) || 8)}
              min={1}
              max={168}
            />
            <NumberInput
              label="Urgent Priority"
              value={config.sla_config.urgent}
              onChange={(value) => handleSLAChange('urgent', Number(value) || 4)}
              min={1}
              max={168}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>File Upload Settings</Text>
          <NumberInput
            label="Maximum File Size (MB)"
            value={config.max_file_size_mb}
            onChange={(value) => handleConfigChange('max_file_size_mb', value)}
            min={1}
            max={100}
          />
          <TextInput
            label="Allowed File Types"
            description="Comma-separated list of file extensions or MIME types"
            value={config.allowed_file_types.join(', ')}
            onChange={(e) => handleConfigChange('allowed_file_types', e.currentTarget.value.split(',').map(t => t.trim()))}
          />
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