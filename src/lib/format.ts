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
  const text = (nachricht ?? "").toLowerCase();
  if (text.includes("invalid login")) return "E-Mail-Adresse oder Passwort ist falsch.";
  if (text.includes("email not confirmed")) return "Die E-Mail-Adresse wurde noch nicht bestätigt.";
  if (text.includes("user already registered")) return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
  if (text.includes("password")) return "Das Passwort erfüllt die Anforderungen nicht (mindestens 8 Zeichen).";
  if (text.includes("row-level security") || text.includes("permission"))
    return "Für diese Aktion fehlt Ihnen die Berechtigung.";
  if (text.includes("fetch") || text.includes("network"))
    return "Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.";
  return "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
}
