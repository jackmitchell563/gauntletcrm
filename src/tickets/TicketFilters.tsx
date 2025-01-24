import { Group, Select, MultiSelect, TextInput, Button, Stack, Paper, Switch } from '@mantine/core'
import { IconFilter, IconX } from '@tabler/icons-react'
import { FilterState } from '../types/filters'
import { useState } from 'react'
import { TicketStatus, TicketPriority } from '../types/database.types'

interface TicketFiltersProps {
  onFilterChange: (filters: FilterState) => void
  agents: { value: string; label: string }[]
  availableTags: string[]
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  filters: FilterState
}

export function TicketFilters({ 
  onFilterChange, 
  agents, 
  availableTags,
  expanded,
  onExpandedChange,
  filters
}: TicketFiltersProps) {
  const [useAndSearch, setUseAndSearch] = useState(filters.tagSearchMode === 'and')

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const handleTagSearchModeChange = (checked: boolean) => {
    setUseAndSearch(checked)
    handleFilterChange('tagSearchMode', checked ? 'and' : 'or')
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      status: 'all',
      priority: 'all',
      assignedTo: null,
      tags: [],
      search: '',
      tagSearchMode: 'or'
    }
    setUseAndSearch(false)
    onFilterChange(defaultFilters)
  }

  const statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ]

  const priorityOptions: { value: TicketPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <TextInput
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            leftSection={expanded ? <IconX size={16} /> : <IconFilter size={16} />}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </Group>

        {expanded && (
          <Group grow>
            <MultiSelect
              label="Status"
              placeholder="All Statuses"
              value={filters.status === 'all' ? [] : filters.status}
              onChange={(value) => handleFilterChange('status', value.length === 0 ? 'all' : value)}
              data={statusOptions}
              clearable
              searchable
            />

            <MultiSelect
              label="Priority"
              placeholder="All Priorities"
              value={filters.priority === 'all' ? [] : filters.priority}
              onChange={(value) => handleFilterChange('priority', value.length === 0 ? 'all' : value)}
              data={priorityOptions}
              clearable
              searchable
            />

            <Select
              label="Assigned To"
              value={filters.assignedTo}
              onChange={(value) => handleFilterChange('assignedTo', value)}
              data={[{ value: '', label: 'All Agents' }, ...agents]}
              clearable
            />

            <Stack>
              <MultiSelect
                label="Tags"
                value={filters.tags}
                onChange={(value) => handleFilterChange('tags', value)}
                data={availableTags.map(tag => ({ value: tag, label: tag }))}
                searchable
                clearable
              />
              {filters.tags.length > 1 && (
                <Switch
                  label="Match all tags (AND)"
                  checked={useAndSearch}
                  onChange={(event) => handleTagSearchModeChange(event.currentTarget.checked)}
                  size="sm"
                />
              )}
            </Stack>
          </Group>
        )}

        {expanded && (
          <Group justify="flex-end">
            <Button variant="subtle" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  )
} 