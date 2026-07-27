"use client";

import type { PlatzStatus } from "@/lib/typen";
import { statusText } from "@/lib/format";

export function StatusPunkt({ status }: { status: PlatzStatus }) {
  const farbe: Record<PlatzStatus, string> = {
    verfuegbar: "bg-status-gruen",
    teilweise: "bg-status-gelb",
    entnommen: "bg-status-rot",
    leer: "bg-status-grau",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${farbe[status]}`} aria-hidden />;
}

export function StatusSchild({ status }: { status: PlatzStatus }) {
  const stil: Record<PlatzStatus, string> = {
    verfuegbar: "bg-status-gruen/10 text-status-gruen border-status-gruen/30",
    teilweise: "bg-status-gelb/10 text-[#8a6800] border-status-gelb/40",
    entnommen: "bg-status-rot/10 text-status-rot border-status-rot/30",
    leer: "bg-status-grau/10 text-tresor-muted border-tresor-line",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${stil[status]}`}
    >
      <StatusPunkt status={status} />
      {statusText(status)}
    </span>
  );
}

export function Karte({
  titel,
  wert,
  hinweis,
  akzent,
}: {
  titel: string;
  wert: string | number;
  hinweis?: string;
  akzent?: string;
}) {
  return (
    <div className="rounded-lg border border-tresor-line bg-white p-4">
      <div className="text-sm font-medium text-tresor-muted">{titel}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${akzent ?? "text-tresor-text"}`}>
        {wert}
      </div>
      {hinweis && <div className="mt-1 text-xs text-tresor-muted">{hinweis}</div>}
    </div>
  );
}

export function Hinweis({ art, text }: { art: "fehler" | "erfolg" | "info"; text: string }) {
  const stil = {
    fehler: "border-status-rot/40 bg-status-rot/5 text-status-rot",
    erfolg: "border-status-gruen/40 bg-status-gruen/5 text-status-gruen",
    info: "border-tresor-line bg-tresor-bg text-tresor-text",
  }[art];
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${stil}`} role={art === "fehler" ? "alert" : undefined}>
      {text}
    </div>
  );
}

export function Laden({ text = "Daten werden geladen …" }: { text?: string }) {
  return <div className="p-8 text-center text-sm text-tresor-muted">{text}</div>;
}

export function Leer({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-tresor-line bg-white p-10 text-center">
      <div className="text-base font-semibold text-tresor-text">{titel}</div>
      <div className="mt-1 text-sm text-tresor-muted">{text}</div>
    </div>
  );
}
