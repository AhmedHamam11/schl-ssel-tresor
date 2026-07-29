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
  beschriftung_farbe: BeschriftungFarbe;
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

export type BeschriftungFarbe =
  | "Blau"
  | "Rot"
  | "Grau"
  | "Weiß"
  | "Violett"
  | "Orange"
  | "Schwarz"
  | "Gelb"
  | "Grün";

export type Aktion =
  | "entnommen"
  | "zurueckgegeben"
  | "importiert"
  | "angelegt"
  | "geaendert"
  | "geloescht";

export interface Ereignis {
  id: string;
  key_id: string | null;
  position: number;
  schluesselnummer: string;
  beschriftung: string;
  anlage: string;
  aktion: Aktion;
  benutzer_id: string | null;
  benutzer_name: string;
  standort: string | null;
  verwendungszweck: string | null;
  dauer_sekunden: number | null;
  zeitpunkt: string;
}

export type PlatzStatus = "leer" | "verfuegbar" | "teilweise" | "entnommen";

export interface Benachrichtigungseinstellungen {
  id: number;
  bei_entnahme: boolean;
  bei_rueckgabe: boolean;
  bei_neuem_schluessel: boolean;
  bei_loeschung: boolean;
  geaendert_am: string;
  geaendert_durch: string;
}

export type Versandstatus = "erfolgreich" | "fehlgeschlagen" | "uebersprungen";

export interface Benachrichtigungsprotokoll {
  id: string;
  event_id: string;
  aktion: string;
  status: Versandstatus;
  empfaenger: string[];
  empfaenger_anzahl: number;
  fehlermeldung: string | null;
  resend_id: string | null;
  zeitpunkt: string;
}

export interface FarbStatistik {
  farbe: BeschriftungFarbe;
  anzahl: number;
}
