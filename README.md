# Schlüssel Tresor

Interne Web-Anwendung zur digitalen Abbildung des Schlüsseltresors mit den Plätzen **1 bis 500**.
Die gesamte Benutzeroberfläche ist vollständig deutschsprachig.

**Technik:** Next.js 14 (App Router) · TypeScript · Supabase (Datenbank, Anmeldung, Echtzeit) ·
Tailwind CSS · XLSX-Import und -Export · Bereitstellung über Vercel.

---

## 1. Funktionen im Überblick

| Seite | Adresse | Zweck |
|---|---|---|
| Anmeldung | `/anmeldung` | Anmeldung mit E-Mail-Adresse und Passwort |
| Übersicht | `/uebersicht` | Kennzahlen, zuletzt entnommen und zurückgegeben |
| Digitaler Schlüsseltresor | `/tresor` | Plätze 1–500 in Bereichen zu je 50 |
| Schlüsselliste | `/schluesselliste` | Suche, Filter, Tabellen- und Kartenansicht |
| Verlauf | `/verlauf` | Änderungsverlauf, neueste zuerst |
| Excel-Import | `/import` | Bestandsliste importieren (nur Administrator) |
| Excel-Export | `/export` | Vier Exportvarianten |
| Benutzerverwaltung | `/benutzer` | Konten und Rollen (nur Administrator) |

**Statusfarben:** Grün = verfügbar · Gelb = teilweise verfügbar · Rot = entnommen ·
Grau = kein Schlüssel zugeordnet.

Ein Platz kann beliebig viele Einzelschlüssel und Schlüsselbunde enthalten. Jeder Eintrag wird
unabhängig entnommen und zurückgegeben.

### Manuelle Schlüsselverwaltung durch Administratoren

Administratoren sehen auf den Seiten **Digitaler Schlüsseltresor** und **Schlüsselliste** die
Schaltfläche „Schlüssel hinzufügen“. Damit lässt sich ein Tresorplatz (1–500) wählen und ein
Einzelschlüssel oder Schlüsselbund mit Schlüsselnummer, Anlage/Zugehörigkeit, Beschriftung,
Anhängerfarbe, Art und Schlüsselanzahl sowie Kommentar anlegen. Jeder Schlüsseleintrag zeigt
Administratoren zusätzlich „Bearbeiten“ und „Löschen“. Vor dem Löschen erscheint ein
Bestätigungsdialog mit Platznummer und Beschriftung. Anlage, Änderung und Löschung werden mit
Administratorname und Zeitpunkt im Verlauf gespeichert (`angelegt`, `geaendert`, `geloescht`).
Mitarbeiter sehen diese Schaltflächen nicht und können ausschließlich Schlüssel entnehmen und
zurückgeben – das wird zusätzlich serverseitig über Row Level Security und einen Datenbanktrigger
erzwungen, nicht nur durch ausgeblendete Schaltflächen in der Oberfläche.

---

## 2. Datenbankstruktur

**`profiles`** – Benutzerprofile
`id`, `name`, `email`, `rolle` (`admin` | `mitarbeiter`), `aktiv`, `erstellt_am`

**`keys`** – Schlüssel und Schlüsselbunde
`id`, `position` (1–500), `schluesselnummer`, `anlage`, `beschriftung`, `farbe`, `ist_bund`,
`schluesselanzahl`, `kommentar`, `status`, `besitzer_id`, `besitzer_name`, `standort`,
`verwendungszweck`, `entnommen_am`, `rueckgabe_geplant`, `zuletzt_zurueck_am`,
`letzte_aenderung_durch`, `erstellt_am`, `geaendert_am`

**`key_events`** – Änderungsverlauf (nur Anfügen)
`id`, `key_id`, `position`, `schluesselnummer`, `beschriftung`, `aktion`, `benutzer_id`,
`benutzer_name`, `standort`, `verwendungszweck`, `dauer_sekunden`, `zeitpunkt`

Für `key_events` bestehen bewusst **keine** UPDATE- und DELETE-Regeln. Alte Einträge können dadurch
weder geändert noch gelöscht werden.

---

## 3. Anleitung: Verbindung mit Supabase

1. Auf <https://supabase.com> anmelden und ein neues Projekt anlegen (Region: Frankfurt/EU).
2. Im Projekt **SQL Editor** öffnen, den Inhalt von `supabase/schema.sql` vollständig einfügen und
   **Run** klicken. Optional anschließend `supabase/beispieldaten.sql` ausführen.
3. Unter **Authentication → Providers → Email** sicherstellen, dass „Email" aktiv ist.
   Empfehlung für eine interne App: **Enable email confirmations** deaktivieren und
   **Allow new users to sign up** deaktivieren – Konten legt ausschließlich ein Administrator an.
4. Unter **Settings → API** die folgenden Werte kopieren:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig, niemals veröffentlichen)
5. Datei `.env.example` nach `.env.local` kopieren und die Werte eintragen.
6. Ersten Administrator anlegen: unter **Authentication → Users → Add user** ein Konto erstellen,
   danach im SQL Editor ausführen:
   ```sql
   update public.profiles set rolle = 'admin' where email = 'ihre.adresse@firma.de';
   ```
7. Echtzeit prüfen: unter **Database → Replication** müssen die Tabellen `keys` und `key_events`
   in der Publikation `supabase_realtime` enthalten sein. Das Skript erledigt das bereits.

### Lokal starten

```bash
npm install
npm run dev
```

Die Anwendung läuft danach unter <http://localhost:3000>.

---

## 4. Anleitung: Hochladen auf GitHub

Zuerst auf <https://github.com/new> ein neues Repository anlegen – am besten als **Private**.

```bash
cd schluessel-tresor
git init
git add .
git commit -m "Schluessel Tresor: erste Version"
git branch -M main
git remote add origin https://github.com/IHR-KONTO/schluessel-tresor.git
git push -u origin main
```

Die Datei `.gitignore` sorgt dafür, dass `.env.local` und der Ordner der Abhängigkeiten nicht
hochgeladen werden.

---

## 5. Anleitung: Bereitstellung auf Vercel

1. Auf <https://vercel.com> mit dem GitHub-Konto anmelden.
2. **Add New → Project** wählen und das Repository `schluessel-tresor` importieren.
3. Das Framework wird automatisch als **Next.js** erkannt. Build-Einstellungen unverändert lassen.
4. Unter **Environment Variables** eintragen (für Production, Preview und Development):

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL aus Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

5. **Deploy** klicken. Nach etwa zwei Minuten ist die Anwendung erreichbar.
6. In Supabase unter **Authentication → URL Configuration** die Vercel-Adresse als **Site URL**
   eintragen.

Jeder weitere Push auf `main` löst automatisch eine neue Bereitstellung aus.

---

## 6. Excel-Import

Erwartete Spaltenüberschriften in der ersten Zeile des ersten Tabellenblatts:

`Schlüssel Position` · `Schlüsselnummer/n` · `Anlage/Zugehörigkeit` ·
`Beschriftung Schlüsselanhänger` · `Farbe Schlüsselanhänger` · `Schlüsselbund?` ·
`Schlüsselanzahl` · `Kommentar`

- Mehrere Zeilen dürfen dieselbe Schlüsselposition verwenden.
- `Schlüsselbund?` erkennt `Ja`, `J`, `X`, `Wahr`, `1` als Schlüsselbund.
- Vor dem Import erscheint eine Vorschau mit Prüfergebnis je Zeile.
- Zwei Importarten: **Bestand ergänzen** oder **Bestand ersetzen**.
- Eine passende Vorlage lässt sich auf der Importseite herunterladen.

## 7. Excel-Export

Vier Varianten: gesamter Bestand, nur verfügbare Schlüssel, nur entnommene Schlüssel,
Änderungsverlauf. Die Exportdateien enthalten alle Bestandsspalten sowie Status, Aktueller Besitzer,
Aktueller Standort, Entnommen am, Rückgabe geplant, Dauer außerhalb, Zuletzt zurückgegeben und
Letzte Änderung durch. Alle Spaltenüberschriften sind deutschsprachig.

---

## 8. Hinweise zum Betrieb

- Der `service_role`-Schlüssel wird ausschließlich in `src/app/api/benutzer/route.ts` auf dem Server
  verwendet und gelangt nie in den Browser.
- Der Zugriffsschutz erfolgt über Row Level Security in Supabase, nicht nur in der Oberfläche.
- Die Anwendung ist für Computer, Tablet und Smartphone ausgelegt.

## E-Mail-Benachrichtigungen einrichten

Alle aktiven Benutzer werden automatisch auf Deutsch informiert, wenn ein Schlüssel
entnommen, zurückgegeben, hinzugefügt oder gelöscht wird.

### 1. Migration ausführen
`supabase/002_benachrichtigungen.sql` im Supabase SQL-Editor vollständig ausführen.
Sie legt an:
- Spalte `anlage` in `key_events` (damit E-Mails auch nach dem Löschen vollständig sind)
- Tabelle `notification_settings` (die vier Schalter, nur Administratoren dürfen ändern)
- Tabelle `notification_log` (Versandprotokoll, `event_id` eindeutig = Schutz vor Doppelversand)
- Funktion `aktive_empfaenger()`

### 2. Edge Function veröffentlichen
```
supabase functions deploy benachrichtigung-senden --no-verify-jwt
```
Die Funktion liegt unter `supabase/functions/benachrichtigung-senden/index.ts`.
Sie liest **ausschließlich** den Verlaufseintrag aus `key_events` und greift nie auf
`keys` zu. Dadurch bleibt die E-Mail auch dann vollständig, wenn der Schlüssel im
selben Moment gelöscht wurde.

### 3. Secrets setzen
```
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set MAIL_ABSENDER="Schlüssel Tresor <tresor@ihre-domain.de>"
supabase secrets set APP_URL=https://ihre-app-adresse
supabase secrets set WEBHOOK_SECRET=ein-langes-zufaelliges-geheimnis
```
Der Resend-Schlüssel steht nur als Secret in Supabase, niemals im Quelltext oder im Browser.

### 4. Database Webhook anlegen
Supabase → Database → Webhooks → Create a new hook
- Name: `benachrichtigung_key_events`
- Table: `public.key_events`, Events: **Insert**
- Type: Supabase Edge Functions → `benachrichtigung-senden`, Methode POST, Timeout 5000 ms
- HTTP Header: `x-webhook-secret` = derselbe Wert wie `WEBHOOK_SECRET`

### 5. In der App
Administratoren finden in der Navigation den Punkt **E-Mail-Benachrichtigungen**.
Dort lassen sich die vier Ereignisse einzeln ein- und ausschalten, eine Test-E-Mail
senden und die letzten Versandvorgänge einsehen.
Für die Test-E-Mail muss `WEBHOOK_SECRET` zusätzlich in `.env.local` der Web-App stehen.

### Verhalten
- Die Schlüsselaktion wird immer zuerst in der Datenbank gespeichert. Scheitert der
  E-Mail-Versand, bleibt die Aktion bestehen und wird nur im Protokoll als
  fehlgeschlagen vermerkt.
- Pro Verlaufseintrag entsteht höchstens eine E-Mail: Der Sperreintrag in
  `notification_log` wird vor dem Versand geschrieben, zusätzlich sendet die Funktion
  die Event-ID als `Idempotency-Key` an Resend.
- Import und Bearbeitung lösen bewusst keine E-Mail aus.

## Beschriftungsfarben und Farb-Statistik

Ab Migration 003 verfügt jeder Schlüssel über eine **Beschriftungsfarbe**
(Blau, Rot, Grau, Weiß, Violett, Orange, Schwarz, Gelb, Grün).

### Wo wird die Farbe festgelegt?
- **Beim Anlegen/Bearbeiten** eines Schlüssels: Administratoren wählen die
  Beschriftungsfarbe im Dropdown aus. Ein farbiger Kreis zeigt die aktuelle Auswahl.
- **Beim Excel-Import**: Alle importierten Schlüssel erhalten vorerst "Grau" und
  können anschließend einzeln angepasst werden.

### Wo wird die Farbe angezeigt?
- **Schlüsselkarte**: Neben der Beschriftung erscheint ein farbiger Badge mit dem
  Farbnamen.
- **Tresor-Seite**: Für jeden Bereich (Tab 1–50, 51–100, usw.) wird oberhalb der
  Plätze eine Statistik eingeblendet: wie viele Schlüssel mit welcher Beschriftungsfarbe
  in diesem Bereich liegen. So sehen Sie auf einen Blick die Farbverteilung.

### Technische Umsetzung
- **Datenbank**: `beschriftung_farbe text not null default 'Grau'` mit CHECK-Constraint
- **Funktion**: `public.farb_statistik(von, bis)` liefert die Aggregation
- **Frontend**: Echtzeit-Berechnung pro Bereich mit `useEffect`
