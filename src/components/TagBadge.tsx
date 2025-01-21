import { Group } from '@mantine/core'

interface TagBadgeProps {
  tags: string[]
}

export function TagBadge({ tags }: TagBadgeProps) {
  if (!tags || tags.length === 0) return null
  
  return (
    <Group gap="xs">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
        >
          {tag}
        </span>
      ))}
    </Group>
  )
} 