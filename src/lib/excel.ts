import * as XLSX from "xlsx";
import type { Ereignis, Schluessel, SchluesselAnhaenger } from "./typen";
import {
  anhaengerAlsExcelText,
  anhaengerAusExcelText,
  anhaengerDesEreignisses,
  anhaengerDesSchluessels,
  normalisiereFarbe,
} from "./anhaenger";
import { datumZeit, dauerText, dauerSeit, statusText, aktionText } from "./format";

/** Erkennt die Spalten der bestehenden Bestandsliste, auch bei Schreibvarianten. */
const SPALTEN_KARTE: Record<string, string> = {
  "schluessel position": "position",
  "schlussel position": "position",
  "schlüssel position": "position",
  schlüsselposition: "position",
  position: "position",
  platz: "position",
  platznummer: "position",
  "schlüsselnummer/n": "schluesselnummer",
  "schlusselnummer/n": "schluesselnummer",
  schlüsselnummer: "schluesselnummer",
  schlüsselnummern: "schluesselnummer",
  schluesselnummer: "schluesselnummer",
  "anlage/zugehörigkeit": "anlage",
  "anlage/zugehorigkeit": "anlage",
  anlage: "anlage",
  zugehörigkeit: "anlage",
  "anhänger (text|farbe; ...)": "anhaenger",
  "anhanger (text|farbe; ...)": "anhaenger",
  "anhänger": "anhaenger",
  "anhaenger": "anhaenger",
  "schlüsselanhänger": "anhaenger",
  "beschriftung schlüsselanhänger": "beschriftung",
  "beschriftung schlusselanhanger": "beschriftung",
  beschriftung: "beschriftung",
  "farbe schlüsselanhänger": "farbe",
  "farbe schlusselanhanger": "farbe",
  farbe: "farbe",
  "schlüsselbund?": "ist_bund",
  "schlusselbund?": "ist_bund",
  schlüsselbund: "ist_bund",
  bund: "ist_bund",
  schlüsselanzahl: "schluesselanzahl",
  schlusselanzahl: "schluesselanzahl",
  anzahl: "schluesselanzahl",
  kommentar: "kommentar",
  bemerkung: "kommentar",
};

function normalisiere(text: string): string {
  return String(text ?? "").trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

function zahl(wert: unknown): number | null {
  if (typeof wert === "number") return Number.isFinite(wert) ? wert : null;
  const text = String(wert ?? "").trim().replace(",", ".");
  if (!text) return null;
  const ergebnis = Number(text);
  return Number.isFinite(ergebnis) ? ergebnis : null;
}

export interface ImportZeile {
  zeilennummer: number;
  position: number | null;
  schluesselnummer: string;
  anlage: string;
  anhaenger: SchluesselAnhaenger[];
  ist_bund: boolean;
  schluesselanzahl: number;
  kommentar: string;
  fehler: string[];
}

export function leseBestandsdatei(daten: ArrayBuffer): {
  zeilen: ImportZeile[];
  erkannteSpalten: string[];
  unbekannteSpalten: string[];
} {
  const mappe = XLSX.read(daten, { type: "array" });
  const erstesBlatt = mappe.SheetNames[0];
  if (!erstesBlatt) return { zeilen: [], erkannteSpalten: [], unbekannteSpalten: [] };
  const blatt = mappe.Sheets[erstesBlatt];
  const roh = XLSX.utils.sheet_to_json<Record<string, unknown>>(blatt, { defval: "" });

  const erkannteSpalten: string[] = [];
  const unbekannteSpalten: string[] = [];
  if (roh.length > 0) {
    Object.keys(roh[0]).forEach((spalte) => {
      if (SPALTEN_KARTE[normalisiere(spalte)]) erkannteSpalten.push(spalte);
      else unbekannteSpalten.push(spalte);
    });
  }

  const zeilen: ImportZeile[] = roh.map((satz, index) => {
    const feld: Record<string, unknown> = {};
    Object.entries(satz).forEach(([spalte, wert]) => {
      const ziel = SPALTEN_KARTE[normalisiere(spalte)];
      if (ziel && (feld[ziel] === undefined || feld[ziel] === "")) feld[ziel] = wert;
    });

    const positionWert = zahl(feld.position);
    const position = positionWert !== null && Number.isInteger(positionWert) ? positionWert : null;

    const bundRoh = normalisiere(String(feld.ist_bund ?? ""));
    const ist_bund = ["ja", "j", "x", "true", "wahr", "1", "bund", "schlüsselbund"].includes(
      bundRoh
    );

    const anzahlWert = zahl(feld.schluesselanzahl);
    const schluesselanzahl =
      anzahlWert !== null && Number.isInteger(anzahlWert) ? anzahlWert : 1;

    const fehler: string[] = [];
    let anhaenger: SchluesselAnhaenger[] = [];
    if (String(feld.anhaenger ?? "").trim()) {
      const ergebnis = anhaengerAusExcelText(feld.anhaenger);
      anhaenger = ergebnis.anhaenger;
      fehler.push(...ergebnis.fehler);
    } else {
      const text = String(feld.beschriftung ?? "").trim();
      const farbText = String(feld.farbe ?? "").trim();
      const farbe = normalisiereFarbe(farbText);
      if (text) {
        anhaenger = [{ text, farbe }];
      }
      if (farbText && !farbe) fehler.push(`Unbekannte Anhängerfarbe: „${farbText}“`);
    }

    if (positionWert === null) fehler.push("Schlüsselposition fehlt");
    else if (!Number.isInteger(positionWert)) fehler.push("Schlüsselposition muss eine ganze Zahl sein");
    else if (positionWert < 1 || positionWert > 500)
      fehler.push("Position liegt außerhalb von 1–500");
    if (anzahlWert !== null && (!Number.isInteger(anzahlWert) || anzahlWert < 1))
      fehler.push("Schlüsselanzahl muss eine ganze Zahl ab 1 sein");
    if (!String(feld.schluesselnummer ?? "").trim() && anhaenger.length === 0)
      fehler.push("Weder Schlüsselnummer noch Anhängertext vorhanden");

    return {
      zeilennummer: index + 2,
      position,
      schluesselnummer: String(feld.schluesselnummer ?? "").trim(),
      anlage: String(feld.anlage ?? "").trim(),
      anhaenger,
      ist_bund,
      schluesselanzahl,
      kommentar: String(feld.kommentar ?? "").trim(),
      fehler,
    };
  });

  return { zeilen, erkannteSpalten, unbekannteSpalten };
}

function speichere(blattdaten: unknown[], blattname: string, dateiname: string) {
  const blatt = XLSX.utils.json_to_sheet(blattdaten as Record<string, unknown>[]);
  const mappe = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(mappe, blatt, blattname);
  XLSX.writeFile(mappe, dateiname);
}

function heute(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function exportiereBestand(
  schluessel: Schluessel[],
  variante: "gesamt" | "verfuegbar" | "entnommen"
) {
  const gefiltert = schluessel.filter((k) =>
    variante === "gesamt" ? true : k.status === variante
  );

  const zeilen = gefiltert.map((k) => {
    const anhaenger = anhaengerDesSchluessels(k);
    return {
      "Schlüssel Position": k.position,
      "Schlüsselnummer/n": k.schluesselnummer,
      "Anlage/Zugehörigkeit": k.anlage,
      "Anhänger (Text|Farbe; ...)": anhaengerAlsExcelText(anhaenger),
      "Beschriftung Schlüsselanhänger": anhaenger[0]?.text ?? "",
      "Farbe Schlüsselanhänger": anhaenger[0]?.farbe ?? "",
      "Schlüsselbund?": k.ist_bund ? "Ja" : "Nein",
      Schlüsselanzahl: k.schluesselanzahl,
      Kommentar: k.kommentar,
      Status: statusText(k.status),
      "Aktueller Besitzer": k.besitzer_name ?? "",
      "Aktueller Standort": k.standort ?? "",
      "Entnommen am": datumZeit(k.entnommen_am),
      "Rückgabe geplant": datumZeit(k.rueckgabe_geplant),
      "Dauer außerhalb": k.status === "entnommen" ? dauerSeit(k.entnommen_am) : "—",
      "Zuletzt zurückgegeben": datumZeit(k.zuletzt_zurueck_am),
      "Letzte Änderung durch": k.letzte_aenderung_durch ?? "",
    };
  });

  const namen = {
    gesamt: "Gesamter-Bestand",
    verfuegbar: "Verfuegbare-Schluessel",
    entnommen: "Entnommene-Schluessel",
  };
  speichere(zeilen, "Bestand", `Schluessel-Tresor_${namen[variante]}_${heute()}.xlsx`);
}

export function exportiereVerlauf(ereignisse: Ereignis[]) {
  const zeilen = ereignisse.map((e) => ({
    "Datum und Uhrzeit": datumZeit(e.zeitpunkt),
    Platznummer: e.position > 0 ? e.position : "",
    Schlüsselnummer: e.schluesselnummer,
    Anhänger: anhaengerAlsExcelText(anhaengerDesEreignisses(e)),
    Beschriftung: e.beschriftung,
    Anlage: e.anlage,
    Aktion: aktionText(e.aktion),
    Benutzer: e.benutzer_name,
    "Aktueller Standort": e.standort ?? "",
    Verwendungszweck: e.verwendungszweck ?? "",
    "Dauer außerhalb": dauerText(e.dauer_sekunden),
  }));
  speichere(zeilen, "Verlauf", `Schluessel-Tresor_Aenderungsverlauf_${heute()}.xlsx`);
}

export function erzeugeVorlage() {
  const zeilen = [
    {
      "Schlüssel Position": 1,
      "Schlüsselnummer/n": "S-1001",
      "Anlage/Zugehörigkeit": "Verwaltung Hauptgebäude",
      "Anhänger (Text|Farbe; ...)": "Haupteingang|Blau; Technikraum|Rot; Ersatzschlüssel",
      "Schlüsselbund?": "Ja",
      Schlüsselanzahl: 3,
      Kommentar: "Der dritte Anhänger hat bewusst keine Farbe.",
    },
  ];
  speichere(zeilen, "Vorlage", "Schluessel-Tresor_Import-Vorlage.xlsx");
}
