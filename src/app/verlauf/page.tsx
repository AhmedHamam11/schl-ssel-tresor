"use client";

import { useMemo, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Laden, Leer, StatusPunkt } from "@/components/Bausteine";
import { useBestand } from "@/components/Datenbestand";
import { aktionText, datumZeit, dauerText } from "@/lib/format";

type Filter = "alle" | "entnommen" | "zurueckgegeben";

export default function VerlaufSeite() {
  const { ereignisse, laedt } = useBestand();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return ereignisse.filter((e) => {
      if (filter !== "alle" && e.aktion !== filter) return false;
      if (!begriff) return true;
      return [String(e.position), e.schluesselnummer, e.beschriftung, e.benutzer_name, e.standort ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(begriff);
    });
  }, [ereignisse, suche, filter]);

  return (
    <SeitenRahmen
      titel="Verlauf"
      beschreibung="Alle Entnahmen und Rückgaben, neueste zuerst. Einträge werden nie gelöscht oder überschrieben."
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3 rounded-lg border border-tresor-line bg-white p-4">
            <input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Nach Platz, Schlüssel, Benutzer oder Standort suchen …"
              aria-label="Verlauf durchsuchen"
              className="min-w-[16rem] flex-1 rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30"
            />
            {([
              { wert: "alle", titel: "Alle" },
              { wert: "entnommen", titel: "Entnommen" },
              { wert: "zurueckgegeben", titel: "Zurückgegeben" },
            ] as { wert: Filter; titel: string }[]).map((f) => (
              <button
                key={f.wert}
                onClick={() => setFilter(f.wert)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  filter === f.wert
                    ? "bg-tresor-blau text-white"
                    : "border border-tresor-line text-tresor-text hover:bg-tresor-bg"
                }`}
              >
                {f.titel}
              </button>
            ))}
          </div>

          {gefiltert.length === 0 ? (
            <Leer
              titel="Keine Einträge"
              text="Sobald ein Schlüssel entnommen oder zurückgegeben wird, erscheint der Vorgang hier."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-tresor-line bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-tresor-bg text-left text-xs uppercase tracking-wide text-tresor-muted">
                  <tr>
                    <th className="px-4 py-3">Datum und Uhrzeit</th>
                    <th className="px-4 py-3">Platz</th>
                    <th className="px-4 py-3">Schlüssel oder Schlüsselbund</th>
                    <th className="px-4 py-3">Aktion</th>
                    <th className="px-4 py-3">Benutzer</th>
                    <th className="px-4 py-3">Aktueller Standort</th>
                    <th className="px-4 py-3">Dauer außerhalb</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tresor-line">
                  {gefiltert.map((e) => (
                    <tr key={e.id} className="hover:bg-tresor-bg/60">
                      <td className="whitespace-nowrap px-4 py-3 text-tresor-muted">
                        {datumZeit(e.zeitpunkt)}
                      </td>
                      <td className="px-4 py-3 text-base font-bold tabular-nums">{e.position}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.beschriftung || "Ohne Beschriftung"}</div>
                        <div className="text-xs text-tresor-muted">{e.schluesselnummer || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <StatusPunkt status={e.aktion === "entnommen" ? "entnommen" : "verfuegbar"} />
                          {aktionText(e.aktion)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{e.benutzer_name || "—"}</td>
                      <td className="px-4 py-3 text-tresor-muted">{e.standort || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-tresor-muted">
                        {e.aktion === "zurueckgegeben" ? dauerText(e.dauer_sekunden) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </SeitenRahmen>
  );
}
