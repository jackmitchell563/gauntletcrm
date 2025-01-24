import { TextInput, Stack, Button, Group, Avatar, Text, Paper } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabaseClient'
import { IconUpload } from '@tabler/icons-react'

interface ProfileFormValues {
  full_name: string
  email: string
}

export function AccountSettings() {
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  const form = useForm<ProfileFormValues>({
    initialValues: {
      full_name: userProfile?.full_name || '',
      email: user?.email || ''
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email')
    }
  })

  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      setLoading(true)

      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ full_name: values.full_name })
        .eq('id', user?.id)

      if (profileError) throw profileError

      // Update email if changed
      if (values.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: values.email
        })
        if (emailError) throw emailError
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper withBorder p="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group>
            <Avatar size="xl" radius="xl" />
            <Stack gap={5}>
              <Text size="sm" fw={500}>Profile Picture</Text>
              <Button 
                leftSection={<IconUpload size={16} />} 
                variant="light" 
                size="xs"
              >
                Upload New
              </Button>
            </Stack>
          </Group>

          <TextInput
            label="Full Name"
            placeholder="Enter your full name"
            {...form.getInputProps('full_name')}
            required
          />

          <TextInput
            label="Email"
            placeholder="Enter your email"
            {...form.getInputProps('email')}
            required
          />

          <Group justify="flex-end">
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  )
} 