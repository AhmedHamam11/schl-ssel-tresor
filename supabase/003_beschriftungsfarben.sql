-- ============================================================
-- Schluessel Tresor - Migration 003
-- Optionale Beschriftungsfarbe (ohne erzwungenes Standard-Grau)
--
-- Fuer mehrere Anhaenger und den sicheren Verlauf danach unbedingt
-- auch Migration 004 ausfuehren.
-- ============================================================

alter table public.keys
  add column if not exists beschriftung_farbe text;

alter table public.keys alter column beschriftung_farbe drop default;
alter table public.keys alter column beschriftung_farbe drop not null;
alter table public.keys drop constraint if exists keys_beschriftung_farbe_check;
alter table public.keys
  add constraint keys_beschriftung_farbe_check
  check (
    beschriftung_farbe is null or
    beschriftung_farbe in ('Blau', 'Rot', 'Grau', 'Weiß', 'Violett', 'Orange', 'Schwarz', 'Gelb', 'Grün')
  );

drop index if exists public.keys_beschriftung_farbe_idx;
create index keys_beschriftung_farbe_idx
  on public.keys (beschriftung_farbe)
  where beschriftung_farbe is not null;

create or replace function public.farb_statistik(von_position integer, bis_position integer)
returns table (farbe text, anzahl bigint)
language sql stable
as $$
  select beschriftung_farbe as farbe, count(*) as anzahl
  from public.keys
  where position >= von_position
    and position <= bis_position
    and beschriftung_farbe is not null
  group by beschriftung_farbe
  order by farbe;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.keys;
  exception when duplicate_object then null;
  end;
end
$$;
