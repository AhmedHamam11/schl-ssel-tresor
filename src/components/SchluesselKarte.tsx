"use client";

import { useState } from "react";
import type { Schluessel } from "@/lib/typen";
import { StatusSchild } from "./Bausteine";
import { EntnahmeDialog, RueckgabeDialog } from "./SchluesselDialoge";
import { datumZeit, dauerSeit } from "@/lib/format";

export default function SchluesselKarte({ schluessel }: { schluessel: Schluessel }) {
  const [dialog, setDialog] = useState<"entnahme" | "rueckgabe" | null>(null);
  const entnommen = schluessel.status === "entnommen";

  return (
    <div className="rounded-lg border border-tresor-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-tresor-text">
            {schluessel.beschriftung || "Ohne Beschriftung"}
          </div>
          <div className="mt-0.5 text-xs text-tresor-muted">
            Platz {schluessel.position} · Nr. {schluessel.schluesselnummer || "—"}
          </div>
        </div>
        <StatusSchild status={entnommen ? "entnommen" : "verfuegbar"} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <dt className="text-tresor-muted">Anlage</dt>
          <dd className="font-medium text-tresor-text">{schluessel.anlage || "—"}</dd>
        </div>
        <div>
          <dt className="text-tresor-muted">Farbe Anhänger</dt>
          <dd className="font-medium text-tresor-text">{schluessel.farbe || "—"}</dd>
        </div>
        <div>
          <dt className="text-tresor-muted">Art</dt>
          <dd className="font-medium text-tresor-text">
            {schluessel.ist_bund ? "Schlüsselbund" : "Einzelner Schlüssel"}
          </dd>
        </div>
        <div>
          <dt className="text-tresor-muted">Schlüsselanzahl</dt>
          <dd className="font-medium tabular-nums text-tresor-text">{schluessel.schluesselanzahl}</dd>
        </div>
      </dl>

      {schluessel.kommentar && (
        <p className="mt-2 rounded bg-tresor-bg px-2.5 py-1.5 text-xs text-tresor-muted">
          {schluessel.kommentar}
        </p>
      )}

      {entnommen && (
        <dl className="mt-3 rounded-md border border-status-rot/25 bg-status-rot/5 p-3 text-xs">
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-tresor-muted">Aktueller Besitzer</dt>
            <dd className="text-right font-semibold text-tresor-text">{schluessel.besitzer_name}</dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-tresor-muted">Aktueller Standort</dt>
            <dd className="text-right font-medium text-tresor-text">{schluessel.standort ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-tresor-muted">Entnommen am</dt>
            <dd className="text-right font-medium text-tresor-text">{datumZeit(schluessel.entnommen_am)}</dd>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <dt className="text-tresor-muted">Dauer außerhalb</dt>
            <dd className="text-right font-medium text-tresor-text">{dauerSeit(schluessel.entnommen_am)}</dd>
          </div>
          {schluessel.rueckgabe_geplant && (
            <div className="flex justify-between gap-3 py-0.5">
              <dt className="text-tresor-muted">Rückgabe geplant</dt>
              <dd className="text-right font-medium text-tresor-text">
                {datumZeit(schluessel.rueckgabe_geplant)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <button
        onClick={() => setDialog(entnommen ? "rueckgabe" : "entnahme")}
        className={`mt-4 w-full rounded-md px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          entnommen
            ? "bg-status-gruen focus-visible:outline-status-gruen"
            : "bg-tresor-blau focus-visible:outline-tresor-blau"
        }`}
      >
        {entnommen ? "Schlüssel zurückgeben" : "Schlüssel entnehmen"}
      </button>

      {dialog === "entnahme" && (
        <EntnahmeDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
      {dialog === "rueckgabe" && (
        <RueckgabeDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
    </div>
  );
}
