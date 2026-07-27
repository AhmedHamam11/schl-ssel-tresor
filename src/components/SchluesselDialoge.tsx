"use client";

import { useEffect, useState } from "react";
import { useSitzung } from "./Sitzung";
import { Hinweis } from "./Bausteine";
import { fehlerText, datumZeit } from "@/lib/format";
import type { Schluessel } from "@/lib/typen";

function Rahmen({
  titel,
  untertitel,
  schliessen,
  children,
}: {
  titel: string;
  untertitel: string;
  schliessen: () => void;
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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl"
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
const beschriftung = "block text-sm font-medium text-tresor-text";

export function EntnahmeDialog({
  schluessel,
  schliessen,
}: {
  schluessel: Schluessel;
  schliessen: () => void;
}) {
  const { supabase, profil } = useSitzung();
  const [person, setPerson] = useState(profil?.name ?? "");
  const [standort, setStandort] = useState("");
  const [zweck, setZweck] = useState("");
  const [rueckgabe, setRueckgabe] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!person.trim()) return setFehler("Bitte geben Sie an, wer den Schlüssel entnimmt.");
    if (!standort.trim()) return setFehler("Bitte geben Sie den Zielort oder Einsatzort an.");
    setLaeuft(true);
    setFehler(null);

    const jetzt = new Date().toISOString();
    const { error } = await supabase
      .from("keys")
      .update({
        status: "entnommen",
        besitzer_id: profil?.id ?? null,
        besitzer_name: person.trim(),
        standort: standort.trim(),
        verwendungszweck: zweck.trim() || null,
        entnommen_am: jetzt,
        rueckgabe_geplant: rueckgabe ? new Date(rueckgabe).toISOString() : null,
        letzte_aenderung_durch: profil?.name ?? "",
      })
      .eq("id", schluessel.id)
      .eq("status", "verfuegbar");

    if (error) {
      setLaeuft(false);
      return setFehler(fehlerText(error.message));
    }

    await supabase.from("key_events").insert({
      key_id: schluessel.id,
      position: schluessel.position,
      schluesselnummer: schluessel.schluesselnummer,
      beschriftung: schluessel.beschriftung,
      aktion: "entnommen",
      benutzer_id: profil?.id ?? null,
      benutzer_name: person.trim(),
      standort: standort.trim(),
      verwendungszweck: zweck.trim() || null,
      zeitpunkt: jetzt,
    });

    setLaeuft(false);
    schliessen();
  }

  return (
    <Rahmen
      titel="Schlüssel entnehmen"
      untertitel={`Platz ${schluessel.position} · ${schluessel.beschriftung || schluessel.schluesselnummer}`}
      schliessen={schliessen}
    >
      <form onSubmit={absenden} className="grid gap-4">
        {fehler && <Hinweis art="fehler" text={fehler} />}
        <div>
          <label className={beschriftung} htmlFor="person">Wer nimmt den Schlüssel?</label>
          <input id="person" className={eingabe} value={person} onChange={(e) => setPerson(e.target.value)} />
        </div>
        <div>
          <label className={beschriftung} htmlFor="standort">Aktueller Zielort oder Einsatzort</label>
          <input
            id="standort"
            className={eingabe}
            value={standort}
            onChange={(e) => setStandort(e.target.value)}
            placeholder="z. B. Umspannwerk Nord"
          />
        </div>
        <div>
          <label className={beschriftung} htmlFor="zweck">Verwendungszweck (optional)</label>
          <input id="zweck" className={eingabe} value={zweck} onChange={(e) => setZweck(e.target.value)} />
        </div>
        <div>
          <label className={beschriftung} htmlFor="rueckgabe">Geplante Rückgabe (optional)</label>
          <input
            id="rueckgabe"
            type="datetime-local"
            className={eingabe}
            value={rueckgabe}
            onChange={(e) => setRueckgabe(e.target.value)}
          />
        </div>
        <p className="text-xs text-tresor-muted">
          Datum und Uhrzeit der Entnahme werden automatisch gespeichert.
        </p>
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
            className="rounded-md bg-status-rot px-4 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {laeuft ? "Wird gespeichert …" : "Schlüssel entnehmen"}
          </button>
        </div>
      </form>
    </Rahmen>
  );
}

export function RueckgabeDialog({
  schluessel,
  schliessen,
}: {
  schluessel: Schluessel;
  schliessen: () => void;
}) {
  const { supabase, profil } = useSitzung();
  const [person, setPerson] = useState(profil?.name ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!person.trim()) return setFehler("Bitte geben Sie an, wer den Schlüssel zurückgibt.");
    setLaeuft(true);
    setFehler(null);

    const jetzt = new Date().toISOString();
    const dauer = schluessel.entnommen_am
      ? Math.floor((Date.now() - new Date(schluessel.entnommen_am).getTime()) / 1000)
      : null;

    const { error } = await supabase
      .from("keys")
      .update({
        status: "verfuegbar",
        besitzer_id: null,
        besitzer_name: null,
        standort: null,
        verwendungszweck: null,
        entnommen_am: null,
        rueckgabe_geplant: null,
        zuletzt_zurueck_am: jetzt,
        letzte_aenderung_durch: profil?.name ?? "",
      })
      .eq("id", schluessel.id);

    if (error) {
      setLaeuft(false);
      return setFehler(fehlerText(error.message));
    }

    await supabase.from("key_events").insert({
      key_id: schluessel.id,
      position: schluessel.position,
      schluesselnummer: schluessel.schluesselnummer,
      beschriftung: schluessel.beschriftung,
      aktion: "zurueckgegeben",
      benutzer_id: profil?.id ?? null,
      benutzer_name: person.trim(),
      standort: schluessel.standort,
      dauer_sekunden: dauer,
      zeitpunkt: jetzt,
    });

    setLaeuft(false);
    schliessen();
  }

  return (
    <Rahmen
      titel="Schlüssel zurückgeben"
      untertitel={`Ursprüngliche Schlüsselposition: Platz ${schluessel.position}`}
      schliessen={schliessen}
    >
      <form onSubmit={absenden} className="grid gap-4">
        {fehler && <Hinweis art="fehler" text={fehler} />}
        <dl className="rounded-md border border-tresor-line bg-tresor-bg p-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-tresor-muted">Schlüssel</dt>
            <dd className="text-right font-medium">
              {schluessel.beschriftung || schluessel.schluesselnummer}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-tresor-muted">Entnommen von</dt>
            <dd className="text-right font-medium">{schluessel.besitzer_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-tresor-muted">Entnommen am</dt>
            <dd className="text-right font-medium">{datumZeit(schluessel.entnommen_am)}</dd>
          </div>
        </dl>
        <div>
          <label className={beschriftung} htmlFor="rueckgeber">Wer gibt den Schlüssel zurück?</label>
          <input id="rueckgeber" className={eingabe} value={person} onChange={(e) => setPerson(e.target.value)} />
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
            className="rounded-md bg-status-gruen px-4 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {laeuft ? "Wird gespeichert …" : "Schlüssel zurückgeben"}
          </button>
        </div>
      </form>
    </Rahmen>
  );
}
