import { AppShell, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ReactNode, useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FilterState } from '../types/filters'
import { FilterContext } from '../tickets/TicketList'
import { TabContext } from '../pages/TicketsPage'
import { FiltersContext } from './Header'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [opened, { toggle }] = useDisclosure()
  const [activeTab, setActiveTab] = useState<string | null>('tickets')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    assignedTo: null,
    tags: [],
    search: '',
    tagSearchMode: 'or'
  })

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      <FiltersContext.Provider value={{ filtersVisible, setFiltersVisible }}>
        <TabContext.Provider value={{
          setTab: (tab: string) => setActiveTab(tab),
          setActiveTab,
          activeTab
        }}>
          <AppShell
            header={{ height: 60 }}
            navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
          >
            <AppShell.Header>
              <Header opened={opened} toggle={toggle} onExpandedChange={setFiltersVisible} />
            </AppShell.Header>

            <AppShell.Navbar>
              <Sidebar onFilterChange={setFilters} filters={filters} />
            </AppShell.Navbar>

            <AppShell.Main>
              <Box p="md">
                {children}
              </Box>
            </AppShell.Main>
          </AppShell>
        </TabContext.Provider>
      </FiltersContext.Provider>
    </FilterContext.Provider>
  )
} 