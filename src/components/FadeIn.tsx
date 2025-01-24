import { Transition } from '@mantine/core'
import { ReactNode, useEffect, useState } from 'react'

interface FadeInProps {
  children: ReactNode
  delay?: number
}

export function FadeIn({ children, delay = 0 }: FadeInProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <Transition mounted={mounted} transition="fade" duration={500}>
      {(styles) => <div style={styles}>{children}</div>}
    </Transition>
  )
} 