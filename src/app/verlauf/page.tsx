"use client";

import { useMemo, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Laden, Leer } from "@/components/Bausteine";
import AnhaengerAnzeige from "@/components/AnhaengerAnzeige";
import { useBestand } from "@/components/Datenbestand";
import { anhaengerDesEreignisses, anhaengerSuchtext } from "@/lib/anhaenger";
import { aktionText, datumZeit, dauerText } from "@/lib/format";
import type { Aktion } from "@/lib/typen";

type Filter = "alle" | Aktion;

const FILTER: { wert: Filter; titel: string }[] = [
  { wert: "alle", titel: "Alle Aktionen" },
  { wert: "entnommen", titel: "Entnommen" },
  { wert: "zurueckgegeben", titel: "Zurückgegeben" },
  { wert: "angelegt", titel: "Angelegt" },
  { wert: "geaendert", titel: "Bearbeitet" },
  { wert: "geloescht", titel: "Gelöscht" },
  { wert: "importiert", titel: "Importiert" },
];

const aktionsStil: Record<Aktion, string> = {
  entnommen: "bg-status-rot",
  zurueckgegeben: "bg-status-gruen",
  angelegt: "bg-tresor-blau",
  geaendert: "bg-status-gelb",
  geloescht: "bg-status-grau",
  importiert: "bg-violet-600",
};

export default function VerlaufSeite() {
  const { ereignisse, laedt } = useBestand();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLocaleLowerCase("de-DE");
    return ereignisse.filter((e) => {
      if (filter !== "alle" && e.aktion !== filter) return false;
      if (!begriff) return true;
      return [
        String(e.position),
        e.schluesselnummer,
        e.beschriftung,
        e.anlage,
        e.benutzer_name,
        e.standort ?? "",
        e.verwendungszweck ?? "",
        anhaengerSuchtext(anhaengerDesEreignisses(e)),
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(begriff);
    });
  }, [ereignisse, suche, filter]);

  return (
    <SeitenRahmen
      titel="Verlauf"
      beschreibung="Alle Entnahmen, Rückgaben und administrativen Änderungen – neueste zuerst. Die Einträge werden nicht überschrieben."
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3 rounded-lg border border-tresor-line bg-white p-4">
            <input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Nach Platz, Schlüssel, Anhänger, Anlage, Benutzer oder Standort suchen …"
              aria-label="Verlauf durchsuchen"
              className="min-w-[16rem] flex-1 rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Verlauf nach Aktion filtern"
              className="rounded-md border border-tresor-line bg-white px-3 py-2.5 text-sm text-tresor-text focus:border-tresor-blau focus:outline-none"
            >
              {FILTER.map((f) => (
                <option key={f.wert} value={f.wert}>
                  {f.titel}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-tresor-muted">
            {gefiltert.length} von {ereignisse.length} Verlaufseinträgen
          </p>

          {gefiltert.length === 0 ? (
            <Leer
              titel="Keine Einträge"
              text="Für den gewählten Filter oder Suchbegriff wurden keine Verlaufseinträge gefunden."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-tresor-line bg-white">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-tresor-bg text-left text-xs uppercase tracking-wide text-tresor-muted">
                  <tr>
                    <th className="px-4 py-3">Datum und Uhrzeit</th>
                    <th className="px-4 py-3">Platz</th>
                    <th className="px-4 py-3">Schlüssel / Anhänger</th>
                    <th className="px-4 py-3">Anlage</th>
                    <th className="px-4 py-3">Aktion</th>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Standort / Zweck</th>
                    <th className="px-4 py-3">Dauer außerhalb</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tresor-line">
                  {gefiltert.map((e) => {
                    const anhaenger = anhaengerDesEreignisses(e);
                    return (
                      <tr key={e.id} className="hover:bg-tresor-bg/60">
                        <td className="whitespace-nowrap px-4 py-3 text-tresor-muted">
                          {datumZeit(e.zeitpunkt)}
                        </td>
                        <td className="px-4 py-3 text-base font-bold tabular-nums">
                          {e.position > 0 ? e.position : "—"}
                        </td>
                        <td className="max-w-[24rem] px-4 py-3">
                          <AnhaengerAnzeige
                            anhaenger={anhaenger}
                            kompakt
                            leerText={e.beschriftung || "Ohne Beschriftung"}
                          />
                          <div className="mt-1 text-xs text-tresor-muted">
                            {e.schluesselnummer || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-tresor-muted">{e.anlage || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-medium">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${aktionsStil[e.aktion]}`}
                              aria-hidden
                            />
                            {aktionText(e.aktion)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{e.benutzer_name || "—"}</td>
                        <td className="px-4 py-3 text-tresor-muted">
                          <div>{e.standort || "—"}</div>
                          {e.verwendungszweck && (
                            <div className="mt-0.5 text-xs">{e.verwendungszweck}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-tresor-muted">
                          {e.aktion === "zurueckgegeben" ? dauerText(e.dauer_sekunden) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </SeitenRahmen>
  );
}
