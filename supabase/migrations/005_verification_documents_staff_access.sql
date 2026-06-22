-- supabase/migrations/005_verification_documents_staff_access.sql
-- Grant admin/employee staff read+update access to verification_documents.
-- Previously only the uploading user and their landlord (via a matching
-- booking) could see a document, so the admin panel's Verification Center
-- had no way to read uploads at all, regardless of how the UI queried them.

create policy "Staff can view all verification documents" on public.verification_documents
  for select using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
  );

create policy "Staff can update verification documents" on public.verification_documents
  for update using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
  );

-- Ensure realtime publishes change events so the admin Verification Center
-- updates live as new documents are uploaded.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verification_documents'
  ) then
    alter publication supabase_realtime add table public.verification_documents;
  end if;
end $$;
