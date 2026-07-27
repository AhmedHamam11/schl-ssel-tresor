import * as XLSX from "xlsx";
import type { Ereignis, Schluessel } from "./typen";
import { datumZeit, dauerText, dauerSeit, statusText, aktionText } from "./format";

/** Erkennt die Spalten der bestehenden Bestandsliste, auch bei Schreibvarianten. */
const SPALTEN_KARTE: Record<string, string> = {
  "schluessel position": "position",
  "schlussel position": "position",
  "schlüssel position": "position",
  "schlüsselposition": "position",
  "position": "position",
  "platz": "position",
  "platznummer": "position",
  "schlüsselnummer/n": "schluesselnummer",
  "schlusselnummer/n": "schluesselnummer",
  "schlüsselnummer": "schluesselnummer",
  "schlüsselnummern": "schluesselnummer",
  "schluesselnummer": "schluesselnummer",
  "anlage/zugehörigkeit": "anlage",
  "anlage/zugehorigkeit": "anlage",
  "anlage": "anlage",
  "zugehörigkeit": "anlage",
  "beschriftung schlüsselanhänger": "beschriftung",
  "beschriftung schlusselanhanger": "beschriftung",
  "beschriftung": "beschriftung",
  "farbe schlüsselanhänger": "farbe",
  "farbe schlusselanhanger": "farbe",
  "farbe": "farbe",
  "schlüsselbund?": "ist_bund",
  "schlusselbund?": "ist_bund",
  "schlüsselbund": "ist_bund",
  "bund": "ist_bund",
  "schlüsselanzahl": "schluesselanzahl",
  "schlusselanzahl": "schluesselanzahl",
  "anzahl": "schluesselanzahl",
  "kommentar": "kommentar",
  "bemerkung": "kommentar",
};

function normalisiere(text: string): string {
  return String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ImportZeile {
  zeilennummer: number;
  position: number | null;
  schluesselnummer: string;
  anlage: string;
  beschriftung: string;
  farbe: string;
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
  const blatt = mappe.Sheets[mappe.SheetNames[0]];
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

    const positionRoh = String(feld.position ?? "").replace(/[^0-9]/g, "");
    const position = positionRoh === "" ? null : Number(positionRoh);

    const bundRoh = normalisiere(String(feld.ist_bund ?? ""));
    const ist_bund = ["ja", "j", "x", "true", "wahr", "1", "bund", "schlüsselbund"].includes(bundRoh);

    const anzahlRoh = String(feld.schluesselanzahl ?? "").replace(/[^0-9]/g, "");
    const schluesselanzahl = anzahlRoh === "" ? (ist_bund ? 1 : 1) : Number(anzahlRoh);

    const fehler: string[] = [];
    if (position === null) fehler.push("Schlüsselposition fehlt");
    else if (position < 1 || position > 500) fehler.push("Position liegt außerhalb von 1–500");
    if (!String(feld.schluesselnummer ?? "").trim() && !String(feld.beschriftung ?? "").trim())
      fehler.push("Weder Schlüsselnummer noch Beschriftung vorhanden");

    return {
      zeilennummer: index + 2,
      position,
      schluesselnummer: String(feld.schluesselnummer ?? "").trim(),
      anlage: String(feld.anlage ?? "").trim(),
      beschriftung: String(feld.beschriftung ?? "").trim(),
      farbe: String(feld.farbe ?? "").trim(),
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function exportiereBestand(
  schluessel: Schluessel[],
  variante: "gesamt" | "verfuegbar" | "entnommen"
) {
  const gefiltert = schluessel.filter((k) =>
    variante === "gesamt" ? true : k.status === variante
  );

  const zeilen = gefiltert.map((k) => ({
    "Schlüssel Position": k.position,
    "Schlüsselnummer/n": k.schluesselnummer,
    "Anlage/Zugehörigkeit": k.anlage,
    "Beschriftung Schlüsselanhänger": k.beschriftung,
    "Farbe Schlüsselanhänger": k.farbe,
    "Schlüsselbund?": k.ist_bund ? "Ja" : "Nein",
    "Schlüsselanzahl": k.schluesselanzahl,
    "Kommentar": k.kommentar,
    "Status": statusText(k.status),
    "Aktueller Besitzer": k.besitzer_name ?? "",
    "Aktueller Standort": k.standort ?? "",
    "Entnommen am": datumZeit(k.entnommen_am),
    "Rückgabe geplant": datumZeit(k.rueckgabe_geplant),
    "Dauer außerhalb": k.status === "entnommen" ? dauerSeit(k.entnommen_am) : "—",
    "Zuletzt zurückgegeben": datumZeit(k.zuletzt_zurueck_am),
    "Letzte Änderung durch": k.letzte_aenderung_durch ?? "",
  }));

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
    "Platznummer": e.position,
    "Schlüsselnummer": e.schluesselnummer,
    "Beschriftung": e.beschriftung,
    "Aktion": aktionText(e.aktion),
    "Benutzer": e.benutzer_name,
    "Aktueller Standort": e.standort ?? "",
    "Verwendungszweck": e.verwendungszweck ?? "",
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
      "Beschriftung Schlüsselanhänger": "Haupteingang",
      "Farbe Schlüsselanhänger": "Blau",
      "Schlüsselbund?": "Nein",
      "Schlüsselanzahl": 1,
      "Kommentar": "",
    },
  ];
  speichere(zeilen, "Vorlage", "Schluessel-Tresor_Import-Vorlage.xlsx");
}
