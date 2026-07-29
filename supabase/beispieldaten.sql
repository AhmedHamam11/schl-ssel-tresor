-- Optionale Beispieldaten zum Testen (als Administrator ausfuehren).
insert into public.keys (
  position, schluesselnummer, anlage, beschriftung, farbe,
  beschriftung_farbe, anhaenger, ist_bund, schluesselanzahl, kommentar
)
values
  (1, 'S-1001', 'Verwaltung Hauptgebäude', 'Haupteingang', 'Blau', 'Blau',
   '[{"text":"Haupteingang","farbe":"Blau"}]'::jsonb, false, 1, ''),
  (1, 'S-1002', 'Verwaltung Hauptgebäude', 'Serverraum', 'Rot', 'Rot',
   '[{"text":"Serverraum","farbe":"Rot"}]'::jsonb, false, 1, 'Nur IT'),
  (2, 'B-2001', 'Umspannwerk Nord', 'Bund Umspannwerk', 'Gelb', 'Gelb',
   '[{"text":"Bund Umspannwerk","farbe":"Gelb"},{"text":"Tor Nord","farbe":"Grün"},{"text":"Ersatz"}]'::jsonb,
   true, 6, ''),
  (7, 'S-1050', 'Werkstatt', 'Werkzeugausgabe', 'Grün', 'Grün',
   '[{"text":"Werkzeugausgabe","farbe":"Grün"}]'::jsonb, false, 1, ''),
  (51, 'B-3001', 'Heizkraftwerk Süd', 'Bund Kesselhaus', 'Rot', 'Rot',
   '[{"text":"Bund Kesselhaus","farbe":"Rot"}]'::jsonb, true, 4, 'Schwerer Bund'),
  (52, 'S-1210', 'Fuhrpark', 'Tor Fuhrpark', 'Schwarz', 'Schwarz',
   '[{"text":"Tor Fuhrpark","farbe":"Schwarz"}]'::jsonb, false, 2, '');
