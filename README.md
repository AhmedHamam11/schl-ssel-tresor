# Schlüssel Tresor

Interne deutschsprachige Web-Anwendung zur digitalen Abbildung eines realen Schlüsseltresors mit den Plätzen **1 bis 500**.

**Technik:** Next.js 14 · TypeScript · Supabase (Datenbank, Anmeldung, Echtzeit) · Tailwind CSS · Excel-Import/-Export · Vercel.

## Hauptfunktionen

- Anmeldung für jedes Teammitglied mit eigenem Namen.
- Echtzeit-Ansicht der Plätze 1–500.
- Mehrere Schlüssel oder Schlüsselbunde am selben Platz.
- Ein Schlüsselbund kann **mehrere Anhänger** besitzen.
- Jeder Anhänger hat einen eigenen Text und optional eine eigene Farbe.
- Ohne Farbauswahl wird **keine Standardfarbe** angezeigt.
- Entnahme mit Person, Zielort, Verwendungszweck und optionaler geplanter Rückgabe.
- Rückgabe mit automatisch berechneter Dauer außerhalb des Tresors.
- Unveränderlicher Verlauf für Entnahme, Rückgabe, Anlage, Bearbeitung, Löschung und Import.
- Excel-Import und -Export.
- Administratoren können Schlüssel anlegen, bearbeiten, löschen und Benutzer verwalten.
- Änderungen erscheinen in Echtzeit bei allen angemeldeten Teammitgliedern.

## Seiten

| Seite | Adresse | Zweck |
|---|---|---|
| Anmeldung | `/anmeldung` | Anmeldung mit E-Mail und Passwort |
| Übersicht | `/uebersicht` | Kennzahlen und letzte Bewegungen |
| Schlüsseltresor | `/tresor` | Plätze 1–500, gruppiert in Bereiche zu je 50 |
| Schlüsselliste | `/schluesselliste` | Suche, Filter, Tabellen- und Kartenansicht |
| Verlauf | `/verlauf` | Alle protokollierten Aktionen |
| Excel-Import | `/import` | Bestand ergänzen oder vollständig ersetzen |
| Excel-Export | `/export` | Bestand und Verlauf exportieren |
| Benutzerverwaltung | `/benutzer` | Konten und Rollen verwalten |
| E-Mail-Benachrichtigungen | `/benachrichtigungen` | Versandregeln und Protokoll |

## Datenmodell

### `keys`

Ein Datensatz entspricht einem Einzelschlüssel oder Schlüsselbund:

- `position`: Platz 1–500
- `schluesselnummer`
- `anlage`
- `anhaenger`: JSON-Liste, z. B.
  ```json
  [
    { "text": "Tor Nord", "farbe": "Blau" },
    { "text": "Container 4", "farbe": "Gelb" },
    { "text": "Ersatz", "farbe": null }
  ]
  ```
- `ist_bund`
- `schluesselanzahl`
- `kommentar`
- Status- und Entnahmefelder

Die alten Felder `beschriftung`, `farbe` und `beschriftung_farbe` bleiben aus Kompatibilitätsgründen erhalten und entsprechen dem ersten Anhänger.

### `key_events`

Der Verlauf enthält eine Kopie der zum Ereignis gehörenden Schlüsseldaten einschließlich Anlage und Anhängern. Alte Verlaufseinträge können nicht bearbeitet oder gelöscht werden.

## Wichtige Verbesserung des Verlaufs

Entnahme, Rückgabe, Anlage, Bearbeitung, Löschung und Excel-Import laufen über Datenbankfunktionen. Bestand und Verlauf werden in **derselben Transaktion** gespeichert. Dadurch werden typische Fehler verhindert:

- kein Verlaufseintrag, obwohl die Aktion fehlgeschlagen ist;
- erfolgreiche Aktion ohne Verlaufseintrag;
- doppelte Entnahme oder Rückgabe durch gleichzeitige Klicks;
- gelöschter Bestand bei einem fehlgeschlagenen Ersetzen-Import;
- fehlende Anlage oder Anhänger im Verlauf nach einer Löschung.

## Bestehende Installation aktualisieren

1. Alle Dateien dieses Pakets in das GitHub-Repository übernehmen und die vorhandenen Dateien ersetzen.
2. Supabase öffnen → **SQL Editor**.
3. Den vollständigen Inhalt von
   `supabase/004_anhaenger_und_sicherer_verlauf.sql`
   einfügen und **Run** klicken.
4. Warten, bis Vercel den neuen GitHub-Stand als **Ready / Production** bereitgestellt hat.
5. Die Website öffnen und mit `Strg + F5` neu laden.

Migration 004 entfernt das automatische Standard-Grau, übernimmt bestehende Beschriftungen und Farben soweit möglich und legt die sicheren Datenbankfunktionen an.

## Neue Supabase-Installation

Im SQL Editor in dieser Reihenfolge ausführen:

1. `supabase/schema.sql`
2. `supabase/002_benachrichtigungen.sql` – nur wenn E-Mail-Benachrichtigungen genutzt werden
3. `supabase/004_anhaenger_und_sicherer_verlauf.sql`
4. optional `supabase/beispieldaten.sql`

Danach unter **Authentication → Users** den ersten Benutzer anlegen und im SQL Editor zum Administrator machen:

```sql
update public.profiles
set rolle = 'admin'
where email = 'ihre.adresse@firma.de';
```

## Umgebungsvariablen

In `.env.local` und in Vercel eintragen:

| Name | Wert |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL, ohne `/rest/v1/` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, nur serverseitig |

Der Service-Role-Key darf niemals in Browser-Code oder öffentlich sichtbare Dateien gelangen.

## Lokal starten

```bash
npm install
npm run dev
```

Produktionsprüfung:

```bash
npm run build
```

## Excel-Import

Empfohlene Spalten:

- `Schlüssel Position`
- `Schlüsselnummer/n`
- `Anlage/Zugehörigkeit`
- `Anhänger (Text|Farbe; ...)`
- `Schlüsselbund?`
- `Schlüsselanzahl`
- `Kommentar`

Mehrere Anhänger werden in derselben Zelle mit Semikolon getrennt:

```text
Tor Nord|Blau; Container 4|Gelb; Ersatz
```

`Ersatz` besitzt in diesem Beispiel bewusst keine Farbe. Die alten Spalten `Beschriftung Schlüsselanhänger` und `Farbe Schlüsselanhänger` werden weiterhin erkannt.

Beim Modus **Bestand vollständig ersetzen** werden Löschen und Einfügen gemeinsam in einer Datenbanktransaktion ausgeführt. Bei einem Fehler bleibt der bisherige Bestand bestehen.

## E-Mail-Benachrichtigungen

Die bestehende Edge Function liegt unter:

`supabase/functions/benachrichtigung-senden/index.ts`

Der Ordner `supabase/functions` ist bewusst aus der Next.js-TypeScript-Prüfung ausgeschlossen, da die Edge Function Deno und URL-Imports verwendet. Dadurch verhindert sie keinen Vercel-Build.

Erforderliche Supabase-Secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set MAIL_ABSENDER="Schlüssel Tresor <tresor@ihre-domain.de>"
supabase secrets set APP_URL=https://ihre-app-adresse
supabase secrets set WEBHOOK_SECRET=ein-langes-zufaelliges-geheimnis
```

## Hinweise

- Next.js wurde auf die gepatchte 14.2.x-Version aktualisiert.
- Realtime-Tabellen werden idempotent hinzugefügt; ein erneutes Ausführen der Migration erzeugt keinen „already member of publication“-Fehler.
- Administratorrechte werden zusätzlich in der Datenbank geprüft, nicht nur über ausgeblendete Schaltflächen.
