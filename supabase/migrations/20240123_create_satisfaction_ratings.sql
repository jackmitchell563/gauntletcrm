create table if not exists public.satisfaction_ratings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete cascade,
  score smallint check (score >= 1 and score <= 5),
  unique(ticket_id)
);

-- Set up row level security
alter table public.satisfaction_ratings enable row level security;

-- Allow authenticated users to view all ratings
create policy "Users can view all satisfaction ratings"
  on public.satisfaction_ratings for select
  to authenticated
  using (true);

-- Allow agents to create ratings when resolving tickets
create policy "Agents can create ratings"
  on public.satisfaction_ratings for insert
  to authenticated
  with check (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND role IN ('agent', 'admin')
  ));

-- Allow customers to update their own ratings with a score
create policy "Customers can update score"
  on public.satisfaction_ratings for update
  to authenticated
  using (EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.created_by = auth.uid()
  ))
  with check (
    -- Only allow updating the score field
    coalesce(array_length(akeys(to_jsonb(current_row) - array['score']::text[]), 1), 0) = 0
  ); 