-- DSCG Cartes : schéma Supabase (docs/SPEC.md §4.4).
-- À exécuter dans Supabase > SQL Editor. Le script peut être relancé sans risque.

-- Journal des révisions : ajout seul, jamais de suppression.
create table if not exists public.reviews (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id text not null,
  rating smallint not null check (rating in (1, 2, 3, 4)),
  reviewed_at timestamptz not null,
  duration_ms integer,
  device text,
  annulee boolean not null default false,
  libre boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists reviews_user_updated on public.reviews (user_id, updated_at);

-- Réglages : une ligne par utilisateur, la plus récente l'emporte (updated_at fixé par l'app).
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- À chaque écriture d'une révision : horodatage serveur (curseur de synchronisation).
-- Une révision existante ne peut changer que d'une façon : être annulée. Jamais l'inverse.
create or replace function public.reviews_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.user_id := old.user_id;
    new.card_id := old.card_id;
    new.rating := old.rating;
    new.reviewed_at := old.reviewed_at;
    new.duration_ms := old.duration_ms;
    new.device := old.device;
    new.libre := old.libre;
    new.annulee := old.annulee or new.annulee;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists reviews_before_write on public.reviews;
create trigger reviews_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

-- Sécurité par ligne : chacun ne voit et n'écrit que ses lignes.
alter table public.reviews enable row level security;
alter table public.settings enable row level security;

drop policy if exists "reviews du proprietaire" on public.reviews;
create policy "reviews du proprietaire" on public.reviews
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "settings du proprietaire" on public.settings;
create policy "settings du proprietaire" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Droits : aucun accès anonyme aux données, et aucune suppression possible du journal.
revoke all on public.reviews, public.settings from anon;
revoke all on public.reviews, public.settings from authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select, insert, update on public.settings to authenticated;

-- Ping anonyme pour la tâche planifiée qui évite la mise en pause du projet gratuit.
create or replace function public.ping() returns integer
language sql stable as $$ select 1 $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
