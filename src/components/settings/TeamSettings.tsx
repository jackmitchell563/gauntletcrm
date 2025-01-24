import { Stack, Button, Group, Paper, Text, Table, Select, ActionIcon, TextInput, Modal } from '@mantine/core'
import { IconTrash, IconPlus, IconSearch } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../supabaseClient'
import { UserRole } from '../../types/database.types'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export function TeamSettings() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('agent')
  const isAdmin = userProfile?.role === 'admin'

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['admin', 'agent'])
        .ilike('full_name', `%${searchQuery}%`)
        .order('full_name')

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isAdmin) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error
      fetchTeamMembers()
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    try {
      setLoading(true)
      // TODO: Implement team member invitation
      // This would typically involve:
      // 1. Creating a new user in auth.users
      // 2. Creating a user_profile with the specified role
      // 3. Sending an invitation email
      console.log('Invite user:', { email: inviteEmail, role: inviteRole })
      setInviteModalOpen(false)
      setInviteEmail('')
      setInviteRole('agent')
    } catch (error) {
      console.error('Error inviting team member:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'customer' })
        .eq('id', userId)

      if (error) throw error
      fetchTeamMembers()
    } catch (error) {
      console.error('Error removing team member:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="xl">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={500}>Team Members</Text>
            {isAdmin && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setInviteModalOpen(true)}
              >
                Invite Member
              </Button>
            )}
          </Group>

          <TextInput
            placeholder="Search team members..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            mb="md"
          />

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                {isAdmin && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>{member.full_name}</Table.Td>
                  <Table.Td>{member.email}</Table.Td>
                  <Table.Td>
                    {isAdmin ? (
                      <Select
                        value={member.role}
                        onChange={(value) => value && handleRoleChange(member.id, value as UserRole)}
                        data={[
                          { value: 'admin', label: 'Admin' },
                          { value: 'agent', label: 'Agent' }
                        ]}
                        disabled={member.id === userProfile?.id}
                      />
                    ) : (
                      member.role
                    )}
                  </Table.Td>
                  <Table.Td>{new Date(member.created_at).toLocaleDateString()}</Table.Td>
                  {isAdmin && (
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={member.id === userProfile?.id}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>

      {/* Invite Member Modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
            required
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(value) => value && setInviteRole(value as UserRole)}
            data={[
              { value: 'admin', label: 'Admin' },
              { value: 'agent', label: 'Agent' }
            ]}
            required
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInvite} 
              loading={loading}
              disabled={!inviteEmail || !inviteRole}
            >
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
} 