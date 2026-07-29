"use client";

import { useEffect, useMemo, useState } from "react";
import { useSitzung } from "./Sitzung";
import { useBestand } from "./Datenbestand";
import { Hinweis } from "./Bausteine";
import { fehlerText } from "@/lib/format";
import {
  BESCHRIFTUNGSFARBEN,
  anhaengerDesSchluessels,
  farbStil,
} from "@/lib/anhaenger";
import {
  schluesselAendern,
  schluesselAnlegen,
  schluesselLoeschen,
} from "@/lib/schluesselAktionen";
import type { BeschriftungFarbe, Schluessel } from "@/lib/typen";

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
  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === "Escape" && schliessen();
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [schliessen]);

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-tresor-text">{titel}</h2>
            <p className="mt-1 text-sm text-tresor-muted">{untertitel}</p>
          </div>
          <button
            type="button"
            onClick={schliessen}
            aria-label="Dialog schließen"
            className="rounded-md border border-tresor-line px-2.5 py-1.5 text-sm text-tresor-muted hover:bg-tresor-bg"
          >
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

const eingabe =
  "mt-1 w-full rounded-md border border-tresor-line bg-white px-3 py-2.5 text-sm text-tresor-text placeholder:text-tresor-muted focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30";
const beschriftungsKlasse = "block text-sm font-medium text-tresor-text";

type FormularFarbe = BeschriftungFarbe | "";

interface FormularAnhaenger {
  id: string;
  text: string;
  farbe: FormularFarbe;
}

interface Formular {
  position: string;
  schluesselnummer: string;
  anlage: string;
  anhaenger: FormularAnhaenger[];
  ist_bund: boolean;
  schluesselanzahl: string;
  kommentar: string;
}

let anhaengerZaehler = 0;
function formularAnhaenger(text = "", farbe: FormularFarbe = ""): FormularAnhaenger {
  anhaengerZaehler += 1;
  return { id: `anhaenger-${anhaengerZaehler}`, text, farbe };
}

function leeresFormular(vorgabePosition?: number): Formular {
  return {
    position: vorgabePosition ? String(vorgabePosition) : "",
    schluesselnummer: "",
    anlage: "",
    anhaenger: [formularAnhaenger()],
    ist_bund: false,
    schluesselanzahl: "1",
    kommentar: "",
  };
}

function ausSchluessel(k: Schluessel): Formular {
  const anhaenger = anhaengerDesSchluessels(k).map((a) =>
    formularAnhaenger(a.text, a.farbe ?? "")
  );
  return {
    position: String(k.position),
    schluesselnummer: k.schluesselnummer,
    anlage: k.anlage,
    anhaenger: anhaenger.length ? anhaenger : [formularAnhaenger()],
    ist_bund: k.ist_bund,
    schluesselanzahl: String(k.schluesselanzahl),
    kommentar: k.kommentar,
  };
}

/** Formular zum Anlegen oder Bearbeiten eines Schlüssels. Nur für Administratoren sichtbar. */
export function SchluesselFormularDialog({
  schluessel,
  vorgabePosition,
  schliessen,
}: {
  schluessel?: Schluessel;
  vorgabePosition?: number;
  schliessen: () => void;
}) {
  const { supabase } = useSitzung();
  const { neuLaden } = useBestand();
  const bearbeiten = Boolean(schluessel);
  const [feld, setFeld] = useState<Formular>(
    schluessel ? ausSchluessel(schluessel) : leeresFormular(vorgabePosition)
  );
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const titelText = useMemo(() => {
    const erster = feld.anhaenger.find((a) => a.text.trim());
    return erster?.text || feld.schluesselnummer || "Ohne Beschriftung";
  }, [feld.anhaenger, feld.schluesselnummer]);

  function setzen<K extends Exclude<keyof Formular, "anhaenger">>(name: K, wert: Formular[K]) {
    setFeld((alt) => ({ ...alt, [name]: wert }));
  }

  function anhaengerAendern(
    id: string,
    name: "text" | "farbe",
    wert: string
  ) {
    setFeld((alt) => ({
      ...alt,
      anhaenger: alt.anhaenger.map((a) =>
        a.id === id ? { ...a, [name]: wert as FormularAnhaenger[typeof name] } : a
      ),
    }));
  }

  function anhaengerHinzufuegen() {
    setFeld((alt) => ({ ...alt, anhaenger: [...alt.anhaenger, formularAnhaenger()] }));
  }

  function anhaengerEntfernen(id: string) {
    setFeld((alt) => {
      const rest = alt.anhaenger.filter((a) => a.id !== id);
      return { ...alt, anhaenger: rest.length ? rest : [formularAnhaenger()] };
    });
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);

    const position = Number(feld.position);
    if (!Number.isInteger(position) || position < 1 || position > 500) {
      setFehler("Bitte wählen Sie einen Tresorplatz zwischen 1 und 500.");
      return;
    }

    const anhaenger = feld.anhaenger
      .map((a) => ({ text: a.text.trim(), farbe: a.farbe || null }))
      .filter((a) => a.text);

    if (!feld.schluesselnummer.trim() && anhaenger.length === 0) {
      setFehler("Bitte geben Sie mindestens eine Schlüsselnummer oder einen Anhängertext an.");
      return;
    }

    const anzahl = Number(feld.schluesselanzahl);
    if (!Number.isInteger(anzahl) || anzahl < 1) {
      setFehler("Die Schlüsselanzahl muss eine ganze Zahl ab 1 sein.");
      return;
    }

    setLaeuft(true);
    try {
      const daten = {
        position,
        schluesselnummer: feld.schluesselnummer.trim(),
        anlage: feld.anlage.trim(),
        anhaenger,
        ist_bund: feld.ist_bund,
        schluesselanzahl: anzahl,
        kommentar: feld.kommentar.trim(),
      };

      if (bearbeiten && schluessel) {
        await schluesselAendern(supabase, schluessel.id, daten);
      } else {
        await schluesselAnlegen(supabase, daten);
      }

      await neuLaden();
      schliessen();
    } catch (error) {
      setFehler(fehlerText(error instanceof Error ? error.message : undefined));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Rahmen
      titel={bearbeiten ? "Schlüssel bearbeiten" : "Schlüssel hinzufügen"}
      untertitel={
        bearbeiten
          ? `Platz ${schluessel!.position} · ${titelText}`
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

        <fieldset className="rounded-lg border border-tresor-line bg-tresor-bg/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-tresor-text">Schlüsselanhänger</div>
              <p className="mt-1 text-xs text-tresor-muted">
                Jeder Anhänger besitzt einen eigenen Text und optional eine eigene Farbe.
              </p>
            </div>
            <button
              type="button"
              onClick={anhaengerHinzufuegen}
              className="rounded-md border border-tresor-blau bg-white px-3 py-2 text-xs font-semibold text-tresor-blau hover:bg-tresor-blau/5"
            >
              Weiteren Anhänger hinzufügen
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {feld.anhaenger.map((a, index) => {
              const stil = farbStil(a.farbe || null);
              return (
                <div
                  key={a.id}
                  className="grid gap-3 rounded-md border border-tresor-line bg-white p-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end"
                >
                  <div>
                    <label htmlFor={`anhaenger-text-${a.id}`} className={beschriftungsKlasse}>
                      Text Anhänger {index + 1}
                    </label>
                    <input
                      id={`anhaenger-text-${a.id}`}
                      className={eingabe}
                      value={a.text}
                      onChange={(e) => anhaengerAendern(a.id, "text", e.target.value)}
                      placeholder="z. B. Tor Nord"
                    />
                  </div>
                  <div>
                    <label htmlFor={`anhaenger-farbe-${a.id}`} className={beschriftungsKlasse}>
                      Farbe
                    </label>
                    <div className="flex items-center gap-2">
                      {a.farbe && (
                        <span
                          className="mt-1 h-5 w-5 shrink-0 rounded-full border"
                          style={{ backgroundColor: stil.hintergrund, borderColor: stil.rand }}
                          aria-hidden
                        />
                      )}
                      <select
                        id={`anhaenger-farbe-${a.id}`}
                        className={eingabe}
                        value={a.farbe}
                        onChange={(e) => anhaengerAendern(a.id, "farbe", e.target.value)}
                      >
                        <option value="">Keine Farbe ausgewählt</option>
                        {BESCHRIFTUNGSFARBEN.map((farbe) => (
                          <option key={farbe} value={farbe}>
                            {farbe}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => anhaengerEntfernen(a.id)}
                    className="rounded-md border border-status-rot/30 px-3 py-2.5 text-xs font-semibold text-status-rot hover:bg-status-rot/5"
                    aria-label={`Anhänger ${index + 1} entfernen`}
                  >
                    Entfernen
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className={beschriftungsKlasse}>Art</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center rounded-md border px-3 py-2.5 text-sm font-medium ${
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
                className={`flex items-center justify-center rounded-md border px-3 py-2.5 text-sm font-medium ${
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

/** Bestätigungsdialog vor dem Löschen eines Schlüssels. Nur für Administratoren sichtbar. */
export function SchluesselLoeschenDialog({
  schluessel,
  schliessen,
}: {
  schluessel: Schluessel;
  schliessen: () => void;
}) {
  const { supabase } = useSitzung();
  const { neuLaden } = useBestand();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function loeschen() {
    setLaeuft(true);
    setFehler(null);
    try {
      await schluesselLoeschen(supabase, schluessel.id);
      await neuLaden();
      schliessen();
    } catch (error) {
      setFehler(fehlerText(error instanceof Error ? error.message : undefined));
    } finally {
      setLaeuft(false);
    }
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
              <dd className="text-right font-semibold text-tresor-text">
                {anhaengerDesSchluessels(schluessel).map((a) => a.text).join(", ") ||
                  schluessel.schluesselnummer ||
                  "Ohne Beschriftung"}
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
