-- Run once, after `plans`/`user_plans`/`users` exist in the database
-- (i.e. after prisma migrate/db push has applied the new schema).

-- 1. Seed the plan catalog
-- NOTE: uuid(7) in schema.prisma is a Prisma *client-side* generator, not
-- a database default — raw SQL like this needs its own id, hence
-- gen_random_uuid() here. Anything inserted through Prisma Client itself
-- still gets a real uuid(7) value; this only affects hand-written SQL.
insert into public.plans (id, code, name, duration_days, is_active)
values
  (gen_random_uuid(), 'one_year', 'One Year Plan', 365, true),
  (gen_random_uuid(), 'three_year', 'Three Year Plan', 1095, true)
on conflict (code) do nothing;

-- 2. Backfill: every existing user gets a 3-year plan starting from
--    their original signup date (users.created_at), not today.
insert into public.user_plans (id, user_id, plan_id, started_at, expires_at)
select
  gen_random_uuid(),
  au.id,
  p.id,
  coalesce(au.created_at, now()),
  coalesce(au.created_at, now()) + interval '3 years'
from public.users au
cross join (select id from public.plans where code = 'three_year') p
where not exists (
  select 1 from public.user_plans up where up.user_id = au.id
);