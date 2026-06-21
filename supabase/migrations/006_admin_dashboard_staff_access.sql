-- supabase/migrations/006_admin_dashboard_staff_access.sql
-- Grant admin/employee staff read access to properties and bookings.
-- Previously properties only exposed status='active' rows publicly, and
-- bookings only exposed rows to their own tenant/landlord, so the admin
-- dashboard's "Total Properties" / "Active Bookings" stat cards always
-- counted zero (or an incomplete subset) for staff accounts.

create policy "Staff can view all properties" on public.properties
  for select using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
  );

create policy "Staff can view all bookings" on public.bookings
  for select using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('admin', 'employee'))
  );
