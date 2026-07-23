-- =============================================================================
-- Modul 9: admin user-lista (email az auth.users-ből).
-- SECURITY DEFINER, de csak admin hívhatja (is_admin ellenőrzés).
-- =============================================================================
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  nev text,
  role user_role,
  aktiv boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Csak admin érheti el.';
  end if;

  return query
    select p.id, u.email::text, p.nev, p.role, p.aktiv, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at asc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
