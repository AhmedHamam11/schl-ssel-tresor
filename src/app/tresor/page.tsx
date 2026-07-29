"use client";

import { useMemo, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Laden, StatusPunkt, StatusSchild } from "@/components/Bausteine";
import SchluesselKarte from "@/components/SchluesselKarte";
import { SchluesselFormularDialog } from "@/components/SchluesselVerwaltenDialog";
import { useBestand } from "@/components/Datenbestand";
import { useSitzung } from "@/components/Sitzung";
import { platzStatus, statusFarbe } from "@/lib/status";
import {
  BESCHRIFTUNGSFARBEN,
  anhaengerDesSchluessels,
  farbStil,
  primaereBeschriftung,
} from "@/lib/anhaenger";
import type { FarbStatistik, PlatzStatus, Schluessel } from "@/lib/typen";

const BEREICHE = Array.from({ length: 10 }, (_, i) => ({
  von: i * 50 + 1,
  bis: i * 50 + 50,
}));

export default function TresorSeite() {
  const { schluessel, laedt } = useBestand();
  const { profil } = useSitzung();
  const istAdmin = profil?.rolle === "admin";
  const [bereich, setBereich] = useState(0);
  const [platz, setPlatz] = useState<number | null>(null);
  const [nurBelegte, setNurBelegte] = useState(false);
  const [neuAnlegen, setNeuAnlegen] = useState<number | undefined>(undefined);
  const [dialogOffen, setDialogOffen] = useState(false);

  const proPlatz = useMemo(() => {
    const karte = new Map<number, Schluessel[]>();
    schluessel.forEach((k) => karte.set(k.position, [...(karte.get(k.position) ?? []), k]));
    return karte;
  }, [schluessel]);

  const aktiv = BEREICHE[bereich];
  const plaetze = Array.from({ length: aktiv.bis - aktiv.von + 1 }, (_, i) => aktiv.von + i).filter(
    (nr) => !nurBelegte || (proPlatz.get(nr)?.length ?? 0) > 0
  );

  const farbStatistik = useMemo<FarbStatistik[]>(() => {
    const zaehler = new Map(BESCHRIFTUNGSFARBEN.map((farbe) => [farbe, 0]));
    schluessel
      .filter((k) => k.position >= aktiv.von && k.position <= aktiv.bis)
      .forEach((k) => {
        anhaengerDesSchluessels(k).forEach((a) => {
          if (a.farbe) zaehler.set(a.farbe, (zaehler.get(a.farbe) ?? 0) + 1);
        });
      });
    return BESCHRIFTUNGSFARBEN.map((farbe) => ({ farbe, anzahl: zaehler.get(farbe) ?? 0 })).filter(
      (eintrag) => eintrag.anzahl > 0
    );
  }, [aktiv.bis, aktiv.von, schluessel]);

  const gewaehlt = platz !== null ? proPlatz.get(platz) ?? [] : [];

  function neuenSchluesselAnlegen(vorgabePosition?: number) {
    setNeuAnlegen(vorgabePosition);
    setDialogOffen(true);
  }

  return (
    <SeitenRahmen
      titel="Digitaler Schlüsseltresor"
      beschreibung="Die Plätze 1 bis 500 in Bereichen zu je 50. Ein Klick auf einen Platz zeigt alle dort hinterlegten Schlüssel."
      aktion={
        istAdmin ? (
          <button
            onClick={() => neuenSchluesselAnlegen(platz ?? undefined)}
            className="rounded-md bg-tresor-blau px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Schlüssel hinzufügen
          </button>
        ) : undefined
      }
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-tresor-line bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-tresor-text">Statusfarben</span>
            {(["verfuegbar", "teilweise", "entnommen", "leer"] as PlatzStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-2 text-tresor-muted">
                <StatusPunkt status={s} />
                {s === "verfuegbar" && "Verfügbar"}
                {s === "teilweise" && "Teilweise verfügbar"}
                {s === "entnommen" && "Entnommen"}
                {s === "leer" && "Kein Schlüssel zugeordnet"}
              </span>
            ))}
            <label className="ml-auto flex items-center gap-2 text-tresor-text">
              <input
                type="checkbox"
                checked={nurBelegte}
                onChange={(e) => setNurBelegte(e.target.checked)}
                className="h-4 w-4 rounded border-tresor-line"
              />
              Nur belegte Plätze anzeigen
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {BEREICHE.map((b, i) => {
              const anzahl = schluessel.filter(
                (k) => k.position >= b.von && k.position <= b.bis
              ).length;
              return (
                <button
                  key={b.von}
                  onClick={() => {
                    setBereich(i);
                    setPlatz(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    i === bereich
                      ? "bg-tresor-blau text-white"
                      : "border border-tresor-line bg-white text-tresor-text hover:bg-tresor-bg"
                  }`}
                >
                  {b.von}–{b.bis}
                  <span
                    className={`ml-1.5 text-xs font-normal ${
                      i === bereich ? "text-white/70" : "text-tresor-muted"
                    }`}
                  >
                    ({anzahl})
                  </span>
                </button>
              );
            })}
          </div>

          {farbStatistik.length > 0 && (
            <div className="rounded-lg border border-tresor-line bg-white px-4 py-3">
              <div className="text-sm font-semibold text-tresor-text">
                Anhängerfarben im Bereich {aktiv.von}–{aktiv.bis}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {farbStatistik.map((eintrag) => {
                  const stil = farbStil(eintrag.farbe);
                  return (
                    <span
                      key={eintrag.farbe}
                      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
                      style={{ borderColor: stil.rand }}
                    >
                      <span
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: stil.hintergrund, borderColor: stil.rand }}
                        aria-hidden
                      />
                      {eintrag.farbe}
                      <strong className="tabular-nums">{eintrag.anzahl}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {plaetze.length === 0 ? (
            <div className="rounded-lg border border-dashed border-tresor-line bg-white p-10 text-center text-sm text-tresor-muted">
              In diesem Bereich ist kein Platz belegt. Entfernen Sie den Filter oder wählen Sie einen anderen Bereich.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-10">
              {plaetze.map((nr) => {
                const eintraege = proPlatz.get(nr) ?? [];
                const status = platzStatus(eintraege);
                const ausgewaehlt = platz === nr;
                return (
                  <button
                    key={nr}
                    onClick={() => setPlatz(ausgewaehlt ? null : nr)}
                    aria-label={`Platz ${nr}, ${eintraege.length} Einträge`}
                    className={`relative overflow-hidden rounded-lg border bg-white p-2 text-left transition hover:border-tresor-blau focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tresor-blau ${
                      ausgewaehlt ? "border-tresor-blau ring-2 ring-tresor-blau/25" : "border-tresor-line"
                    }`}
                  >
                    <span className={`absolute inset-x-0 top-0 h-1.5 ${statusFarbe[status]}`} />
                    <div className="pt-2 text-xl font-bold tabular-nums leading-none text-tresor-text">
                      {nr}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-tresor-muted">
                      {eintraege.length === 0
                        ? "leer"
                        : eintraege.length === 1
                          ? primaereBeschriftung(eintraege[0])
                          : `${eintraege.length} Einträge`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {platz !== null && (
            <section className="rounded-lg border border-tresor-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tresor-line pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold tabular-nums text-tresor-text">{platz}</span>
                  <div>
                    <div className="text-sm font-semibold text-tresor-text">Platz {platz}</div>
                    <div className="text-xs text-tresor-muted">
                      {gewaehlt.length} {gewaehlt.length === 1 ? "Eintrag" : "Einträge"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusSchild status={platzStatus(gewaehlt)} />
                  {istAdmin && (
                    <button
                      onClick={() => neuenSchluesselAnlegen(platz)}
                      className="rounded-md border border-tresor-blau px-3 py-1.5 text-sm font-semibold text-tresor-blau hover:bg-tresor-blau/5"
                    >
                      Schlüssel hinzufügen
                    </button>
                  )}
                  <button
                    onClick={() => setPlatz(null)}
                    className="rounded-md border border-tresor-line px-3 py-1.5 text-sm font-medium hover:bg-tresor-bg"
                  >
                    Schließen
                  </button>
                </div>
              </div>

              {gewaehlt.length === 0 ? (
                <p className="py-8 text-center text-sm text-tresor-muted">
                  Diesem Platz ist derzeit kein Schlüssel zugeordnet.
                  {istAdmin
                    ? " Nutzen Sie „Schlüssel hinzufügen“, um einen Eintrag anzulegen."
                    : " Ein Administrator kann hier einen Schlüssel hinterlegen."}
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {gewaehlt.map((k) => (
                    <SchluesselKarte key={k.id} schluessel={k} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {dialogOffen && istAdmin && (
        <SchluesselFormularDialog
          vorgabePosition={neuAnlegen}
          schliessen={() => setDialogOffen(false)}
        />
      )}
    </SeitenRahmen>
  );
}
