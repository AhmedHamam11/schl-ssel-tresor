-- Optionale Beispieldaten zum Testen (als Administrator ausfuehren).
insert into public.keys (position, schluesselnummer, anlage, beschriftung, farbe, ist_bund, schluesselanzahl, kommentar)
values
  (1,  'S-1001', 'Verwaltung Hauptgebaeude', 'Haupteingang',        'Blau',  false, 1, ''),
  (1,  'S-1002', 'Verwaltung Hauptgebaeude', 'Serverraum',          'Rot',   false, 1, 'Nur IT'),
  (2,  'B-2001', 'Umspannwerk Nord',         'Bund Umspannwerk',    'Gelb',  true,  6, ''),
  (7,  'S-1050', 'Werkstatt',                'Werkzeugausgabe',     'Gruen', false, 1, ''),
  (51, 'B-3001', 'Heizkraftwerk Sued',       'Bund Kesselhaus',     'Rot',   true,  4, 'Schwerer Bund'),
  (52, 'S-1210', 'Fuhrpark',                 'Tor Fuhrpark',        'Schwarz', false, 2, '');
