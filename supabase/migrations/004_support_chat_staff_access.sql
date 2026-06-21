-- supabase/migrations/004_support_chat_staff_access.sql
-- Share support-chat visibility across ALL staff (admin or employee),
-- instead of restricting a message to only the exact profile that was
-- set as recipient_id. Needed so the admin panel's Messages inbox shows
-- the same "chat with us" conversations no matter which staff account
-- (Heimstadt-Admin) is logged in.

-- Shared read access: any staff member can see any message that involves
-- a staff member on either side (sender or recipient).
create policy "Staff can view all support messages" on public.messages
  for select using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
    and (
      exists (select 1 from public.profiles rcpt where rcpt.id = messages.recipient_id and rcpt.role in ('admin', 'employee'))
      or exists (select 1 from public.profiles snd where snd.id = messages.sender_id and snd.role in ('admin', 'employee'))
    )
  );

-- Shared update access (needed so any staff member can mark a message read).
create policy "Staff can update support messages" on public.messages
  for update using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
    and (
      exists (select 1 from public.profiles rcpt where rcpt.id = messages.recipient_id and rcpt.role in ('admin', 'employee'))
      or exists (select 1 from public.profiles snd where snd.id = messages.sender_id and snd.role in ('admin', 'employee'))
    )
  );

-- Ensure realtime publishes change events for messages so the admin
-- inbox and the main-site chat widget can update live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
