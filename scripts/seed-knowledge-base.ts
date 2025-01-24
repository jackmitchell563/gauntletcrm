import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qbqxhkbzqvxlxvqwqwcr.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

const categories = [
  {
    name: 'Getting Started',
    description: 'Basic guides and tutorials for new users'
  },
  {
    name: 'Account Management',
    description: 'How to manage your account settings and preferences'
  },
  {
    name: 'Ticketing System',
    description: 'Learn about creating and managing support tickets'
  },
  {
    name: 'Billing & Subscriptions',
    description: 'Information about billing, pricing, and subscription management'
  },
  {
    name: 'Security',
    description: 'Security best practices and guidelines'
  }
]

const articles = [
  {
    title: 'Welcome to GauntletCRM',
    content: `Welcome to GauntletCRM! This guide will help you get started with our platform.

## What is GauntletCRM?

GauntletCRM is a modern customer relationship management system designed to streamline your support operations. Our platform offers:

- Efficient ticket management
- Real-time customer communication
- Comprehensive reporting
- Knowledge base management

## First Steps

1. Complete your profile setup
2. Explore the dashboard
3. Create your first ticket
4. Browse the knowledge base

Need help? Our support team is always ready to assist you!`,
    category: 'Getting Started',
    is_published: true
  },
  {
    title: 'How to Create a Support Ticket',
    content: `This guide explains how to create and manage support tickets in GauntletCRM.

## Creating a New Ticket

1. Click the "New Ticket" button
2. Fill in the ticket details:
   - Subject
   - Description
   - Priority level
   - Category
3. Submit the ticket

## Tracking Your Tickets

You can track your tickets in the "Tickets" section. Each ticket shows:
- Current status
- Assigned agent
- Latest updates
- Response time

## Best Practices

- Be specific in your description
- Include relevant screenshots
- Use appropriate priority levels
- Check for existing solutions in the knowledge base`,
    category: 'Ticketing System',
    is_published: true
  },
  {
    title: 'Security Best Practices',
    content: `Protect your account and data with these security best practices.

## Password Guidelines

- Use strong, unique passwords
- Enable two-factor authentication
- Never share your credentials
- Update passwords regularly

## Access Management

- Review active sessions regularly
- Log out from unused devices
- Manage team member permissions carefully
- Report suspicious activities immediately

## Data Protection

We use industry-standard encryption to protect your data. However, you should:
- Keep your recovery codes safe
- Use secure networks
- Enable login notifications
- Regular security audits`,
    category: 'Security',
    is_published: true
  },
  {
    title: 'Managing Your Subscription',
    content: `Learn how to manage your GauntletCRM subscription and billing preferences.

## Subscription Plans

We offer several plans to meet your needs:
- Basic
- Professional
- Enterprise

## Billing Cycles

- Monthly billing
- Annual billing (save 20%)
- Custom enterprise plans

## Payment Methods

We accept:
- Credit/Debit cards
- PayPal
- Bank transfers (enterprise)

## Upgrading or Downgrading

You can change your plan at any time. Changes take effect:
- Upgrades: Immediately
- Downgrades: Next billing cycle`,
    category: 'Billing & Subscriptions',
    is_published: true
  }
]

async function seedKnowledgeBase() {
  try {
    // Insert categories
    for (const category of categories) {
      const { error: categoryError } = await supabase
        .from('knowledge_categories')
        .insert([category])
        .select()

      if (categoryError) {
        console.error('Error inserting category:', categoryError)
        continue
      }
    }

    // Get admin user for articles
    const { data: adminUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (!adminUser) {
      throw new Error('No admin user found')
    }

    // Get categories for reference
    const { data: categoryData } = await supabase
      .from('knowledge_categories')
      .select('id, name')

    if (!categoryData) {
      throw new Error('No categories found')
    }

    const categoryMap = new Map(categoryData.map(c => [c.name, c.id]))

    // Insert articles
    for (const article of articles) {
      const categoryId = categoryMap.get(article.category)
      if (!categoryId) {
        console.error(`Category not found: ${article.category}`)
        continue
      }

      const { error: articleError } = await supabase
        .from('knowledge_articles')
        .insert([{
          title: article.title,
          content: article.content,
          category_id: categoryId,
          user_id: adminUser.id,
          is_published: article.is_published,
          view_count: 0
        }])

      if (articleError) {
        console.error('Error inserting article:', articleError)
      }
    }

    console.log('Knowledge base seeded successfully!')
  } catch (error) {
    console.error('Error seeding knowledge base:', error)
  }
}

seedKnowledgeBase() 