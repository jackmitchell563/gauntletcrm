import { Group } from '@mantine/core'

interface TagBadgeProps {
  tags: string[]
  onClick?: (tag: string) => void
}

export function TagBadge({ tags, onClick }: TagBadgeProps) {
  if (!tags || tags.length === 0) return null
  
  return (
    <Group gap="xs">
      {tags.map((tag) => (
        <div 
          key={tag}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(tag)
          }}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            cursor: onClick ? 'pointer' : 'default',
            height: 'fit-content'
          }}
        >
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${onClick ? 'hover:bg-gray-200 transition-colors duration-150' : ''}`}>
            {tag}
          </span>
        </div>
      ))}
    </Group>
  )
} 