import { Stack, Button, Group, Paper, Text, PasswordInput, Switch } from '@mantine/core'
import { useState } from 'react'
import { useForm } from '@mantine/form'
import { supabase } from '../../supabaseClient'

interface PasswordFormValues {
  current_password: string
  new_password: string
  confirm_password: string
}

export function SecuritySettings() {
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const form = useForm<PasswordFormValues>({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    },
    validate: {
      current_password: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
      new_password: (value) => {
        if (value.length < 6) return 'Password must be at least 6 characters'
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
        return null
      },
      confirm_password: (value, values) => 
        value !== values.new_password ? 'Passwords do not match' : null
    }
  })

  const handlePasswordChange = async (values: PasswordFormValues) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: values.new_password
      })
      if (error) throw error
      
      form.reset()
    } catch (error) {
      console.error('Error updating password:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorToggle = async () => {
    // TODO: Implement 2FA setup flow
    setTwoFactorEnabled(!twoFactorEnabled)
  }

  const handleSessionsLogout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
    } catch (error) {
      console.error('Error logging out other sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="xl">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Change Password</Text>
          <form onSubmit={form.onSubmit(handlePasswordChange)}>
            <Stack gap="md">
              <PasswordInput
                label="Current Password"
                placeholder="Enter your current password"
                {...form.getInputProps('current_password')}
                required
              />
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                {...form.getInputProps('new_password')}
                required
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                {...form.getInputProps('confirm_password')}
                required
              />
              <Group justify="flex-end">
                <Button type="submit" loading={loading}>
                  Update Password
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Two-Factor Authentication</Text>
          <Switch
            label="Enable Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            checked={twoFactorEnabled}
            onChange={handleTwoFactorToggle}
          />
          {twoFactorEnabled && (
            <Text size="sm" c="dimmed">
              Two-factor authentication is enabled. Use an authenticator app to generate codes.
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Active Sessions</Text>
          <Text size="sm">
            You can log out of all other devices where you're currently signed in.
            This won't affect your current session.
          </Text>
          <Group justify="flex-end">
            <Button 
              variant="light" 
              color="red" 
              onClick={handleSessionsLogout}
              loading={loading}
            >
              Log Out Other Sessions
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
} 