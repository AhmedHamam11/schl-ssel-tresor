import type { SupabaseClient } from "@supabase/supabase-js";
import type { Schluessel, SchluesselAnhaenger } from "./typen";

export interface SchluesselStammdaten {
  position: number;
  schluesselnummer: string;
  anlage: string;
  anhaenger: SchluesselAnhaenger[];
  ist_bund: boolean;
  schluesselanzahl: number;
  kommentar: string;
}

function rpcFehler(error: { message?: string } | null): never {
  throw new Error(error?.message || "Die Aktion konnte nicht gespeichert werden.");
}

export async function schluesselAnlegen(
  supabase: SupabaseClient,
  daten: SchluesselStammdaten
): Promise<Schluessel> {
  const { data, error } = await supabase.rpc("schluessel_anlegen", { p_daten: daten });
  if (error) rpcFehler(error);
  return data as Schluessel;
}

export async function schluesselAendern(
  supabase: SupabaseClient,
  id: string,
  daten: SchluesselStammdaten
): Promise<Schluessel> {
  const { data, error } = await supabase.rpc("schluessel_aendern", {
    p_key_id: id,
    p_daten: daten,
  });
  if (error) rpcFehler(error);
  return data as Schluessel;
}

export async function schluesselLoeschen(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.rpc("schluessel_loeschen", { p_key_id: id });
  if (error) rpcFehler(error);
}

export async function schluesselEntnehmen(
  supabase: SupabaseClient,
  eingabe: {
    id: string;
    besitzerName: string;
    standort: string;
    verwendungszweck: string | null;
    rueckgabeGeplant: string | null;
  }
): Promise<Schluessel> {
  const { data, error } = await supabase.rpc("schluessel_entnehmen", {
    p_key_id: eingabe.id,
    p_besitzer_name: eingabe.besitzerName,
    p_standort: eingabe.standort,
    p_verwendungszweck: eingabe.verwendungszweck,
    p_rueckgabe_geplant: eingabe.rueckgabeGeplant,
  });
  if (error) rpcFehler(error);
  return data as Schluessel;
}

export async function schluesselZurueckgeben(
  supabase: SupabaseClient,
  eingabe: { id: string; rueckgeberName: string }
): Promise<Schluessel> {
  const { data, error } = await supabase.rpc("schluessel_zurueckgeben", {
    p_key_id: eingabe.id,
    p_rueckgeber_name: eingabe.rueckgeberName,
  });
  if (error) rpcFehler(error);
  return data as Schluessel;
}

export async function bestandImportieren(
  supabase: SupabaseClient,
  eingabe: {
    daten: SchluesselStammdaten[];
    ersetzen: boolean;
    dateiname: string;
  }
): Promise<number> {
  const { data, error } = await supabase.rpc("bestand_importieren", {
    p_daten: eingabe.daten,
    p_ersetzen: eingabe.ersetzen,
    p_dateiname: eingabe.dateiname,
  });
  if (error) rpcFehler(error);
  return Number(data ?? eingabe.daten.length);
}
