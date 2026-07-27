import type { PlatzStatus, Schluessel } from "./typen";

export function platzStatus(eintraege: Schluessel[]): PlatzStatus {
  if (eintraege.length === 0) return "leer";
  const entnommen = eintraege.filter((k) => k.status === "entnommen").length;
  if (entnommen === 0) return "verfuegbar";
  if (entnommen === eintraege.length) return "entnommen";
  return "teilweise";
}

export const statusFarbe: Record<PlatzStatus, string> = {
  verfuegbar: "bg-status-gruen",
  teilweise: "bg-status-gelb",
  entnommen: "bg-status-rot",
  leer: "bg-status-grau",
};

export const statusRand: Record<PlatzStatus, string> = {
  verfuegbar: "border-status-gruen/50",
  teilweise: "border-status-gelb/60",
  entnommen: "border-status-rot/50",
  leer: "border-tresor-line",
};
