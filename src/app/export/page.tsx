"use client";

import { useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Hinweis } from "@/components/Bausteine";
import { useBestand } from "@/components/Datenbestand";
import { exportiereBestand, exportiereVerlauf } from "@/lib/excel";

export default function ExportSeite() {
  const { schluessel, ereignisse } = useBestand();
  const [meldung, setMeldung] = useState<string | null>(null);

  const varianten = [
    {
      id: "gesamt",
      titel: "Gesamter Bestand",
      text: "Alle Schlüssel und Schlüsselbunde mit vollständigem Status.",
      anzahl: schluessel.length,
      start: () => exportiereBestand(schluessel, "gesamt"),
    },
    {
      id: "verfuegbar",
      titel: "Nur verfügbare Schlüssel",
      text: "Alle Einträge, die derzeit im Tresor liegen.",
      anzahl: schluessel.filter((k) => k.status === "verfuegbar").length,
      start: () => exportiereBestand(schluessel, "verfuegbar"),
    },
    {
      id: "entnommen",
      titel: "Nur entnommene Schlüssel",
      text: "Alle Einträge mit aktuellem Besitzer und Standort.",
      anzahl: schluessel.filter((k) => k.status === "entnommen").length,
      start: () => exportiereBestand(schluessel, "entnommen"),
    },
    {
      id: "verlauf",
      titel: "Änderungsverlauf",
      text: "Alle Entnahmen und Rückgaben mit Dauer außerhalb des Tresors.",
      anzahl: ereignisse.length,
      start: () => exportiereVerlauf(ereignisse),
    },
  ];

  return (
    <SeitenRahmen
      titel="Excel-Export"
      beschreibung="Exportieren Sie den aktuellen Live-Stand als Excel-Datei. Die Datei wird direkt heruntergeladen."
    >
      <div className="grid gap-4">
        {meldung && <Hinweis art="erfolg" text={meldung} />}

        <div className="rounded-lg border border-tresor-line bg-white p-5">
          <h2 className="text-sm font-semibold text-tresor-text">Enthaltene Spalten</h2>
          <p className="mt-1 text-sm text-tresor-muted">
            Schlüssel Position · Schlüsselnummer/n · Anlage/Zugehörigkeit · Beschriftung
            Schlüsselanhänger · Farbe Schlüsselanhänger · Schlüsselbund? · Schlüsselanzahl · Kommentar ·
            Status · Aktueller Besitzer · Aktueller Standort · Entnommen am · Rückgabe geplant · Dauer
            außerhalb · Zuletzt zurückgegeben · Letzte Änderung durch
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {varianten.map((v) => (
            <div key={v.id} className="flex flex-col rounded-lg border border-tresor-line bg-white p-5">
              <h3 className="text-base font-semibold text-tresor-text">{v.titel}</h3>
              <p className="mt-1 flex-1 text-sm text-tresor-muted">{v.text}</p>
              <div className="mt-3 text-sm text-tresor-muted">
                {v.anzahl} {v.anzahl === 1 ? "Datensatz" : "Datensätze"}
              </div>
              <button
                onClick={() => {
                  v.start();
                  setMeldung(`Die Datei „${v.titel}“ wurde erstellt und heruntergeladen.`);
                }}
                disabled={v.anzahl === 0}
                className="mt-4 rounded-md bg-tresor-blau px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {v.anzahl === 0 ? "Keine Daten vorhanden" : "Als Excel-Datei herunterladen"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </SeitenRahmen>
  );
}
