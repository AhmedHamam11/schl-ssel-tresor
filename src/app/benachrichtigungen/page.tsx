"use client";

import { useCallback, useEffect, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Hinweis, Laden } from "@/components/Bausteine";
import { useSitzung } from "@/components/Sitzung";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { aktionText, datumZeit } from "@/lib/format";
import type {
  Benachrichtigungseinstellungen,
  Benachrichtigungsprotokoll,
} from "@/lib/typen";

type SchalterName =
  | "bei_entnahme"
  | "bei_rueckgabe"
  | "bei_neuem_schluessel"
  | "bei_loeschung";

const SCHALTER: { name: SchalterName; titel: string; text: string }[] = [
  {
    name: "bei_entnahme",
    titel: "Bei Entnahme",
    text: "Alle aktiven Benutzer erhalten eine E-Mail, sobald ein Schlüssel entnommen wird.",
  },
  {
    name: "bei_rueckgabe",
    titel: "Bei Rückgabe",
    text: "Alle aktiven Benutzer erhalten eine E-Mail, sobald ein Schlüssel zurückgegeben wird.",
  },
  {
    name: "bei_neuem_schluessel",
    titel: "Bei neuem Schlüssel",
    text: "Alle aktiven Benutzer erhalten eine E-Mail, sobald ein Schlüssel angelegt wird.",
  },
  {
    name: "bei_loeschung",
    titel: "Bei Löschung",
    text: "Alle aktiven Benutzer erhalten eine E-Mail, sobald ein Schlüssel gelöscht wird.",
  },
];

function Schalter({
  an,
  aktiv,
  umschalten,
  beschriftung,
}: {
  an: boolean;
  aktiv: boolean;
  umschalten: () => void;
  beschriftung: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      aria-label={beschriftung}
      disabled={!aktiv}
      onClick={umschalten}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        an ? "bg-status-gruen" : "bg-status-grau"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          an ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function BenachrichtigungenSeite() {
  const { profil } = useSitzung();
  const istAdmin = profil?.rolle === "admin";

  const [einstellungen, setEinstellungen] =
    useState<Benachrichtigungseinstellungen | null>(null);
  const [protokoll, setProtokoll] = useState<Benachrichtigungsprotokoll[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [speichert, setSpeichert] = useState<SchalterName | null>(null);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const [testAdresse, setTestAdresse] = useState("");
  const [testLaeuft, setTestLaeuft] = useState(false);

  const laden = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: satz, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setFehler(
        "Die Einstellungen konnten nicht geladen werden. Prüfen Sie, ob die Migration 002 ausgeführt wurde."
      );
    } else {
      setEinstellungen(satz as Benachrichtigungseinstellungen | null);
    }

    const { data: eintraege } = await supabase
      .from("notification_log")
      .select("*")
      .order("zeitpunkt", { ascending: false })
      .limit(25);
    setProtokoll((eintraege ?? []) as Benachrichtigungsprotokoll[]);
    setLaedt(false);
  }, []);

  useEffect(() => {
    if (!istAdmin) {
      setLaedt(false);
      return;
    }
    laden();
  }, [istAdmin, laden]);

  async function umschalten(name: SchalterName) {
    if (!einstellungen || !profil) return;
    const neuerWert = !einstellungen[name];
    setSpeichert(name);
    setFehler("");
    setMeldung("");

    // Die Berechtigung wird serverseitig durch Row Level Security geprüft.
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from("notification_settings")
      .update({
        [name]: neuerWert,
        geaendert_am: new Date().toISOString(),
        geaendert_durch: profil.name,
      })
      .eq("id", 1)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      setFehler(
        "Die Einstellung konnte nicht gespeichert werden. Nur Administratoren dürfen sie ändern."
      );
    } else {
      setEinstellungen(data as Benachrichtigungseinstellungen);
      setMeldung(
        `Einstellung gespeichert: ${
          SCHALTER.find((s) => s.name === name)?.titel
        } ist jetzt ${neuerWert ? "aktiv" : "inaktiv"}.`
      );
    }
    setSpeichert(null);
  }

  async function testSenden() {
    setTestLaeuft(true);
    setFehler("");
    setMeldung("");
    try {
      const antwort = await fetch("/api/benachrichtigung-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ an: testAdresse.trim() }),
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok) {
        setFehler(ergebnis.fehler ?? "Die Test-E-Mail konnte nicht versendet werden.");
      } else {
        setMeldung(`Test-E-Mail an ${testAdresse.trim()} versendet.`);
      }
    } catch {
      setFehler("Die Test-E-Mail konnte nicht versendet werden.");
    }
    setTestLaeuft(false);
  }

  return (
    <SeitenRahmen
      titel="E-Mail-Benachrichtigungen"
      beschreibung="Legen Sie fest, bei welchen Ereignissen alle aktiven Benutzer automatisch per E-Mail informiert werden."
      nurAdmin
    >
      {laedt ? (
        <Laden />
      ) : (
        <div className="grid gap-5">
          {fehler && <Hinweis art="fehler" text={fehler} />}
          {meldung && <Hinweis art="erfolg" text={meldung} />}

          <section className="rounded-lg border border-tresor-line bg-white">
            <div className="border-b border-tresor-line px-4 py-3">
              <h2 className="text-base font-semibold text-tresor-text">Ereignisse</h2>
              <p className="mt-0.5 text-sm text-tresor-muted">
                Die Schlüsselaktion wird immer gespeichert – auch wenn der E-Mail-Versand
                scheitert.
              </p>
            </div>
            <ul className="divide-y divide-tresor-line">
              {SCHALTER.map((s) => (
                <li key={s.name} className="flex items-start gap-4 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-tresor-text">{s.titel}</div>
                    <p className="mt-0.5 text-sm text-tresor-muted">{s.text}</p>
                  </div>
                  <Schalter
                    an={Boolean(einstellungen?.[s.name])}
                    aktiv={Boolean(einstellungen) && speichert === null}
                    umschalten={() => umschalten(s.name)}
                    beschriftung={s.titel}
                  />
                </li>
              ))}
            </ul>
            {einstellungen && (
              <div className="border-t border-tresor-line px-4 py-3 text-xs text-tresor-muted">
                Zuletzt geändert am {datumZeit(einstellungen.geaendert_am)}
                {einstellungen.geaendert_durch
                  ? ` durch ${einstellungen.geaendert_durch}`
                  : ""}
                .
              </div>
            )}
          </section>

          <section className="rounded-lg border border-tresor-line bg-white p-4">
            <h2 className="text-base font-semibold text-tresor-text">Test-E-Mail senden</h2>
            <p className="mt-0.5 text-sm text-tresor-muted">
              Sendet eine Beispielnachricht an eine einzelne Adresse. Andere Benutzer erhalten
              dabei nichts.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                value={testAdresse}
                onChange={(e) => setTestAdresse(e.target.value)}
                placeholder="name@evh.de"
                className="min-w-[220px] flex-1 rounded-md border border-tresor-line px-3 py-2 text-sm focus:border-tresor-blau focus:outline-none focus:ring-1 focus:ring-tresor-blau"
              />
              <button
                type="button"
                onClick={testSenden}
                disabled={testLaeuft || !testAdresse.includes("@")}
                className="rounded-md bg-tresor-blau px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testLaeuft ? "Wird gesendet …" : "Test-E-Mail senden"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-tresor-line bg-white">
            <div className="border-b border-tresor-line px-4 py-3">
              <h2 className="text-base font-semibold text-tresor-text">
                Letzte Versandvorgänge
              </h2>
              <p className="mt-0.5 text-sm text-tresor-muted">
                Die 25 jüngsten Einträge aus dem Versandprotokoll.
              </p>
            </div>
            {protokoll.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-tresor-muted">
                Es wurde noch keine Benachrichtigung versendet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-tresor-bg text-xs uppercase tracking-wide text-tresor-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Zeitpunkt</th>
                      <th className="px-4 py-2 font-semibold">Aktion</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Empfänger</th>
                      <th className="px-4 py-2 font-semibold">Hinweis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tresor-line">
                    {protokoll.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                          {datumZeit(p.zeitpunkt)}
                        </td>
                        <td className="px-4 py-2">{aktionText(p.aktion)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              p.status === "erfolgreich"
                                ? "bg-status-gruen/10 text-status-gruen"
                                : p.status === "fehlgeschlagen"
                                  ? "bg-status-rot/10 text-status-rot"
                                  : "bg-status-grau/10 text-tresor-muted"
                            }`}
                          >
                            {p.status === "erfolgreich"
                              ? "Erfolgreich"
                              : p.status === "fehlgeschlagen"
                                ? "Fehlgeschlagen"
                                : "Übersprungen"}
                          </span>
                        </td>
                        <td className="px-4 py-2 tabular-nums">{p.empfaenger_anzahl}</td>
                        <td className="px-4 py-2 text-tresor-muted">
                          {p.fehlermeldung ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </SeitenRahmen>
  );
}
