export function datumZeit(wert: string | null | undefined): string {
  if (!wert) return "—";
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dauerText(sekunden: number | null | undefined): string {
  if (sekunden === null || sekunden === undefined) return "—";
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

export function dauerSeit(start: string | null | undefined): string {
  if (!start) return "—";
  const ms = Date.now() - new Date(start).getTime();
  return dauerText(Math.floor(ms / 1000));
}

export function statusText(status: string): string {
  if (status === "verfuegbar") return "Verfügbar";
  if (status === "entnommen") return "Entnommen";
  if (status === "teilweise") return "Teilweise verfügbar";
  return "Kein Schlüssel zugeordnet";
}

export function aktionText(aktion: string): string {
  const karte: Record<string, string> = {
    entnommen: "Entnommen",
    zurueckgegeben: "Zurückgegeben",
    importiert: "Importiert",
    angelegt: "Angelegt",
    geaendert: "Geändert",
    geloescht: "Gelöscht",
  };
  return karte[aktion] ?? aktion;
}

export function fehlerText(nachricht: string | undefined): string {
  const original = (nachricht ?? "").trim();
  const text = original.toLocaleLowerCase("de-DE");
  if (text.includes("invalid login")) return "E-Mail-Adresse oder Passwort ist falsch.";
  if (text.includes("email not confirmed")) return "Die E-Mail-Adresse wurde noch nicht bestätigt.";
  if (text.includes("user already registered")) return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
  if (text.includes("password")) return "Das Passwort erfüllt die Anforderungen nicht (mindestens 8 Zeichen).";
  if (text.includes("bereits entnommen"))
    return "Dieser Schlüssel wurde inzwischen bereits von einer anderen Person entnommen. Die Ansicht wurde aktualisiert.";
  if (text.includes("bereits zurückgegeben") || text.includes("bereits zurueckgegeben"))
    return "Dieser Schlüssel wurde inzwischen bereits zurückgegeben. Die Ansicht wurde aktualisiert.";
  if (text.includes("nicht gefunden")) return "Der Schlüssel wurde nicht gefunden oder inzwischen gelöscht.";
  if (text.includes("nur administratoren") || text.includes("row-level security") || text.includes("permission"))
    return "Für diese Aktion fehlt Ihnen die Administrator-Berechtigung.";
  if (
    text.includes("schluessel_anlegen") ||
    text.includes("schluessel_aendern") ||
    text.includes("schluessel_entnehmen") ||
    text.includes("schluessel_zurueckgeben") ||
    text.includes("bestand_importieren") ||
    (text.includes("column") && text.includes("anhaenger"))
  )
    return "Die neue Datenbank-Migration 004 wurde noch nicht ausgeführt. Öffnen Sie Supabase → SQL Editor und führen Sie die Datei supabase/004_anhaenger_und_sicherer_verlauf.sql vollständig aus.";
  if (text.includes("duplicate key")) return "Dieser Datensatz existiert bereits.";
  if (text.includes("check constraint")) return "Mindestens ein eingegebener Wert ist ungültig. Bitte prüfen Sie Position, Anzahl und Farben.";
  if (text.includes("fetch") || text.includes("network"))
    return "Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.";
  return original || "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
}
