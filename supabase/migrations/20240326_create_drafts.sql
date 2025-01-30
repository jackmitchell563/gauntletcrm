create table public.ticket_drafts (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(ticket_id, user_id)
);

-- Enable RLS
alter table public.ticket_drafts enable row level security;

-- Create policies
create policy "Users can view their own drafts"
  on public.ticket_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own drafts"
  on public.ticket_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own drafts"
  on public.ticket_drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own drafts"
  on public.ticket_drafts for delete
  using (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table public.ticket_drafts; 