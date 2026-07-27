"use client";

import Link from "next/link";
import { useMemo } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Karte, Laden, StatusPunkt } from "@/components/Bausteine";
import { useBestand } from "@/components/Datenbestand";
import { platzStatus } from "@/lib/status";
import { datumZeit, dauerText } from "@/lib/format";

export default function UebersichtSeite() {
  const { schluessel, ereignisse, laedt } = useBestand();

  const zahlen = useMemo(() => {
    const gesamt = schluessel.length;
    const entnommen = schluessel.filter((k) => k.status === "entnommen").length;
    const verfuegbar = gesamt - entnommen;

    const proPlatz = new Map<number, typeof schluessel>();
    schluessel.forEach((k) => {
      proPlatz.set(k.position, [...(proPlatz.get(k.position) ?? []), k]);
    });
    let teilweise = 0;
    proPlatz.forEach((liste) => {
      if (platzStatus(liste) === "teilweise") teilweise += 1;
    });

    return {
      gesamt,
      verfuegbar,
      entnommen,
      teilweise,
      belegtePlaetze: proPlatz.size,
      buende: schluessel.filter((k) => k.ist_bund).length,
    };
  }, [schluessel]);

  const letzteEntnahmen = ereignisse.filter((e) => e.aktion === "entnommen").slice(0, 5);
  const letzteRueckgaben = ereignisse.filter((e) => e.aktion === "zurueckgegeben").slice(0, 5);

  return (
    <SeitenRahmen
      titel="Übersicht"
      beschreibung="Aktueller Stand des Schlüsseltresors. Die Zahlen aktualisieren sich in Echtzeit."
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Karte
              titel="Schlüssel und Schlüsselbunde"
              wert={zahlen.gesamt}
              hinweis={`davon ${zahlen.buende} Schlüsselbunde · ${zahlen.belegtePlaetze} belegte Plätze`}
            />
            <Karte titel="Verfügbar" wert={zahlen.verfuegbar} akzent="text-status-gruen" />
            <Karte
              titel="Teilweise verfügbar"
              wert={zahlen.teilweise}
              hinweis="Plätze mit entnommenen und verfügbaren Schlüsseln"
              akzent="text-[#8a6800]"
            />
            <Karte titel="Entnommen" wert={zahlen.entnommen} akzent="text-status-rot" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Liste titel="Zuletzt entnommen" eintraege={letzteEntnahmen} art="entnommen" />
            <Liste titel="Zuletzt zurückgegeben" eintraege={letzteRueckgaben} art="zurueckgegeben" />
          </div>

          <div className="rounded-lg border border-tresor-line bg-white p-4">
            <h2 className="text-sm font-semibold text-tresor-text">Schnellzugriff</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { pfad: "/tresor", titel: "Digitaler Schlüsseltresor" },
                { pfad: "/schluesselliste", titel: "Schlüsselliste durchsuchen" },
                { pfad: "/verlauf", titel: "Änderungsverlauf ansehen" },
                { pfad: "/export", titel: "Excel-Export erstellen" },
              ].map((s) => (
                <Link
                  key={s.pfad}
                  href={s.pfad}
                  className="rounded-md border border-tresor-line px-3 py-2 text-sm font-medium text-tresor-text hover:bg-tresor-bg"
                >
                  {s.titel}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </SeitenRahmen>
  );
}

function Liste({
  titel,
  eintraege,
  art,
}: {
  titel: string;
  eintraege: ReturnType<typeof useBestand>["ereignisse"];
  art: "entnommen" | "zurueckgegeben";
}) {
  return (
    <section className="rounded-lg border border-tresor-line bg-white">
      <h2 className="border-b border-tresor-line px-4 py-3 text-sm font-semibold text-tresor-text">
        {titel}
      </h2>
      {eintraege.length === 0 ? (
        <p className="px-4 py-6 text-sm text-tresor-muted">Bisher keine Einträge vorhanden.</p>
      ) : (
        <ul className="divide-y divide-tresor-line">
          {eintraege.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1.5">
                <StatusPunkt status={art === "entnommen" ? "entnommen" : "verfuegbar"} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-tresor-text">
                  Platz {e.position} · {e.beschriftung || e.schluesselnummer || "Ohne Beschriftung"}
                </div>
                <div className="text-xs text-tresor-muted">
                  {e.benutzer_name}
                  {e.standort ? ` · ${e.standort}` : ""}
                  {art === "zurueckgegeben" && e.dauer_sekunden !== null
                    ? ` · außerhalb: ${dauerText(e.dauer_sekunden)}`
                    : ""}
                </div>
              </div>
              <div className="whitespace-nowrap text-xs text-tresor-muted">{datumZeit(e.zeitpunkt)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
