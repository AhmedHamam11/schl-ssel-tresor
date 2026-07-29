-- ============================================================
-- Schluessel Tresor - Migration 003
-- Beschriftungsfarben und Statistik
--
-- Diese Datei im Supabase SQL-Editor vollstaendig ausfuehren.
-- Sie ist wiederholbar (idempotent) und veraendert keine
-- bestehenden Daten.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Neue Spalte fuer die Farbe der Beschriftung
-- ------------------------------------------------------------
alter table public.keys
  add column if not exists beschriftung_farbe text not null default 'Grau'
    check (beschriftung_farbe in ('Blau', 'Rot', 'Grau', 'Weiß', 'Violett', 'Orange', 'Schwarz', 'Gelb', 'Grün'));

-- Index fuer schnelle Farb-Aggregationen
create index if not exists keys_beschriftung_farbe_idx
  on public.keys (beschriftung_farbe);

-- ------------------------------------------------------------
-- 2) Hilfsfunktion: Farb-Statistik fuer einen Platzbereich
--    Liefert pro Farbe die Anzahl der Schluessel, deren
--    Position im angegebenen Bereich liegt.
-- ------------------------------------------------------------
create or replace function public.farb_statistik(von_position integer, bis_position integer)
returns table (farbe text, anzahl bigint)
language sql stable
as $$
  select beschriftung_farbe as farbe, count(*) as anzahl
  from   public.keys
  where  position >= von_position
    and  position <= bis_position
  group by beschriftung_farbe
  order by farbe;
$$;

-- ------------------------------------------------------------
-- 3) Echtzeit fuer Schluessel mit Farbe (bereits aktiviert,
--    aber wir stellen sicher)
-- ------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.keys;
  exception when duplicate_object then
    null;
  end;
end
$$;
