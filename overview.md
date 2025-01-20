# GauntletCRM Development Guide

## Project Overview
**GauntletCRM** is an AI-powered Customer Relationship Management system that leverages generative AI to streamline customer support and sales processes. It aims to enhance user experience, reduce manual workload, and improve operational efficiency.

---

## Core Requirements

### Architecture
- **Backend:** Supabase (primary backend)
  - Features: Authentication, database, object storage, vector datastore, real-time synchronization.
- **Frontend:** React, Vite, TypeScript
- **Hosting:** Supabase Edge Functions for agents; AWS Amplify 2.0 for deployment.
- **Development Tools:** Cursor Agent.
- **Code Organization:** AI-optimized structure, prioritizing efficiency over traditional readability.
- **Source Control:** GitHub.

### CRM Features
#### Ticket System
- **Data Model:** Includes ticket ID, timestamps, dynamic status tracking, priority levels, tags, custom fields, internal notes, and conversation history.
- **API-First Design:** Enables integration, automation, AI features, and analytics.
- **Employee Interface:**
  - **Queue Management:** Customizable views, real-time updates, bulk operations.
  - **Ticket Handling:** Rich text editing, macros/templates, collaboration tools.
  - **Performance Tools:** Metrics tracking, template management, personal stats.
- **Admin Controls:** Team management, skills-based routing, load balancing.

#### Customer Tools
- **Portal:** Ticket tracking, interaction history, secure login.
- **Self-Service Tools:** Searchable knowledge base, AI chatbots, interactive tutorials.
- **Communication Tools:** Live chat, email integration, web widgets.
- **Engagement:** Feedback collection, issue ratings.

---

## AI Objectives
### Baseline Features
1. **LLM-Generated Responses:** Courteous, assistive replies to customer tickets.
2. **Human-Assisted Suggestions:** Prepopulated responses for human review.
3. **RAG System:** Contextual LLM inputs via retrieval-augmented generation.
4. **Agentic AI:** Analyze and route tickets intelligently.

### Advanced Features
- **End-to-End Automation:** AI resolves most cases independently.
- **Human-in-the-Loop:** Streamlined review for unresolved cases.
- **Multi-Channel Support:** Phone, chat, email, and multimedia interactions.
- **AI Summarized Dashboards:** Dynamic system and ticket status summaries.
- **Learning System:** Logs outcomes for future AI optimization.

---

## Development Tips
- Prioritize integration with Supabase for backend and agent hosting.
- Use LangChain for modular and scalable AI workflows.
- Maintain a centralized repository for edge functions to streamline multi-frontend architecture.

---

## Resources
- [LangChain Docs](https://python.langchain.com/)
- [Supabase Tutorials](https://supabase.com/docs)
- [FreeScout CRM Inspiration](https://freescout.net/)
