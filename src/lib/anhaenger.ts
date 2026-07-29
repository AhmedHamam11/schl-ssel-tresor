import type {
  BeschriftungFarbe,
  Ereignis,
  Schluessel,
  SchluesselAnhaenger,
} from "./typen";

export const BESCHRIFTUNGSFARBEN = [
  "Blau",
  "Rot",
  "Grau",
  "Weiß",
  "Violett",
  "Orange",
  "Schwarz",
  "Gelb",
  "Grün",
] as const satisfies readonly BeschriftungFarbe[];

const farbAlias: Record<string, BeschriftungFarbe> = {
  blau: "Blau",
  blue: "Blau",
  rot: "Rot",
  red: "Rot",
  grau: "Grau",
  gray: "Grau",
  grey: "Grau",
  weiß: "Weiß",
  weiss: "Weiß",
  white: "Weiß",
  violett: "Violett",
  lila: "Violett",
  purple: "Violett",
  orange: "Orange",
  schwarz: "Schwarz",
  black: "Schwarz",
  gelb: "Gelb",
  yellow: "Gelb",
  grün: "Grün",
  gruen: "Grün",
  green: "Grün",
};

export function normalisiereFarbe(wert: unknown): BeschriftungFarbe | null {
  if (typeof wert !== "string") return null;
  return farbAlias[wert.trim().toLocaleLowerCase("de-DE")] ?? null;
}

export function normalisiereAnhaenger(
  wert: unknown,
  legacyText = "",
  legacyFarbe: unknown = null
): SchluesselAnhaenger[] {
  const ergebnis: SchluesselAnhaenger[] = [];

  if (Array.isArray(wert)) {
    for (const eintrag of wert) {
      if (!eintrag || typeof eintrag !== "object") continue;
      const roh = eintrag as Record<string, unknown>;
      const text = typeof roh.text === "string" ? roh.text.trim() : "";
      if (!text) continue;
      ergebnis.push({ text, farbe: normalisiereFarbe(roh.farbe) });
    }
  }

  if (ergebnis.length === 0 && legacyText.trim()) {
    ergebnis.push({ text: legacyText.trim(), farbe: normalisiereFarbe(legacyFarbe) });
  }

  return ergebnis;
}

export function anhaengerDesSchluessels(schluessel: Partial<Schluessel>): SchluesselAnhaenger[] {
  return normalisiereAnhaenger(
    schluessel.anhaenger,
    schluessel.beschriftung ?? "",
    schluessel.beschriftung_farbe ?? schluessel.farbe
  );
}

export function anhaengerDesEreignisses(ereignis: Partial<Ereignis>): SchluesselAnhaenger[] {
  return normalisiereAnhaenger(ereignis.anhaenger, ereignis.beschriftung ?? "", null);
}

export function primaereBeschriftung(schluessel: Partial<Schluessel>): string {
  return (
    anhaengerDesSchluessels(schluessel)[0]?.text ||
    schluessel.beschriftung?.trim() ||
    schluessel.schluesselnummer?.trim() ||
    "Ohne Beschriftung"
  );
}

export function anhaengerSuchtext(anhaenger: SchluesselAnhaenger[]): string {
  return anhaenger
    .flatMap((a) => [a.text, a.farbe ?? ""])
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

export function anhaengerAlsExcelText(anhaenger: SchluesselAnhaenger[]): string {
  return anhaenger
    .map((a) => (a.farbe ? `${a.text}|${a.farbe}` : a.text))
    .join("; ");
}

export function anhaengerAusExcelText(wert: unknown): {
  anhaenger: SchluesselAnhaenger[];
  fehler: string[];
} {
  const text = String(wert ?? "").trim();
  if (!text) return { anhaenger: [], fehler: [] };

  const fehler: string[] = [];
  const anhaenger = text
    .split(/[;\n]+/)
    .map((teil) => teil.trim())
    .filter(Boolean)
    .map((teil) => {
      const trennstelle = teil.lastIndexOf("|");
      if (trennstelle === -1) return { text: teil, farbe: null } satisfies SchluesselAnhaenger;

      const schildText = teil.slice(0, trennstelle).trim();
      const farbText = teil.slice(trennstelle + 1).trim();
      const farbe = normalisiereFarbe(farbText);
      if (!schildText) fehler.push(`Anhänger ohne Text: „${teil}“`);
      if (farbText && !farbe) fehler.push(`Unbekannte Anhängerfarbe: „${farbText}“`);
      return { text: schildText, farbe } satisfies SchluesselAnhaenger;
    })
    .filter((a) => a.text);

  return { anhaenger, fehler };
}

export function normalisiereSchluessel(schluessel: Schluessel): Schluessel {
  const anhaenger = anhaengerDesSchluessels(schluessel);
  const erster = anhaenger[0];
  return {
    ...schluessel,
    anhaenger,
    beschriftung: schluessel.beschriftung || erster?.text || "",
    beschriftung_farbe: normalisiereFarbe(schluessel.beschriftung_farbe) ?? erster?.farbe ?? null,
  };
}

export function normalisiereEreignis(ereignis: Ereignis): Ereignis {
  return { ...ereignis, anhaenger: anhaengerDesEreignisses(ereignis) };
}

export function farbStil(farbe: BeschriftungFarbe | null): {
  hintergrund: string;
  text: string;
  rand: string;
} {
  const karte: Record<BeschriftungFarbe, { hintergrund: string; text: string; rand: string }> = {
    Blau: { hintergrund: "#2563eb", text: "#ffffff", rand: "#2563eb" },
    Rot: { hintergrund: "#dc2626", text: "#ffffff", rand: "#dc2626" },
    Grau: { hintergrund: "#6b7280", text: "#ffffff", rand: "#6b7280" },
    Weiß: { hintergrund: "#ffffff", text: "#374151", rand: "#d1d5db" },
    Violett: { hintergrund: "#7c3aed", text: "#ffffff", rand: "#7c3aed" },
    Orange: { hintergrund: "#ea580c", text: "#ffffff", rand: "#ea580c" },
    Schwarz: { hintergrund: "#111827", text: "#ffffff", rand: "#111827" },
    Gelb: { hintergrund: "#facc15", text: "#422006", rand: "#eab308" },
    Grün: { hintergrund: "#16a34a", text: "#ffffff", rand: "#16a34a" },
  };
  return farbe
    ? karte[farbe]
    : { hintergrund: "#ffffff", text: "#374151", rand: "#d1d5db" };
}
