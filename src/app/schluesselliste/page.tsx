"use client";

import { useMemo, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Laden, Leer, StatusSchild } from "@/components/Bausteine";
import SchluesselKarte from "@/components/SchluesselKarte";
import { EntnahmeDialog, RueckgabeDialog } from "@/components/SchluesselDialoge";
import { useBestand } from "@/components/Datenbestand";
import { platzStatus } from "@/lib/status";
import { datumZeit, dauerSeit } from "@/lib/format";
import type { Schluessel } from "@/lib/typen";

type Filter = "alle" | "verfuegbar" | "teilweise" | "entnommen";

export default function SchluessellisteSeite() {
  const { schluessel, laedt } = useBestand();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [ansicht, setAnsicht] = useState<"tabelle" | "karten">("tabelle");

  const teilweisePlaetze = useMemo(() => {
    const karte = new Map<number, Schluessel[]>();
    schluessel.forEach((k) => karte.set(k.position, [...(karte.get(k.position) ?? []), k]));
    const menge = new Set<number>();
    karte.forEach((liste, nr) => {
      if (platzStatus(liste) === "teilweise") menge.add(nr);
    });
    return menge;
  }, [schluessel]);

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return schluessel.filter((k) => {
      if (filter === "verfuegbar" && k.status !== "verfuegbar") return false;
      if (filter === "entnommen" && k.status !== "entnommen") return false;
      if (filter === "teilweise" && !teilweisePlaetze.has(k.position)) return false;
      if (!begriff) return true;
      return [
        String(k.position),
        k.schluesselnummer,
        k.beschriftung,
        k.anlage,
        k.besitzer_name ?? "",
        k.farbe,
        k.standort ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(begriff);
    });
  }, [schluessel, suche, filter, teilweisePlaetze]);

  const filterKnoepfe: { wert: Filter; titel: string }[] = [
    { wert: "alle", titel: "Alle" },
    { wert: "verfuegbar", titel: "Verfügbar" },
    { wert: "teilweise", titel: "Teilweise verfügbar" },
    { wert: "entnommen", titel: "Entnommen" },
  ];

  return (
    <SeitenRahmen
      titel="Schlüsselliste"
      beschreibung="Suchen Sie nach Platznummer, Schlüsselnummer, Beschriftung, Anlage oder aktuellem Besitzer."
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-lg border border-tresor-line bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="suche" className="sr-only">
                Suche
              </label>
              <input
                id="suche"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Platznummer, Schlüsselnummer, Beschriftung, Anlage oder Besitzer …"
                className="w-full rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterKnoepfe.map((f) => (
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
              <button
                onClick={() => setAnsicht(ansicht === "tabelle" ? "karten" : "tabelle")}
                className="rounded-md border border-tresor-line px-3 py-2 text-sm font-medium hover:bg-tresor-bg"
              >
                {ansicht === "tabelle" ? "Als Karten anzeigen" : "Als Tabelle anzeigen"}
              </button>
            </div>
          </div>

          <p className="text-sm text-tresor-muted">
            {gefiltert.length} von {schluessel.length} Einträgen
          </p>

          {gefiltert.length === 0 ? (
            <Leer
              titel="Keine Treffer"
              text="Passen Sie den Suchbegriff an oder setzen Sie den Filter auf „Alle“."
            />
          ) : ansicht === "karten" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {gefiltert.map((k) => (
                <SchluesselKarte key={k.id} schluessel={k} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-tresor-line bg-white">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-tresor-bg text-left text-xs uppercase tracking-wide text-tresor-muted">
                  <tr>
                    <th className="px-4 py-3">Platz</th>
                    <th className="px-4 py-3">Schlüsselnummer</th>
                    <th className="px-4 py-3">Beschriftung</th>
                    <th className="px-4 py-3">Anlage</th>
                    <th className="px-4 py-3">Farbe</th>
                    <th className="px-4 py-3">Art</th>
                    <th className="px-4 py-3">Anzahl</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Besitzer</th>
                    <th className="px-4 py-3">Standort</th>
                    <th className="px-4 py-3">Entnommen am</th>
                    <th className="px-4 py-3">Dauer außerhalb</th>
                    <th className="px-4 py-3 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tresor-line">
                  {gefiltert.map((k) => (
                    <Zeile key={k.id} schluessel={k} />
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

function Zeile({ schluessel }: { schluessel: Schluessel }) {
  const [dialog, setDialog] = useState(false);
  const entnommen = schluessel.status === "entnommen";
  const Dialog = entnommen ? RueckgabeDialog : EntnahmeDialog;

  return (
    <tr className="hover:bg-tresor-bg/60">
      <td className="px-4 py-3 text-lg font-bold tabular-nums">{schluessel.position}</td>
      <td className="px-4 py-3">{schluessel.schluesselnummer || "—"}</td>
      <td className="px-4 py-3 font-medium">{schluessel.beschriftung || "—"}</td>
      <td className="px-4 py-3 text-tresor-muted">{schluessel.anlage || "—"}</td>
      <td className="px-4 py-3 text-tresor-muted">{schluessel.farbe || "—"}</td>
      <td className="px-4 py-3 text-tresor-muted">
        {schluessel.ist_bund ? "Schlüsselbund" : "Einzelschlüssel"}
      </td>
      <td className="px-4 py-3 tabular-nums">{schluessel.schluesselanzahl}</td>
      <td className="px-4 py-3">
        <StatusSchild status={entnommen ? "entnommen" : "verfuegbar"} />
      </td>
      <td className="px-4 py-3">{schluessel.besitzer_name ?? "—"}</td>
      <td className="px-4 py-3 text-tresor-muted">{schluessel.standort ?? "—"}</td>
      <td className="px-4 py-3 whitespace-nowrap text-tresor-muted">
        {datumZeit(schluessel.entnommen_am)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-tresor-muted">
        {entnommen ? dauerSeit(schluessel.entnommen_am) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => setDialog(true)}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold text-white ${
            entnommen ? "bg-status-gruen" : "bg-tresor-blau"
          }`}
        >
          {entnommen ? "Zurückgeben" : "Entnehmen"}
        </button>
        {dialog && <Dialog schluessel={schluessel} schliessen={() => setDialog(false)} />}
      </td>
    </tr>
  );
}
