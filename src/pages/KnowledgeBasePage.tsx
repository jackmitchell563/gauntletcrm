import { Container, Paper, Stack, Text, Grid, Button, Group, Modal, TextInput, Textarea } from '@mantine/core'
import { IconPlus, IconBook, IconCategory } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { FadeIn } from '../components'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'

interface Category {
  id: string
  name: string
  description: string | null
  parent_id: string | null
}

interface Article {
  id: string
  title: string
  content: string
  category_id: string
  user_id: string
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
  user_profiles: {
    full_name: string
  }
}

export function KnowledgeBasePage() {
  const { userProfile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')

  // Fetch data
  useEffect(() => {
    fetchCategories()
    fetchArticles()

    const channel = supabase
      .channel('knowledge_base')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'knowledge_articles' },
        () => fetchArticles()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'knowledge_categories' },
        () => fetchCategories()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchArticles = async () => {
    try {
      let query = supabase
        .from('knowledge_articles')
        .select('*, user_profiles(full_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory)
      }

      const { data, error } = await query
      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching articles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory])

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return

    try {
      const { error } = await supabase
        .from('knowledge_categories')
        .insert([{
          name: categoryName,
          description: categoryDescription || null
        }])

      if (error) throw error

      // Reset form and close modal
      setCategoryName('')
      setCategoryDescription('')
      setCategoryModalOpen(false)
    } catch (err) {
      console.error('Error creating category:', err)
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <FadeIn>
          <Paper withBorder p="md" radius="md">
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <Text size="xl" fw={600}>Knowledge Base</Text>
                {isAgent && (
                  <Group>
                    <Button 
                      leftSection={<IconCategory size={16} />} 
                      variant="light"
                      onClick={() => setCategoryModalOpen(true)}
                    >
                      New Category
                    </Button>
                    <Button 
                      leftSection={<IconPlus size={16} />}
                      onClick={() => setArticleModalOpen(true)}
                    >
                      New Article
                    </Button>
                  </Group>
                )}
              </Group>

              <Grid>
                {/* Categories sidebar */}
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Paper withBorder p="md">
                    <Stack>
                      <Text fw={500}>Categories</Text>
                      <Stack gap="xs">
                        <Button
                          variant={selectedCategory === null ? "light" : "subtle"}
                          onClick={() => setSelectedCategory(null)}
                          justify="start"
                          fullWidth
                        >
                          All Articles
                        </Button>
                        {categories.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? "light" : "subtle"}
                            onClick={() => setSelectedCategory(category.id)}
                            justify="start"
                            fullWidth
                          >
                            {category.name}
                          </Button>
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid.Col>

                {/* Articles list */}
                <Grid.Col span={{ base: 12, md: 9 }}>
                  <Stack gap="md">
                    {loading ? (
                      <Text ta="center">Loading articles...</Text>
                    ) : articles.length === 0 ? (
                      <Text ta="center">No articles found</Text>
                    ) : (
                      articles.map((article) => (
                        <Paper key={article.id} withBorder p="md">
                          <Stack gap="xs">
                            <Text size="lg" fw={500}>{article.title}</Text>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">By {article.user_profiles?.full_name}</Text>
                              <Text size="sm" c="dimmed">•</Text>
                              <Text size="sm" c="dimmed">
                                {new Date(article.updated_at).toLocaleDateString()}
                              </Text>
                            </Group>
                            <Text lineClamp={3}>{article.content}</Text>
                            <Button variant="light" size="xs" leftSection={<IconBook size={16} />}>
                              Read More
                            </Button>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* New Category Modal */}
          <Modal
            opened={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            title="Create New Category"
            centered
          >
            <Stack>
              <TextInput
                label="Category Name"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
              <Textarea
                label="Description"
                placeholder="Enter category description (optional)"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
              />
              <Button 
                onClick={handleCreateCategory}
                disabled={!categoryName.trim()}
              >
                Create Category
              </Button>
            </Stack>
          </Modal>

          {/* New Article Modal */}
          <Modal
            opened={articleModalOpen}
            onClose={() => setArticleModalOpen(false)}
            title="Create New Article"
            size="xl"
            centered
          >
            <Text>Article editor coming soon...</Text>
          </Modal>
        </FadeIn>
      </Stack>
    </Container>
  )
} 