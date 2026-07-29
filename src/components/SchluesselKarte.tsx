"use client";

import { useState } from "react";
import type { Schluessel } from "@/lib/typen";
import { StatusSchild } from "./Bausteine";
import { EntnahmeDialog, RueckgabeDialog } from "./SchluesselDialoge";
import { SchluesselFormularDialog, SchluesselLoeschenDialog } from "./SchluesselVerwaltenDialog";
import { useSitzung } from "./Sitzung";
import { datumZeit, dauerSeit, farbText, farbCss } from "@/lib/format";

export default function SchluesselKarte({ schluessel }: { schluessel: Schluessel }) {
  const { profil } = useSitzung();
  const istAdmin = profil?.rolle === "admin";
  const [dialog, setDialog] = useState<"entnahme" | "rueckgabe" | "bearbeiten" | "loeschen" | null>(
    null
  );
  const entnommen = schluessel.status === "entnommen";

  return (
    <div className="rounded-lg border border-tresor-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-tresor-text">
              {schluessel.beschriftung || "Ohne Beschriftung"}
            </span>
            {schluessel.beschriftung_farbe && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  schluessel.beschriftung_farbe === "Weiß"
                    ? "border border-gray-300 bg-white text-gray-700"
                    : "text-white"
                }`}
                style={{
                  backgroundColor:
                    schluessel.beschriftung_farbe === "Weiß"
                      ? "white"
                      : schluessel.beschriftung_farbe === "Blau"
                        ? "#3b82f6"
                        : schluessel.beschriftung_farbe === "Rot"
                          ? "#ef4444"
                          : schluessel.beschriftung_farbe === "Grau"
                            ? "#6b7280"
                            : schluessel.beschriftung_farbe === "Violett"
                              ? "#8b5cf6"
                              : schluessel.beschriftung_farbe === "Orange"
                                ? "#f97316"
                                : schluessel.beschriftung_farbe === "Schwarz"
                                  ? "#1f2937"
                                  : schluessel.beschriftung_farbe === "Gelb"
                                    ? "#eab308"
                                    : schluessel.beschriftung_farbe === "Grün"
                                      ? "#22c55e"
                                      : "#9ca3af",
                }}
              >
                {farbText(schluessel.beschriftung_farbe)}
              </span>
            )}
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

      {istAdmin && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setDialog("bearbeiten")}
            className="rounded-md border border-tresor-line px-3 py-2 text-xs font-semibold text-tresor-text hover:bg-tresor-bg"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => setDialog("loeschen")}
            className="rounded-md border border-status-rot/30 px-3 py-2 text-xs font-semibold text-status-rot hover:bg-status-rot/5"
          >
            Löschen
          </button>
        </div>
      )}

      {dialog === "entnahme" && (
        <EntnahmeDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
      {dialog === "rueckgabe" && (
        <RueckgabeDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
      {dialog === "bearbeiten" && istAdmin && (
        <SchluesselFormularDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
      {dialog === "loeschen" && istAdmin && (
        <SchluesselLoeschenDialog schluessel={schluessel} schliessen={() => setDialog(null)} />
      )}
    </div>
  );
}
