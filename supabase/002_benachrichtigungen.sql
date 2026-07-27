-- ============================================================
-- Schluessel Tresor - Migration 002
-- E-Mail-Benachrichtigungen ueber Database Webhook + Edge Function
--
-- Diese Datei im Supabase SQL-Editor vollstaendig ausfuehren.
-- Sie ist wiederholbar (idempotent) und veraendert keine
-- bestehenden Daten.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Verlaufseintraege um die Anlage/Zugehoerigkeit ergaenzen
--
--    Begruendung: Beim Loeschen eines Schluessels ist die Zeile in
--    public.keys zum Zeitpunkt des Webhooks bereits entfernt. Die
--    Anlage muss daher im unveraenderlichen Verlaufseintrag selbst
--    stehen, damit die E-Mail vollstaendig ist.
-- ------------------------------------------------------------
alter table public.key_events
  add column if not exists anlage text not null default '';

-- Bestehende Eintraege einmalig aus der Schluesseltabelle auffuellen.
update public.key_events e
set    anlage = k.anlage
from   public.keys k
where  e.key_id = k.id
  and  e.anlage = ''
  and  k.anlage <> '';

-- ------------------------------------------------------------
-- 2) Einstellungen fuer E-Mail-Benachrichtigungen
--    Genau eine Zeile mit der festen ID 1.
-- ------------------------------------------------------------
create table if not exists public.notification_settings (
  id                  smallint primary key default 1 check (id = 1),
  bei_entnahme        boolean not null default true,
  bei_rueckgabe       boolean not null default true,
  bei_neuem_schluessel boolean not null default true,
  bei_loeschung       boolean not null default true,
  geaendert_am        timestamptz not null default now(),
  geaendert_durch     text not null default ''
);

insert into public.notification_settings (id)
values (1)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3) Protokoll der Benachrichtigungen
--
--    event_id ist eindeutig. Dadurch kann pro Verlaufseintrag nur
--    genau eine Benachrichtigung entstehen (Idempotenz). Ein
--    erneuter Webhook-Aufruf laeuft in den Konflikt und versendet
--    keine zweite E-Mail.
-- ------------------------------------------------------------
create table if not exists public.notification_log (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null unique references public.key_events (id) on delete cascade,
  aktion         text not null default '',
  status         text not null check (status in ('erfolgreich', 'fehlgeschlagen', 'uebersprungen')),
  empfaenger     text[] not null default '{}',
  empfaenger_anzahl integer not null default 0,
  fehlermeldung  text,
  resend_id      text,
  zeitpunkt      timestamptz not null default now()
);

create index if not exists notification_log_zeitpunkt_idx
  on public.notification_log (zeitpunkt desc);

-- ------------------------------------------------------------
-- 4) Zeilenschutz (Row Level Security)
-- ------------------------------------------------------------
alter table public.notification_settings enable row level security;
alter table public.notification_log      enable row level security;

-- Einstellungen darf jeder angemeldete Benutzer lesen,
-- aber nur Administratoren duerfen sie aendern.
drop policy if exists "Benachrichtigungseinstellungen lesen" on public.notification_settings;
create policy "Benachrichtigungseinstellungen lesen" on public.notification_settings
  for select to authenticated using (true);

drop policy if exists "Benachrichtigungseinstellungen aendern" on public.notification_settings;
create policy "Benachrichtigungseinstellungen aendern" on public.notification_settings
  for update to authenticated
  using (public.ist_admin())
  with check (public.ist_admin());

-- Das Protokoll darf nur von Administratoren gelesen werden.
-- Geschrieben wird ausschliesslich von der Edge Function
-- (Service-Role-Key, umgeht RLS).
drop policy if exists "Benachrichtigungsprotokoll lesen" on public.notification_log;
create policy "Benachrichtigungsprotokoll lesen" on public.notification_log
  for select to authenticated using (public.ist_admin());

-- ------------------------------------------------------------
-- 5) Hilfsfunktion fuer die Edge Function:
--    Liefert alle aktiven Benutzer mit hinterlegter E-Mail-Adresse.
-- ------------------------------------------------------------
create or replace function public.aktive_empfaenger()
returns table (name text, email text)
language sql stable security definer set search_path = public
as $$
  select p.name, p.email
  from   public.profiles p
  where  p.aktiv = true
    and  p.email is not null
    and  p.email <> ''
    and  p.email like '%@%';
$$;

-- ------------------------------------------------------------
-- 6) Database Webhook
--
--    Der Webhook wird in der Supabase-Oberflaeche angelegt:
--      Database -> Webhooks -> Create a new hook
--
--      Name:    benachrichtigung_key_events
--      Table:   public.key_events
--      Events:  Insert
--      Type:    Supabase Edge Functions
--      Edge Function: benachrichtigung-senden
--      Method:  POST
--      Timeout: 5000 ms
--      HTTP Header hinzufuegen:
--        x-webhook-secret : <Wert von WEBHOOK_SECRET>
--
--    Alternativ laesst sich derselbe Webhook per SQL anlegen.
--    Dazu die beiden Platzhalter unten ersetzen und den Block
--    entkommentieren.
-- ------------------------------------------------------------
-- create extension if not exists pg_net with schema extensions;
--
-- drop trigger if exists benachrichtigung_key_events on public.key_events;
-- create trigger benachrichtigung_key_events
--   after insert on public.key_events
--   for each row
--   execute function supabase_functions.http_request(
--     'https://IHRE-PROJEKT-REF.supabase.co/functions/v1/benachrichtigung-senden',
--     'POST',
--     '{"Content-Type":"application/json","x-webhook-secret":"IHR-WEBHOOK-SECRET"}',
--     '{}',
--     '5000'
--   );

-- ------------------------------------------------------------
-- 7) Echtzeit fuer die Einstellungen (optional, aber praktisch:
--    geaenderte Einstellungen erscheinen sofort bei allen Admins)
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.notification_settings;
  exception when duplicate_object then
    null;
  end;
end
$$;
