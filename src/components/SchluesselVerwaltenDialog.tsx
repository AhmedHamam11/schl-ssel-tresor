"use client";

import { useState } from "react";
import { useSitzung } from "./Sitzung";
import { Hinweis } from "./Bausteine";
import { fehlerText } from "@/lib/format";
import type { Schluessel } from "@/lib/typen";

function Rahmen({
  titel,
  untertitel,
  schliessen,
  breit = false,
  children,
}: {
  titel: string;
  untertitel: string;
  schliessen: () => void;
  breit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl ${
          breit ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <h2 className="text-lg font-bold text-tresor-text">{titel}</h2>
        <p className="mt-1 text-sm text-tresor-muted">{untertitel}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

const eingabe =
  "mt-1 w-full rounded-md border border-tresor-line bg-white px-3 py-2.5 text-sm text-tresor-text placeholder:text-tresor-muted focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30";
const beschriftungsKlasse = "block text-sm font-medium text-tresor-text";

interface Formular {
  position: string;
  schluesselnummer: string;
  anlage: string;
  beschriftung: string;
  farbe: string;
  ist_bund: boolean;
  schluesselanzahl: string;
  kommentar: string;
}

function leeresFormular(vorgabePosition?: number): Formular {
  return {
    position: vorgabePosition ? String(vorgabePosition) : "",
    schluesselnummer: "",
    anlage: "",
    beschriftung: "",
    farbe: "",
    ist_bund: false,
    schluesselanzahl: "1",
    kommentar: "",
  };
}

function ausSchluessel(k: Schluessel): Formular {
  return {
    position: String(k.position),
    schluesselnummer: k.schluesselnummer,
    anlage: k.anlage,
    beschriftung: k.beschriftung,
    farbe: k.farbe,
    ist_bund: k.ist_bund,
    schluesselanzahl: String(k.schluesselanzahl),
    kommentar: k.kommentar,
  };
}

/** Formular zum Anlegen oder Bearbeiten eines Schluessels. Nur fuer Administratoren sichtbar. */
export function SchluesselFormularDialog({
  schluessel,
  vorgabePosition,
  schliessen,
}: {
  schluessel?: Schluessel;
  vorgabePosition?: number;
  schliessen: () => void;
}) {
  const { supabase, profil } = useSitzung();
  const bearbeiten = Boolean(schluessel);
  const [feld, setFeld] = useState<Formular>(
    schluessel ? ausSchluessel(schluessel) : leeresFormular(vorgabePosition)
  );
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  function setzen<K extends keyof Formular>(name: K, wert: Formular[K]) {
    setFeld((alt) => ({ ...alt, [name]: wert }));
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);

    const position = Number(feld.position);
    if (!Number.isInteger(position) || position < 1 || position > 500) {
      setFehler("Bitte wählen Sie einen Tresorplatz zwischen 1 und 500.");
      return;
    }
    if (!feld.schluesselnummer.trim() && !feld.beschriftung.trim()) {
      setFehler("Bitte geben Sie mindestens eine Schlüsselnummer oder eine Beschriftung an.");
      return;
    }
    const anzahl = Number(feld.schluesselanzahl);
    if (!Number.isInteger(anzahl) || anzahl < 1) {
      setFehler("Die Schlüsselanzahl muss eine ganze Zahl ab 1 sein.");
      return;
    }

    setLaeuft(true);

    const satz = {
      position,
      schluesselnummer: feld.schluesselnummer.trim(),
      anlage: feld.anlage.trim(),
      beschriftung: feld.beschriftung.trim(),
      farbe: feld.farbe.trim(),
      ist_bund: feld.ist_bund,
      schluesselanzahl: anzahl,
      kommentar: feld.kommentar.trim(),
      letzte_aenderung_durch: profil?.name ?? "",
    };

    if (bearbeiten && schluessel) {
      const { error } = await supabase.from("keys").update(satz).eq("id", schluessel.id);
      if (error) {
        setLaeuft(false);
        setFehler(fehlerText(error.message));
        return;
      }
      await supabase.from("key_events").insert({
        key_id: schluessel.id,
        position,
        schluesselnummer: satz.schluesselnummer,
        beschriftung: satz.beschriftung,
        aktion: "geaendert",
        benutzer_id: profil?.id ?? null,
        benutzer_name: profil?.name ?? "",
      });
    } else {
      const { data, error } = await supabase.from("keys").insert(satz).select("id").single();
      if (error) {
        setLaeuft(false);
        setFehler(fehlerText(error.message));
        return;
      }
      await supabase.from("key_events").insert({
        key_id: data?.id ?? null,
        position,
        schluesselnummer: satz.schluesselnummer,
        beschriftung: satz.beschriftung,
        aktion: "angelegt",
        benutzer_id: profil?.id ?? null,
        benutzer_name: profil?.name ?? "",
      });
    }

    setLaeuft(false);
    schliessen();
  }

  return (
    <Rahmen
      titel={bearbeiten ? "Schlüssel bearbeiten" : "Schlüssel hinzufügen"}
      untertitel={
        bearbeiten
          ? `Platz ${schluessel!.position} · ${schluessel!.beschriftung || schluessel!.schluesselnummer}`
          : "Legen Sie einen neuen Einzelschlüssel oder Schlüsselbund im Tresor an."
      }
      schliessen={schliessen}
      breit
    >
      <form onSubmit={absenden} className="grid gap-4">
        {fehler && <Hinweis art="fehler" text={fehler} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sv-position" className={beschriftungsKlasse}>
              Tresorplatz (1–500)
            </label>
            <input
              id="sv-position"
              type="number"
              min={1}
              max={500}
              required
              className={eingabe}
              value={feld.position}
              onChange={(e) => setzen("position", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sv-nummer" className={beschriftungsKlasse}>
              Schlüsselnummer
            </label>
            <input
              id="sv-nummer"
              className={eingabe}
              value={feld.schluesselnummer}
              onChange={(e) => setzen("schluesselnummer", e.target.value)}
              placeholder="z. B. S-1050"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sv-anlage" className={beschriftungsKlasse}>
            Anlage/Zugehörigkeit
          </label>
          <input
            id="sv-anlage"
            className={eingabe}
            value={feld.anlage}
            onChange={(e) => setzen("anlage", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="sv-beschriftung" className={beschriftungsKlasse}>
            Beschriftung des Schlüsselanhängers
          </label>
          <input
            id="sv-beschriftung"
            className={eingabe}
            value={feld.beschriftung}
            onChange={(e) => setzen("beschriftung", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sv-farbe" className={beschriftungsKlasse}>
              Farbe des Schlüsselanhängers
            </label>
            <input
              id="sv-farbe"
              className={eingabe}
              value={feld.farbe}
              onChange={(e) => setzen("farbe", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sv-anzahl" className={beschriftungsKlasse}>
              Schlüsselanzahl
            </label>
            <input
              id="sv-anzahl"
              type="number"
              min={1}
              className={eingabe}
              value={feld.schluesselanzahl}
              onChange={(e) => setzen("schluesselanzahl", e.target.value)}
            />
          </div>
        </div>

        <fieldset>
          <legend className={beschriftungsKlasse}>Art</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${
                !feld.ist_bund
                  ? "border-tresor-blau bg-tresor-blau/5 text-tresor-blau"
                  : "border-tresor-line text-tresor-text"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={!feld.ist_bund}
                onChange={() => setzen("ist_bund", false)}
              />
              Einzelschlüssel
            </label>
            <label
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${
                feld.ist_bund
                  ? "border-tresor-blau bg-tresor-blau/5 text-tresor-blau"
                  : "border-tresor-line text-tresor-text"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={feld.ist_bund}
                onChange={() => setzen("ist_bund", true)}
              />
              Schlüsselbund
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="sv-kommentar" className={beschriftungsKlasse}>
            Kommentar
          </label>
          <textarea
            id="sv-kommentar"
            rows={2}
            className={eingabe}
            value={feld.kommentar}
            onChange={(e) => setzen("kommentar", e.target.value)}
          />
        </div>

        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={schliessen}
            className="rounded-md border border-tresor-line px-4 py-3 text-sm font-semibold text-tresor-text hover:bg-tresor-bg"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={laeuft}
            className="rounded-md bg-tresor-blau px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {laeuft
              ? "Wird gespeichert …"
              : bearbeiten
              ? "Änderungen speichern"
              : "Schlüssel anlegen"}
          </button>
        </div>
      </form>
    </Rahmen>
  );
}

/** Bestätigungsdialog vor dem Löschen eines Schluessels. Nur fuer Administratoren sichtbar. */
export function SchluesselLoeschenDialog({
  schluessel,
  schliessen,
}: {
  schluessel: Schluessel;
  schliessen: () => void;
}) {
  const { supabase, profil } = useSitzung();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function loeschen() {
    setLaeuft(true);
    setFehler(null);

    await supabase.from("key_events").insert({
      key_id: schluessel.id,
      position: schluessel.position,
      schluesselnummer: schluessel.schluesselnummer,
      beschriftung: schluessel.beschriftung,
      aktion: "geloescht",
      benutzer_id: profil?.id ?? null,
      benutzer_name: profil?.name ?? "",
    });

    const { error } = await supabase.from("keys").delete().eq("id", schluessel.id);
    if (error) {
      setLaeuft(false);
      setFehler(fehlerText(error.message));
      return;
    }

    setLaeuft(false);
    schliessen();
  }

  return (
    <Rahmen
      titel="Schlüssel löschen"
      untertitel="Dieser Vorgang kann nicht rückgängig gemacht werden."
      schliessen={schliessen}
    >
      <div className="grid gap-4">
        {fehler && <Hinweis art="fehler" text={fehler} />}
        <div className="rounded-md border border-status-rot/30 bg-status-rot/5 p-4 text-sm">
          <p className="text-tresor-text">
            Möchten Sie diesen Schlüssel wirklich endgültig aus dem Tresor entfernen?
          </p>
          <dl className="mt-3 grid gap-1">
            <div className="flex justify-between gap-3">
              <dt className="text-tresor-muted">Tresorplatz</dt>
              <dd className="font-semibold text-tresor-text">{schluessel.position}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-tresor-muted">Beschriftung</dt>
              <dd className="font-semibold text-tresor-text">
                {schluessel.beschriftung || schluessel.schluesselnummer || "Ohne Beschriftung"}
              </dd>
            </div>
            {schluessel.status === "entnommen" && (
              <div className="flex justify-between gap-3">
                <dt className="text-tresor-muted">Hinweis</dt>
                <dd className="font-semibold text-status-rot">
                  Dieser Schlüssel ist derzeit entnommen.
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={schliessen}
            className="rounded-md border border-tresor-line px-4 py-3 text-sm font-semibold text-tresor-text hover:bg-tresor-bg"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={loeschen}
            disabled={laeuft}
            className="rounded-md bg-status-rot px-4 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {laeuft ? "Wird gelöscht …" : "Endgültig löschen"}
          </button>
        </div>
      </div>
    </Rahmen>
  );
}
