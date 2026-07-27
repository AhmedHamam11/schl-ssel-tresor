export type Rolle = "admin" | "mitarbeiter";
export type Status = "verfuegbar" | "entnommen";

export interface Profil {
  id: string;
  name: string;
  email: string;
  rolle: Rolle;
  aktiv: boolean;
  erstellt_am: string;
}

export interface Schluessel {
  id: string;
  position: number;
  schluesselnummer: string;
  anlage: string;
  beschriftung: string;
  farbe: string;
  ist_bund: boolean;
  schluesselanzahl: number;
  kommentar: string;
  status: Status;
  besitzer_id: string | null;
  besitzer_name: string | null;
  standort: string | null;
  verwendungszweck: string | null;
  entnommen_am: string | null;
  rueckgabe_geplant: string | null;
  zuletzt_zurueck_am: string | null;
  letzte_aenderung_durch: string | null;
  erstellt_am: string;
  geaendert_am: string;
}

export type Aktion =
  | "entnommen"
  | "zurueckgegeben"
  | "importiert"
  | "angelegt"
  | "geaendert";

export interface Ereignis {
  id: string;
  key_id: string | null;
  position: number;
  schluesselnummer: string;
  beschriftung: string;
  aktion: Aktion;
  benutzer_id: string | null;
  benutzer_name: string;
  standort: string | null;
  verwendungszweck: string | null;
  dauer_sekunden: number | null;
  zeitpunkt: string;
}

export type PlatzStatus = "leer" | "verfuegbar" | "teilweise" | "entnommen";
