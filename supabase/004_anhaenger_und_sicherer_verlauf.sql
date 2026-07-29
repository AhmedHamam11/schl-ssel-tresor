-- ============================================================
-- Schluessel Tresor - Migration 004
-- Mehrere beschriftete Anhaenger pro Schluessel / Schluesselbund
-- + atomare Aktionen fuer einen verlaesslichen Verlauf
--
-- Diese Datei im Supabase SQL-Editor vollstaendig ausfuehren.
-- Sie ist wiederholbar und bewahrt bestehende Schluesseldaten.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Datenmodell erweitern
-- ------------------------------------------------------------
alter table public.keys
  add column if not exists beschriftung_farbe text;

-- Kein erzwungenes Grau mehr. Ohne Auswahl bleibt die Farbe NULL.
alter table public.keys alter column beschriftung_farbe drop default;
alter table public.keys alter column beschriftung_farbe drop not null;
alter table public.keys drop constraint if exists keys_beschriftung_farbe_check;
alter table public.keys
  add constraint keys_beschriftung_farbe_check
  check (
    beschriftung_farbe is null or
    beschriftung_farbe in ('Blau', 'Rot', 'Grau', 'Weiß', 'Violett', 'Orange', 'Schwarz', 'Gelb', 'Grün')
  );

alter table public.keys
  add column if not exists anhaenger jsonb not null default '[]'::jsonb;

alter table public.keys drop constraint if exists keys_anhaenger_array_check;
alter table public.keys
  add constraint keys_anhaenger_array_check
  check (jsonb_typeof(anhaenger) = 'array');

alter table public.key_events
  add column if not exists anlage text not null default '';

alter table public.key_events
  add column if not exists anhaenger jsonb not null default '[]'::jsonb;

alter table public.key_events drop constraint if exists key_events_anhaenger_array_check;
alter table public.key_events
  add constraint key_events_anhaenger_array_check
  check (jsonb_typeof(anhaenger) = 'array');


-- Bestehende Alt-Schemata auf denselben gueltigen Aktionsumfang bringen.
alter table public.key_events drop constraint if exists key_events_aktion_check;
alter table public.key_events
  add constraint key_events_aktion_check
  check (aktion in ('entnommen', 'zurueckgegeben', 'importiert', 'angelegt', 'geaendert', 'geloescht'));

-- Null oder 0 ist bei einer realen Schluesselgruppe nicht sinnvoll.
update public.keys set schluesselanzahl = 1 where schluesselanzahl < 1;
alter table public.keys drop constraint if exists keys_schluesselanzahl_check;
alter table public.keys
  add constraint keys_schluesselanzahl_check check (schluesselanzahl >= 1);

drop index if exists public.keys_beschriftung_farbe_idx;
create index keys_beschriftung_farbe_idx
  on public.keys (beschriftung_farbe)
  where beschriftung_farbe is not null;

-- ------------------------------------------------------------
-- 2) Bestehende Daten sinnvoll uebernehmen
--
-- Die fruehere Migration setzte bei allen Datensaetzen automatisch
-- "Grau". Wenn im alten Feld "farbe" eine echte Farbe steht, wird
-- diese verwendet. Ein bloss automatisch gesetztes Grau wird entfernt.
-- ------------------------------------------------------------
update public.keys
set beschriftung_farbe = case lower(trim(farbe))
  when 'blau' then 'Blau'
  when 'blue' then 'Blau'
  when 'rot' then 'Rot'
  when 'red' then 'Rot'
  when 'grau' then 'Grau'
  when 'gray' then 'Grau'
  when 'grey' then 'Grau'
  when 'weiß' then 'Weiß'
  when 'weiss' then 'Weiß'
  when 'white' then 'Weiß'
  when 'violett' then 'Violett'
  when 'lila' then 'Violett'
  when 'purple' then 'Violett'
  when 'orange' then 'Orange'
  when 'schwarz' then 'Schwarz'
  when 'black' then 'Schwarz'
  when 'gelb' then 'Gelb'
  when 'yellow' then 'Gelb'
  when 'grün' then 'Grün'
  when 'gruen' then 'Grün'
  when 'green' then 'Grün'
  else beschriftung_farbe
end
where nullif(trim(farbe), '') is not null
  and (beschriftung_farbe is null or beschriftung_farbe = 'Grau');

update public.keys
set beschriftung_farbe = null
where beschriftung_farbe = 'Grau'
  and lower(trim(coalesce(farbe, ''))) not in ('grau', 'gray', 'grey');

update public.keys
set anhaenger = jsonb_build_array(
  jsonb_build_object(
    'text', trim(beschriftung),
    'farbe', beschriftung_farbe
  )
)
where jsonb_array_length(anhaenger) = 0
  and nullif(trim(beschriftung), '') is not null;

update public.key_events e
set anlage = k.anlage,
    anhaenger = k.anhaenger
from public.keys k
where e.key_id = k.id
  and (e.anlage = '' or jsonb_array_length(e.anhaenger) = 0);

-- ------------------------------------------------------------
-- 3) Hilfsfunktionen
-- ------------------------------------------------------------
create or replace function public.normalisiere_anhaenger(p_anhaenger jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_eintrag jsonb;
  v_text text;
  v_farbe text;
  v_ergebnis jsonb := '[]'::jsonb;
begin
  if p_anhaenger is null then
    return v_ergebnis;
  end if;
  if jsonb_typeof(p_anhaenger) <> 'array' then
    raise exception 'Anhaenger muessen als Liste uebergeben werden.';
  end if;

  for v_eintrag in select value from jsonb_array_elements(p_anhaenger)
  loop
    if jsonb_typeof(v_eintrag) <> 'object' then
      continue;
    end if;
    v_text := trim(coalesce(v_eintrag ->> 'text', ''));
    if v_text = '' then
      continue;
    end if;
    v_farbe := nullif(trim(coalesce(v_eintrag ->> 'farbe', '')), '');
    if v_farbe is not null and v_farbe not in
      ('Blau', 'Rot', 'Grau', 'Weiß', 'Violett', 'Orange', 'Schwarz', 'Gelb', 'Grün')
    then
      raise exception 'Ungueltige Anhaengerfarbe: %', v_farbe;
    end if;
    v_ergebnis := v_ergebnis || jsonb_build_array(
      jsonb_build_object('text', v_text, 'farbe', v_farbe)
    );
  end loop;

  return v_ergebnis;
end;
$$;

create or replace function public.aktueller_benutzername()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select nullif(trim(p.name), '') from public.profiles p where p.id = auth.uid()),
    nullif(auth.jwt() ->> 'email', ''),
    'Unbekannt'
  );
$$;

-- ------------------------------------------------------------
-- 4) Stammdaten-Schutz um die neuen Felder ergaenzen
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
       or new.beschriftung_farbe is distinct from old.beschriftung_farbe
       or new.anhaenger is distinct from old.anhaenger
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

-- Direkte Schreibzugriffe aus dem Browser entfernen. Alle Bestandsaenderungen
-- laufen ab jetzt ausschliesslich ueber die folgenden RPC-Funktionen; nur so
-- entstehen Bestand und Verlauf garantiert gemeinsam.
drop policy if exists "Schluessel entnehmen und zurueckgeben" on public.keys;
drop policy if exists "Schluessel anlegen nur Administrator" on public.keys;
drop policy if exists "Schluessel loeschen nur Administrator" on public.keys;
drop policy if exists "Verlauf anfuegen" on public.key_events;

-- ------------------------------------------------------------
-- 5) Atomare Aktionen
--
-- Jede Funktion aktualisiert Bestand UND Verlauf in derselben
-- Datenbanktransaktion. Dadurch entstehen keine falschen oder
-- fehlenden Verlaufseintraege bei parallelen Klicks oder Fehlern.
-- ------------------------------------------------------------
create or replace function public.schluessel_anlegen(p_daten jsonb)
returns public.keys
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.keys%rowtype;
  v_anhaenger jsonb;
  v_beschriftung text;
  v_farbe text;
  v_benutzer text := public.aktueller_benutzername();
begin
  if not public.ist_admin() then
    raise exception 'Nur Administratoren duerfen Schluessel anlegen.';
  end if;

  v_anhaenger := public.normalisiere_anhaenger(coalesce(p_daten -> 'anhaenger', '[]'::jsonb));
  v_beschriftung := coalesce(v_anhaenger -> 0 ->> 'text', '');
  v_farbe := nullif(v_anhaenger -> 0 ->> 'farbe', '');

  if nullif(trim(coalesce(p_daten ->> 'schluesselnummer', '')), '') is null
     and jsonb_array_length(v_anhaenger) = 0
  then
    raise exception 'Mindestens eine Schluesselnummer oder ein Anhaengertext ist erforderlich.';
  end if;

  insert into public.keys (
    position, schluesselnummer, anlage, beschriftung, farbe,
    beschriftung_farbe, anhaenger, ist_bund, schluesselanzahl,
    kommentar, status, letzte_aenderung_durch
  ) values (
    (p_daten ->> 'position')::integer,
    trim(coalesce(p_daten ->> 'schluesselnummer', '')),
    trim(coalesce(p_daten ->> 'anlage', '')),
    v_beschriftung,
    coalesce(v_farbe, ''),
    v_farbe,
    v_anhaenger,
    coalesce((p_daten ->> 'ist_bund')::boolean, false),
    coalesce(nullif(p_daten ->> 'schluesselanzahl', '')::integer, 1),
    trim(coalesce(p_daten ->> 'kommentar', '')),
    'verfuegbar',
    v_benutzer
  ) returning * into v_key;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name
  ) values (
    v_key.id, v_key.position, v_key.schluesselnummer, v_key.beschriftung,
    v_key.anlage, v_key.anhaenger, 'angelegt', auth.uid(), v_benutzer
  );

  return v_key;
end;
$$;

create or replace function public.schluessel_aendern(p_key_id uuid, p_daten jsonb)
returns public.keys
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.keys%rowtype;
  v_anhaenger jsonb;
  v_beschriftung text;
  v_farbe text;
  v_benutzer text := public.aktueller_benutzername();
begin
  if not public.ist_admin() then
    raise exception 'Nur Administratoren duerfen Schluesseldaten bearbeiten.';
  end if;

  perform 1 from public.keys where id = p_key_id for update;
  if not found then
    raise exception 'Schluessel nicht gefunden.';
  end if;

  v_anhaenger := public.normalisiere_anhaenger(coalesce(p_daten -> 'anhaenger', '[]'::jsonb));
  v_beschriftung := coalesce(v_anhaenger -> 0 ->> 'text', '');
  v_farbe := nullif(v_anhaenger -> 0 ->> 'farbe', '');

  if nullif(trim(coalesce(p_daten ->> 'schluesselnummer', '')), '') is null
     and jsonb_array_length(v_anhaenger) = 0
  then
    raise exception 'Mindestens eine Schluesselnummer oder ein Anhaengertext ist erforderlich.';
  end if;

  update public.keys
  set position = (p_daten ->> 'position')::integer,
      schluesselnummer = trim(coalesce(p_daten ->> 'schluesselnummer', '')),
      anlage = trim(coalesce(p_daten ->> 'anlage', '')),
      beschriftung = v_beschriftung,
      farbe = coalesce(v_farbe, ''),
      beschriftung_farbe = v_farbe,
      anhaenger = v_anhaenger,
      ist_bund = coalesce((p_daten ->> 'ist_bund')::boolean, false),
      schluesselanzahl = coalesce(nullif(p_daten ->> 'schluesselanzahl', '')::integer, 1),
      kommentar = trim(coalesce(p_daten ->> 'kommentar', '')),
      letzte_aenderung_durch = v_benutzer
  where id = p_key_id
  returning * into v_key;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name
  ) values (
    v_key.id, v_key.position, v_key.schluesselnummer, v_key.beschriftung,
    v_key.anlage, v_key.anhaenger, 'geaendert', auth.uid(), v_benutzer
  );

  return v_key;
end;
$$;

create or replace function public.schluessel_loeschen(p_key_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.keys%rowtype;
  v_benutzer text := public.aktueller_benutzername();
begin
  if not public.ist_admin() then
    raise exception 'Nur Administratoren duerfen Schluessel loeschen.';
  end if;

  delete from public.keys where id = p_key_id returning * into v_key;
  if not found then
    raise exception 'Schluessel nicht gefunden.';
  end if;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name, standort, verwendungszweck
  ) values (
    null, v_key.position, v_key.schluesselnummer, v_key.beschriftung,
    v_key.anlage, v_key.anhaenger, 'geloescht', auth.uid(), v_benutzer,
    v_key.standort, v_key.verwendungszweck
  );
end;
$$;

create or replace function public.schluessel_entnehmen(
  p_key_id uuid,
  p_besitzer_name text,
  p_standort text,
  p_verwendungszweck text default null,
  p_rueckgabe_geplant timestamptz default null
)
returns public.keys
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alt public.keys%rowtype;
  v_key public.keys%rowtype;
  v_jetzt timestamptz := now();
  v_operator text := public.aktueller_benutzername();
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich.';
  end if;
  if nullif(trim(coalesce(p_besitzer_name, '')), '') is null then
    raise exception 'Name der entnehmenden Person fehlt.';
  end if;
  if nullif(trim(coalesce(p_standort, '')), '') is null then
    raise exception 'Standort fehlt.';
  end if;

  select * into v_alt from public.keys where id = p_key_id for update;
  if not found then
    raise exception 'Schluessel nicht gefunden.';
  end if;
  if v_alt.status <> 'verfuegbar' then
    raise exception 'Schluessel wurde bereits entnommen.';
  end if;

  update public.keys
  set status = 'entnommen',
      besitzer_id = auth.uid(),
      besitzer_name = trim(p_besitzer_name),
      standort = trim(p_standort),
      verwendungszweck = nullif(trim(coalesce(p_verwendungszweck, '')), ''),
      entnommen_am = v_jetzt,
      rueckgabe_geplant = p_rueckgabe_geplant,
      letzte_aenderung_durch = v_operator
  where id = p_key_id
  returning * into v_key;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name, standort, verwendungszweck, zeitpunkt
  ) values (
    v_key.id, v_key.position, v_key.schluesselnummer, v_key.beschriftung,
    v_key.anlage, v_key.anhaenger, 'entnommen', auth.uid(), trim(p_besitzer_name),
    v_key.standort, v_key.verwendungszweck, v_jetzt
  );

  return v_key;
end;
$$;

create or replace function public.schluessel_zurueckgeben(
  p_key_id uuid,
  p_rueckgeber_name text
)
returns public.keys
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alt public.keys%rowtype;
  v_key public.keys%rowtype;
  v_jetzt timestamptz := now();
  v_dauer integer;
  v_operator text := public.aktueller_benutzername();
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich.';
  end if;
  if nullif(trim(coalesce(p_rueckgeber_name, '')), '') is null then
    raise exception 'Name der rueckgebenden Person fehlt.';
  end if;

  select * into v_alt from public.keys where id = p_key_id for update;
  if not found then
    raise exception 'Schluessel nicht gefunden.';
  end if;
  if v_alt.status <> 'entnommen' then
    raise exception 'Schluessel wurde bereits zurueckgegeben.';
  end if;

  v_dauer := case
    when v_alt.entnommen_am is null then null
    else greatest(0, floor(extract(epoch from (v_jetzt - v_alt.entnommen_am)))::integer)
  end;

  update public.keys
  set status = 'verfuegbar',
      besitzer_id = null,
      besitzer_name = null,
      standort = null,
      verwendungszweck = null,
      entnommen_am = null,
      rueckgabe_geplant = null,
      zuletzt_zurueck_am = v_jetzt,
      letzte_aenderung_durch = v_operator
  where id = p_key_id
  returning * into v_key;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name, standort, verwendungszweck,
    dauer_sekunden, zeitpunkt
  ) values (
    v_key.id, v_key.position, v_key.schluesselnummer, v_key.beschriftung,
    v_key.anlage, v_key.anhaenger, 'zurueckgegeben', auth.uid(), trim(p_rueckgeber_name),
    v_alt.standort, v_alt.verwendungszweck, v_dauer, v_jetzt
  );

  return v_key;
end;
$$;

create or replace function public.bestand_importieren(
  p_daten jsonb,
  p_ersetzen boolean default false,
  p_dateiname text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_datum jsonb;
  v_anhaenger jsonb;
  v_beschriftung text;
  v_farbe text;
  v_anzahl integer := 0;
  v_benutzer text := public.aktueller_benutzername();
begin
  if not public.ist_admin() then
    raise exception 'Nur Administratoren duerfen den Bestand importieren.';
  end if;
  if p_daten is null or jsonb_typeof(p_daten) <> 'array' then
    raise exception 'Importdaten muessen als Liste uebergeben werden.';
  end if;
  if jsonb_array_length(p_daten) = 0 then
    raise exception 'Die Importliste ist leer.';
  end if;

  if coalesce(p_ersetzen, false) then
    delete from public.keys;
  end if;

  for v_datum in select value from jsonb_array_elements(p_daten)
  loop
    v_anhaenger := public.normalisiere_anhaenger(coalesce(v_datum -> 'anhaenger', '[]'::jsonb));
    v_beschriftung := coalesce(v_anhaenger -> 0 ->> 'text', '');
    v_farbe := nullif(v_anhaenger -> 0 ->> 'farbe', '');

    if nullif(trim(coalesce(v_datum ->> 'schluesselnummer', '')), '') is null
       and jsonb_array_length(v_anhaenger) = 0
    then
      raise exception 'Importzeile ohne Schluesselnummer und ohne Anhaengertext.';
    end if;

    insert into public.keys (
      position, schluesselnummer, anlage, beschriftung, farbe,
      beschriftung_farbe, anhaenger, ist_bund, schluesselanzahl,
      kommentar, status, letzte_aenderung_durch
    ) values (
      (v_datum ->> 'position')::integer,
      trim(coalesce(v_datum ->> 'schluesselnummer', '')),
      trim(coalesce(v_datum ->> 'anlage', '')),
      v_beschriftung,
      coalesce(v_farbe, ''),
      v_farbe,
      v_anhaenger,
      coalesce((v_datum ->> 'ist_bund')::boolean, false),
      coalesce(nullif(v_datum ->> 'schluesselanzahl', '')::integer, 1),
      trim(coalesce(v_datum ->> 'kommentar', '')),
      'verfuegbar',
      v_benutzer
    );

    v_anzahl := v_anzahl + 1;
  end loop;

  insert into public.key_events (
    key_id, position, schluesselnummer, beschriftung, anlage, anhaenger,
    aktion, benutzer_id, benutzer_name
  ) values (
    null,
    0,
    '',
    format(
      'Excel-Import: %s Datensaetze aus %s (%s)',
      v_anzahl,
      coalesce(nullif(trim(p_dateiname), ''), 'Datei ohne Namen'),
      case when coalesce(p_ersetzen, false) then 'Bestand ersetzt' else 'Bestand ergaenzt' end
    ),
    '',
    '[]'::jsonb,
    'importiert',
    auth.uid(),
    v_benutzer
  );

  return v_anzahl;
end;
$$;

-- ------------------------------------------------------------
-- 6) Ausfuehrungsrechte
-- ------------------------------------------------------------
revoke all on function public.schluessel_anlegen(jsonb) from public;
revoke all on function public.schluessel_aendern(uuid, jsonb) from public;
revoke all on function public.schluessel_loeschen(uuid) from public;
revoke all on function public.schluessel_entnehmen(uuid, text, text, text, timestamptz) from public;
revoke all on function public.schluessel_zurueckgeben(uuid, text) from public;
revoke all on function public.bestand_importieren(jsonb, boolean, text) from public;

grant execute on function public.schluessel_anlegen(jsonb) to authenticated;
grant execute on function public.schluessel_aendern(uuid, jsonb) to authenticated;
grant execute on function public.schluessel_loeschen(uuid) to authenticated;
grant execute on function public.schluessel_entnehmen(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.schluessel_zurueckgeben(uuid, text) to authenticated;
grant execute on function public.bestand_importieren(jsonb, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 7) Realtime idempotent sicherstellen
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.keys;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.key_events;
  exception when duplicate_object then null;
  end;
end
$$;

alter table public.keys replica identity full;
