-- First drop existing policies to avoid conflicts
drop policy if exists "Users can view their own traces" on "public"."agent_traces";
drop policy if exists "Anyone can insert traces with any user_id" on "public"."agent_traces";
drop policy if exists "Anyone can update traces" on "public"."agent_traces";
drop policy if exists "Allow select for upsert" on "public"."agent_traces";

-- Recreate all policies
create policy "Anyone can select traces"
on "public"."agent_traces"
for select
to public
using (true);

create policy "Anyone can insert traces with any user_id"
on "public"."agent_traces"
for insert
to public
with check (true);

create policy "Anyone can update traces"
on "public"."agent_traces"
for update
to public
using (true); 