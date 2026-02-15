-- Self-service tenant management RLS policies
-- Allows tenant owners to update their own tenant and manage users.

-- Tenant owners can update their own tenant (name, settings, etc.)
create policy "Owners can update own tenant"
  on tenants for update
  using (id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role = 'owner'
  ))
  with check (id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role = 'owner'
  ));

-- Tenant owners/admins can insert new tenant users (invite members)
create policy "Admins can invite tenant users"
  on tenant_users for insert
  with check (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- Tenant owners can remove tenant users
create policy "Owners can remove tenant users"
  on tenant_users for delete
  using (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role = 'owner'
  ));

-- Tenant owners/admins can update tenant user roles
create policy "Admins can update tenant user roles"
  on tenant_users for update
  using (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin')
  ))
  with check (tenant_id in (
    select tenant_id from tenant_users
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));
