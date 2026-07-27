-- ============================================================
-- Schluessel Tresor - Datenbankschema fuer Supabase/PostgreSQL
-- Diese Datei im Supabase SQL-Editor vollstaendig ausfuehren.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) Benutzerprofile
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  rolle       text not null default 'mitarbeiter' check (rolle in ('admin', 'mitarbeiter')),
  aktiv       boolean not null default true,
  erstellt_am timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) Schluessel und Schluesselbunde
--    Mehrere Datensaetze duerfen dieselbe Position verwenden.
-- ------------------------------------------------------------
create table if not exists public.keys (
  id                   uuid primary key default gen_random_uuid(),
  position             integer not null check (position between 1 and 500),
  schluesselnummer     text not null default '',
  anlage               text not null default '',
  beschriftung         text not null default '',
  farbe                text not null default '',
  ist_bund             boolean not null default false,
  schluesselanzahl     integer not null default 1 check (schluesselanzahl >= 0),
  kommentar            text not null default '',
  status               text not null default 'verfuegbar' check (status in ('verfuegbar', 'entnommen')),
  besitzer_id          uuid references public.profiles (id) on delete set null,
  besitzer_name        text,
  standort             text,
  verwendungszweck     text,
  entnommen_am         timestamptz,
  rueckgabe_geplant    timestamptz,
  zuletzt_zurueck_am   timestamptz,
  letzte_aenderung_durch text,
  erstellt_am          timestamptz not null default now(),
  geaendert_am         timestamptz not null default now()
);

create index if not exists keys_position_idx on public.keys (position);
create index if not exists keys_status_idx on public.keys (status);
create index if not exists keys_suche_idx on public.keys
  (schluesselnummer, beschriftung, anlage);

-- ------------------------------------------------------------
-- 3) Aenderungsverlauf (nur anfuegen, niemals aendern/loeschen)
-- ------------------------------------------------------------
create table if not exists public.key_events (
  id               uuid primary key default gen_random_uuid(),
  key_id           uuid references public.keys (id) on delete set null,
  position         integer not null,
  schluesselnummer text not null default '',
  beschriftung     text not null default '',
  aktion           text not null check (aktion in ('entnommen', 'zurueckgegeben', 'importiert', 'angelegt', 'geaendert', 'geloescht')),
  benutzer_id      uuid references public.profiles (id) on delete set null,
  benutzer_name    text not null default '',
  standort         text,
  verwendungszweck text,
  dauer_sekunden   integer,
  zeitpunkt        timestamptz not null default now()
);

create index if not exists key_events_zeitpunkt_idx on public.key_events (zeitpunkt desc);
create index if not exists key_events_key_idx on public.key_events (key_id);

-- ------------------------------------------------------------
-- 4) Profil automatisch bei Registrierung anlegen
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, rolle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'rolle', 'mitarbeiter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5) Zeitstempel bei Aenderung aktualisieren
-- ------------------------------------------------------------
create or replace function public.set_geaendert_am()
returns trigger language plpgsql as $$
begin
  new.geaendert_am = now();
  return new;
end;
$$;

drop trigger if exists keys_set_geaendert_am on public.keys;
create trigger keys_set_geaendert_am
  before update on public.keys
  for each row execute function public.set_geaendert_am();

-- ------------------------------------------------------------
-- 6) Hilfsfunktion: Ist der angemeldete Benutzer Administrator?
-- ------------------------------------------------------------
create or replace function public.ist_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rolle = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 6b) Schutz der Schluesseldaten: nur Administratoren duerfen
--     Stammdaten aendern. Mitarbeiter duerfen ausschliesslich die
--     Entnahme-/Rueckgabe-Felder setzen. Diese Pruefung greift
--     unabhaengig von der Benutzeroberflaeche.
-- ------------------------------------------------------------
create or replace function public.pruefe_schluessel_aenderung()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.ist_admin() then
    if new.position is distinct from old.position
       or new.schluesselnummer is distinct from old.schluesselnummer
       or new.anlage is distinct from old.anlage
       or new.beschriftung is distinct from old.beschriftung
       or new.farbe is distinct from old.farbe
       or new.ist_bund is distinct from old.ist_bund
       or new.schluesselanzahl is distinct from old.schluesselanzahl
       or new.kommentar is distinct from old.kommentar
    then
      raise exception 'Nur Administratoren duerfen Schluesseldaten bearbeiten.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists keys_pruefe_aenderung on public.keys;
create trigger keys_pruefe_aenderung
  before update on public.keys
  for each row execute function public.pruefe_schluessel_aenderung();

-- ------------------------------------------------------------
-- 7) Zeilenschutz (Row Level Security)
-- ------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.keys       enable row level security;
alter table public.key_events enable row level security;

drop policy if exists "Profile lesen" on public.profiles;
create policy "Profile lesen" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Eigenes Profil aendern" on public.profiles;
create policy "Eigenes Profil aendern" on public.profiles
  for update to authenticated using (id = auth.uid() or public.ist_admin());

drop policy if exists "Schluessel lesen" on public.keys;
create policy "Schluessel lesen" on public.keys
  for select to authenticated using (true);

drop policy if exists "Schluessel entnehmen und zurueckgeben" on public.keys;
create policy "Schluessel entnehmen und zurueckgeben" on public.keys
  for update to authenticated using (true) with check (true);

drop policy if exists "Schluessel anlegen nur Administrator" on public.keys;
create policy "Schluessel anlegen nur Administrator" on public.keys
  for insert to authenticated with check (public.ist_admin());

drop policy if exists "Schluessel loeschen nur Administrator" on public.keys;
create policy "Schluessel loeschen nur Administrator" on public.keys
  for delete to authenticated using (public.ist_admin());

drop policy if exists "Verlauf lesen" on public.key_events;
create policy "Verlauf lesen" on public.key_events
  for select to authenticated using (true);

drop policy if exists "Verlauf anfuegen" on public.key_events;
create policy "Verlauf anfuegen" on public.key_events
  for insert to authenticated with check (true);

-- Kein UPDATE und kein DELETE auf key_events: alte Eintraege
-- koennen dadurch weder geloescht noch ueberschrieben werden.

-- ------------------------------------------------------------
-- 8) Echtzeit-Aktualisierung aktivieren
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.keys;
alter publication supabase_realtime add table public.key_events;

alter table public.keys replica identity full;
