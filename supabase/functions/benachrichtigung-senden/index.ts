// ============================================================
// Schluessel Tresor - Edge Function "benachrichtigung-senden"
//
// Wird von einem Supabase Database Webhook aufgerufen, sobald in
// public.key_events ein neuer Verlaufseintrag entsteht.
//
// WICHTIG: Diese Funktion liest ausschliesslich die Felder des
// Verlaufseintrags aus key_events. Es findet KEIN Nachschlagen in
// public.keys statt. Dadurch ist die E-Mail auch dann vollstaendig,
// wenn der Schluessel bereits geloescht wurde - beim Loeschen
// existiert die Zeile in public.keys zum Zeitpunkt des Webhooks
// naemlich nicht mehr.
//
// Ablauf:
//   1. Webhook-Geheimnis pruefen
//   2. Verlaufseintrag auf Vollstaendigkeit pruefen
//   3. Einstellungen laden (ist diese Aktion aktiviert?)
//   4. Idempotenz sichern: Sperreintrag in notification_log
//   5. Aktive Empfaenger laden
//   6. E-Mail ueber Resend versenden
//   7. Ergebnis im Protokoll festhalten
//
// Eine fehlgeschlagene E-Mail wird protokolliert, aber niemals als
// Fehler an die Datenbank zurueckgemeldet. Die Schluesselaktion
// bleibt dadurch in jedem Fall bestehen.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ABSENDER = Deno.env.get("MAIL_ABSENDER") ?? "Schluessel Tresor <tresor@example.de>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://schluessel-tresor.vercel.app";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

/**
 * Genau die Spalten der Tabelle public.key_events.
 * Alles, was in der E-Mail steht, stammt aus diesem Datensatz.
 */
interface Verlaufseintrag {
  id: string;
  key_id: string | null;
  position: number;
  schluesselnummer: string;
  beschriftung: string;
  anlage: string;
  anhaenger?: { text?: string; farbe?: string | null }[];
  aktion: string;
  benutzer_id: string | null;
  benutzer_name: string;
  standort: string | null;
  verwendungszweck: string | null;
  dauer_sekunden: number | null;
  zeitpunkt: string;
}

/** Aktionen, fuer die ueberhaupt benachrichtigt wird. */
const AKTIONEN: Record<string, { text: string; einstellung: string; farbe: string }> = {
  entnommen: { text: "Schl\u00fcssel entnommen", einstellung: "bei_entnahme", farbe: "#c8362f" },
  zurueckgegeben: { text: "Schl\u00fcssel zur\u00fcckgegeben", einstellung: "bei_rueckgabe", farbe: "#1e9e5a" },
  angelegt: { text: "Neuer Schl\u00fcssel hinzugef\u00fcgt", einstellung: "bei_neuem_schluessel", farbe: "#1d4e89" },
  geloescht: { text: "Schl\u00fcssel gel\u00f6scht", einstellung: "bei_loeschung", farbe: "#6b7280" },
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function datumZeit(wert: string): string {
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dauerText(sekunden: number | null): string | null {
  if (sekunden === null || sekunden === undefined) return null;
  const s = Math.max(0, Math.floor(sekunden));
  const tage = Math.floor(s / 86400);
  const stunden = Math.floor((s % 86400) / 3600);
  const minuten = Math.floor((s % 3600) / 60);
  const teile: string[] = [];
  if (tage > 0) teile.push(`${tage} ${tage === 1 ? "Tag" : "Tage"}`);
  if (stunden > 0) teile.push(`${stunden} Std.`);
  if (teile.length === 0 || minuten > 0) teile.push(`${minuten} Min.`);
  return teile.join(" ");
}

function maskieren(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Baut Betreff, HTML- und Textfassung der Nachricht. Alles auf Deutsch.
 * Verwendet ausschliesslich Felder aus dem Verlaufseintrag.
 */
function nachrichtBauen(e: Verlaufseintrag) {
  const daten = AKTIONEN[e.aktion];
  const betreff = `${daten.text} \u2013 Position ${e.position}`;
  const anhaengerTexte = Array.isArray(e.anhaenger)
    ? e.anhaenger.map((a) => String(a?.text ?? "").trim()).filter(Boolean)
    : [];
  const bezeichnung =
    anhaengerTexte.join(", ") || e.beschriftung || e.schluesselnummer || "Ohne Beschriftung";

  const zeilen: [string, string][] = [
    ["Aktion", daten.text],
    ["Schl\u00fcsselbeschriftung", bezeichnung],
    ["Schl\u00fcsselnummer", e.schluesselnummer || "\u2014"],
    ["Schl\u00fcsselposition", `Platz ${e.position}`],
    ["Anlage/Zugeh\u00f6rigkeit", e.anlage || "\u2014"],
    ["Durchgef\u00fchrt von", e.benutzer_name || "\u2014"],
    ["Datum und Uhrzeit", datumZeit(e.zeitpunkt)],
  ];

  // Bei einer Entnahme ist der Besitzer die Person, die im
  // Entnahmeformular eingetragen wurde. Genau dieser Name steht in
  // benutzer_name des Verlaufseintrags - kein Zugriff auf keys noetig.
  if (e.aktion === "entnommen" && e.benutzer_name) {
    zeilen.push(["Aktueller Besitzer", e.benutzer_name]);
  }
  if (e.standort) {
    zeilen.push(["Aktueller Standort", e.standort]);
  }
  if (e.verwendungszweck) {
    zeilen.push(["Verwendungszweck", e.verwendungszweck]);
  }
  const dauer = dauerText(e.dauer_sekunden);
  if (e.aktion === "zurueckgegeben" && dauer) {
    zeilen.push(["Dauer au\u00dferhalb", dauer]);
  }
  if (e.aktion === "geloescht") {
    zeilen.push([
      "Hinweis",
      "Der Schl\u00fcssel wurde dauerhaft aus dem Tresor entfernt. Der Verlaufseintrag bleibt erhalten.",
    ]);
  }

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Inter,'Segoe UI',system-ui,sans-serif;color:#1f2733;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:${daten.farbe};padding:16px 24px;">
          <div style="color:#ffffff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Schl&uuml;ssel Tresor</div>
          <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:2px;">${maskieren(daten.text)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <div style="font-size:15px;font-weight:600;">${maskieren(bezeichnung)}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">Platz ${e.position}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:20px;border-collapse:collapse;font-size:14px;">
            ${zeilen
              .map(
                ([bezeichner, wert]) =>
                  `<tr><td style="padding:7px 0;color:#6b7280;width:45%;vertical-align:top;">${maskieren(
                    bezeichner,
                  )}</td><td style="padding:7px 0;font-weight:600;vertical-align:top;">${maskieren(
                    wert,
                  )}</td></tr>`,
              )
              .join("")}
          </table>
          <a href="${APP_URL}/tresor" style="display:inline-block;margin-top:22px;background:#1d4e89;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">Zum Schl&uuml;ssel Tresor</a>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px;background:#f4f5f7;border-top:1px solid #e2e5ea;font-size:12px;color:#6b7280;">
          Diese Nachricht wurde automatisch vom Schl&uuml;ssel Tresor erstellt.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    daten.text,
    "",
    ...zeilen.map(([bezeichner, wert]) => `${bezeichner}: ${wert}`),
    "",
    `Zum Schl\u00fcssel Tresor: ${APP_URL}/tresor`,
    "",
    "Diese Nachricht wurde automatisch vom Schl\u00fcssel Tresor erstellt.",
  ].join("\n");

  return { betreff, html, text };
}

/** Schreibt das Ergebnis in das Protokoll, ohne den Ablauf zu unterbrechen. */
async function protokollieren(
  eventId: string,
  aktion: string,
  status: "erfolgreich" | "fehlgeschlagen" | "uebersprungen",
  felder: { empfaenger?: string[]; fehlermeldung?: string; resendId?: string | null } = {},
) {
  try {
    await supabase.from("notification_log").upsert(
      {
        event_id: eventId,
        aktion,
        status,
        empfaenger: felder.empfaenger ?? [],
        empfaenger_anzahl: felder.empfaenger?.length ?? 0,
        fehlermeldung: felder.fehlermeldung ?? null,
        resend_id: felder.resendId ?? null,
        zeitpunkt: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );
  } catch {
    // Ein Protokollfehler darf den Ablauf nicht stoppen.
  }
}

function antwortJson(inhalt: unknown, status = 200): Response {
  return new Response(JSON.stringify(inhalt), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (anfrage) => {
  // --- Schritt 1: Webhook-Geheimnis pruefen -----------------
  if (WEBHOOK_SECRET) {
    if (anfrage.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
      return antwortJson({ fehler: "Zugriff verweigert." }, 401);
    }
  }

  let nutzlast: { type?: string; record?: Verlaufseintrag; test?: boolean; an?: string };
  try {
    nutzlast = await anfrage.json();
  } catch {
    return antwortJson({ fehler: "Ung\u00fcltige Anfrage." }, 400);
  }

  // --- Sonderfall: Test-E-Mail aus der Admin-Oberflaeche ----
  if (nutzlast.test === true) {
    const empfaenger = nutzlast.an;
    if (!empfaenger || !empfaenger.includes("@")) {
      return antwortJson({ fehler: "Bitte geben Sie eine g\u00fcltige E-Mail-Adresse an." }, 400);
    }
    const beispiel: Verlaufseintrag = {
      id: "test",
      key_id: null,
      position: 118,
      schluesselnummer: "S-1180",
      beschriftung: "Testschl\u00fcssel Haupteingang",
      anlage: "Verwaltung Hauptgeb\u00e4ude",
      aktion: "zurueckgegeben",
      benutzer_id: null,
      benutzer_name: "Testlauf aus den Einstellungen",
      standort: "Umspannwerk Nord",
      verwendungszweck: null,
      dauer_sekunden: 9000,
      zeitpunkt: new Date().toISOString(),
    };
    const { betreff, html, text } = nachrichtBauen(beispiel);
    const antwort = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ABSENDER,
        to: [empfaenger],
        subject: `[Test] ${betreff}`,
        html,
        text,
      }),
    });
    if (!antwort.ok) {
      const fehlertext = await antwort.text();
      return antwortJson({ fehler: `Resend meldet: ${fehlertext.slice(0, 300)}` }, 502);
    }
    return antwortJson({ erfolg: true, an: empfaenger });
  }

  // --- Schritt 2: Verlaufseintrag pruefen -------------------
  // Es werden nur vollstaendige, gueltige Eintraege verschickt.
  const e = nutzlast.record;
  if (
    !e ||
    typeof e.id !== "string" ||
    e.id.length === 0 ||
    typeof e.position !== "number" ||
    !Number.isFinite(e.position) ||
    typeof e.aktion !== "string" ||
    !e.zeitpunkt
  ) {
    return antwortJson({ uebersprungen: "Unvollst\u00e4ndiger Verlaufseintrag." });
  }

  // Ohne jede Bezeichnung waere die E-Mail nicht aussagekraeftig.
  if (!String(e.beschriftung ?? "").trim() && !String(e.schluesselnummer ?? "").trim()) {
    return antwortJson({ uebersprungen: "Verlaufseintrag ohne Beschriftung und Schl\u00fcsselnummer." });
  }

  const aktionsDaten = AKTIONEN[e.aktion];
  if (!aktionsDaten) {
    // z. B. "importiert" oder "geaendert": bewusst keine E-Mail.
    return antwortJson({ uebersprungen: `Aktion ${e.aktion} l\u00f6st keine E-Mail aus.` });
  }

  try {
    // --- Schritt 3: Einstellungen laden ---------------------
    const { data: einstellungen } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const aktiviert = einstellungen
      ? (einstellungen as Record<string, unknown>)[aktionsDaten.einstellung] !== false
      : true;

    if (!aktiviert) {
      await protokollieren(e.id, e.aktion, "uebersprungen", {
        fehlermeldung: "Benachrichtigung f\u00fcr diese Aktion ist deaktiviert.",
      });
      return antwortJson({ uebersprungen: "Deaktiviert." });
    }

    // --- Schritt 4: Idempotenz ------------------------------
    // Der Sperreintrag wird VOR dem Versand geschrieben. Schlaegt er
    // wegen der eindeutigen event_id fehl, wurde dieser Verlaufseintrag
    // bereits verarbeitet und es entsteht keine zweite E-Mail.
    const { error: sperrfehler } = await supabase.from("notification_log").insert({
      event_id: e.id,
      aktion: e.aktion,
      status: "uebersprungen",
      fehlermeldung: "Versand l\u00e4uft \u2026",
    });

    if (sperrfehler) {
      return antwortJson({
        uebersprungen: "F\u00fcr diesen Verlaufseintrag wurde bereits benachrichtigt.",
      });
    }

    // --- Schritt 5: Aktive Empfaenger laden -----------------
    const { data: empfaengerListe, error: empfaengerFehler } = await supabase.rpc(
      "aktive_empfaenger",
    );

    if (empfaengerFehler) {
      throw new Error(`Empf\u00e4nger konnten nicht geladen werden: ${empfaengerFehler.message}`);
    }

    const adressen: string[] = ((empfaengerListe ?? []) as { email: string }[])
      .map((p) => p.email)
      .filter((adresse) => Boolean(adresse) && adresse.includes("@"));

    if (adressen.length === 0) {
      await protokollieren(e.id, e.aktion, "uebersprungen", {
        fehlermeldung: "Kein aktiver Benutzer mit hinterlegter E-Mail-Adresse vorhanden.",
      });
      return antwortJson({ uebersprungen: "Keine Empf\u00e4nger." });
    }

    // --- Schritt 6: Versand ueber Resend --------------------
    const { betreff, html, text } = nachrichtBauen(e);

    const antwort = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        // Zweite Absicherung gegen Doppelversand direkt bei Resend.
        "Idempotency-Key": e.id,
      },
      body: JSON.stringify({
        from: ABSENDER,
        to: [ABSENDER],
        bcc: adressen,
        subject: betreff,
        html,
        text,
      }),
    });

    if (!antwort.ok) {
      const fehlertext = await antwort.text();
      throw new Error(`Resend antwortete mit ${antwort.status}: ${fehlertext.slice(0, 300)}`);
    }

    const ergebnis = await antwort.json().catch(() => ({} as { id?: string }));

    // --- Schritt 7: Erfolg protokollieren -------------------
    await protokollieren(e.id, e.aktion, "erfolgreich", {
      empfaenger: adressen,
      resendId: ergebnis?.id ?? null,
    });

    return antwortJson({ erfolg: true, empfaenger: adressen.length });
  } catch (fehler) {
    const meldung = fehler instanceof Error ? fehler.message : "Unbekannter Fehler";
    await protokollieren(e.id, e.aktion, "fehlgeschlagen", { fehlermeldung: meldung });

    // Bewusst Status 200: Der Webhook soll die Schluesselaktion nicht
    // beeinflussen und keine Wiederholungsschleife ausloesen.
    return antwortJson({ erfolg: false, fehler: meldung }, 200);
  }
});
