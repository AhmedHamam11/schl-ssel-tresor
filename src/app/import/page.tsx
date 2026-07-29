"use client";

import { useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Hinweis } from "@/components/Bausteine";
import AnhaengerAnzeige from "@/components/AnhaengerAnzeige";
import { useSitzung } from "@/components/Sitzung";
import { useBestand } from "@/components/Datenbestand";
import { leseBestandsdatei, erzeugeVorlage, type ImportZeile } from "@/lib/excel";
import { bestandImportieren } from "@/lib/schluesselAktionen";
import { fehlerText } from "@/lib/format";

type Modus = "ergaenzen" | "ersetzen";

export default function ImportSeite() {
  const { supabase } = useSitzung();
  const { neuLaden } = useBestand();
  const [dateiname, setDateiname] = useState("");
  const [zeilen, setZeilen] = useState<ImportZeile[]>([]);
  const [erkannt, setErkannt] = useState<string[]>([]);
  const [unbekannt, setUnbekannt] = useState<string[]>([]);
  const [modus, setModus] = useState<Modus>("ergaenzen");
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setFehler(null);
    setErfolg(null);
    try {
      const puffer = await datei.arrayBuffer();
      const ergebnis = leseBestandsdatei(puffer);
      if (ergebnis.zeilen.length === 0) {
        setFehler(
          "Die Datei enthält keine Datenzeilen. Prüfen Sie, ob das erste Tabellenblatt die Bestandsliste enthält."
        );
        return;
      }
      setZeilen(ergebnis.zeilen);
      setErkannt(ergebnis.erkannteSpalten);
      setUnbekannt(ergebnis.unbekannteSpalten);
      setDateiname(datei.name);
    } catch {
      setFehler("Die Datei konnte nicht gelesen werden. Erlaubt sind Dateien im Format .xlsx oder .xls.");
    }
  }

  const gueltige = zeilen.filter((z) => z.fehler.length === 0);
  const fehlerhafte = zeilen.filter((z) => z.fehler.length > 0);

  async function importieren() {
    if (gueltige.length === 0) {
      setFehler("Es gibt keine gültigen Zeilen zum Importieren.");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    setErfolg(null);

    try {
      const saetze = gueltige.map((z) => ({
        position: z.position!,
        schluesselnummer: z.schluesselnummer,
        anlage: z.anlage,
        anhaenger: z.anhaenger,
        ist_bund: z.ist_bund,
        schluesselanzahl: z.schluesselanzahl,
        kommentar: z.kommentar,
      }));

      const anzahl = await bestandImportieren(supabase, {
        daten: saetze,
        ersetzen: modus === "ersetzen",
        dateiname,
      });
      await neuLaden();
      setZeilen([]);
      setDateiname("");
      setErfolg(`${anzahl} Datensätze wurden vollständig importiert.`);
    } catch (error) {
      setFehler(fehlerText(error instanceof Error ? error.message : undefined));
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <SeitenRahmen
      titel="Excel-Import"
      beschreibung="Importieren Sie die bestehende Bestandsliste. Vor dem Import sehen Sie eine Vorschau der erkannten Daten."
      nurAdmin
      aktion={
        <button
          onClick={erzeugeVorlage}
          className="rounded-md border border-tresor-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-tresor-bg"
        >
          Vorlage herunterladen
        </button>
      }
    >
      <div className="grid gap-4">
        {fehler && <Hinweis art="fehler" text={fehler} />}
        {erfolg && <Hinweis art="erfolg" text={erfolg} />}

        <div className="rounded-lg border border-tresor-line bg-white p-5">
          <h2 className="text-sm font-semibold text-tresor-text">1. Datei auswählen</h2>
          <p className="mt-1 text-sm text-tresor-muted">
            Mehrere Anhänger gehören in dieselbe Zelle, getrennt durch Semikolon. Format:
            <span className="font-medium text-tresor-text"> Text|Farbe; Text|Farbe; Text</span>.
            Ohne „|Farbe“ bleibt der jeweilige Anhänger farblos.
          </p>
          <p className="mt-1 text-xs text-tresor-muted">
            Unterstützte Spalten: Schlüssel Position, Schlüsselnummer/n, Anlage/Zugehörigkeit,
            Anhänger (Text|Farbe; ...), Schlüsselbund?, Schlüsselanzahl und Kommentar. Die alten
            Spalten „Beschriftung Schlüsselanhänger“ und „Farbe Schlüsselanhänger“ werden weiterhin erkannt.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={dateiGewaehlt}
            className="mt-4 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-tresor-blau file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
          />
        </div>

        {zeilen.length > 0 && (
          <>
            <div className="rounded-lg border border-tresor-line bg-white p-5">
              <h2 className="text-sm font-semibold text-tresor-text">2. Vorschau prüfen</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-tresor-muted">
                  Datei: <span className="font-medium text-tresor-text">{dateiname}</span>
                </span>
                <span className="text-status-gruen">{gueltige.length} gültige Zeilen</span>
                {fehlerhafte.length > 0 && (
                  <span className="text-status-rot">{fehlerhafte.length} Zeilen mit Fehlern</span>
                )}
              </div>
              <div className="mt-3 text-xs text-tresor-muted">
                Erkannte Spalten: {erkannt.join(", ") || "keine"}
                {unbekannt.length > 0 && <> · Nicht übernommen: {unbekannt.join(", ")}</>}
              </div>

              <div className="mt-4 max-h-[26rem] overflow-auto rounded-md border border-tresor-line">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="sticky top-0 bg-tresor-bg text-left text-xs uppercase tracking-wide text-tresor-muted">
                    <tr>
                      <th className="px-3 py-2">Zeile</th>
                      <th className="px-3 py-2">Position</th>
                      <th className="px-3 py-2">Schlüsselnummer/n</th>
                      <th className="px-3 py-2">Anlage</th>
                      <th className="px-3 py-2">Anhänger</th>
                      <th className="px-3 py-2">Bund?</th>
                      <th className="px-3 py-2">Anzahl</th>
                      <th className="px-3 py-2">Kommentar</th>
                      <th className="px-3 py-2">Prüfung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tresor-line">
                    {zeilen.map((z) => (
                      <tr key={z.zeilennummer} className={z.fehler.length ? "bg-status-rot/5" : ""}>
                        <td className="px-3 py-2 text-tresor-muted">{z.zeilennummer}</td>
                        <td className="px-3 py-2 font-bold tabular-nums">{z.position ?? "—"}</td>
                        <td className="px-3 py-2">{z.schluesselnummer || "—"}</td>
                        <td className="px-3 py-2">{z.anlage || "—"}</td>
                        <td className="max-w-[24rem] px-3 py-2">
                          <AnhaengerAnzeige anhaenger={z.anhaenger} kompakt />
                        </td>
                        <td className="px-3 py-2">{z.ist_bund ? "Ja" : "Nein"}</td>
                        <td className="px-3 py-2 tabular-nums">{z.schluesselanzahl}</td>
                        <td className="px-3 py-2 text-tresor-muted">{z.kommentar || "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {z.fehler.length ? (
                            <span className="text-status-rot">{z.fehler.join("; ")}</span>
                          ) : (
                            <span className="text-status-gruen">In Ordnung</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-tresor-line bg-white p-5">
              <h2 className="text-sm font-semibold text-tresor-text">3. Import ausführen</h2>
              <fieldset className="mt-3 grid gap-2">
                <legend className="sr-only">Importart</legend>
                <label className="flex items-start gap-3 rounded-md border border-tresor-line p-3 text-sm">
                  <input
                    type="radio"
                    checked={modus === "ergaenzen"}
                    onChange={() => setModus("ergaenzen")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Bestand ergänzen</span>
                    <span className="block text-tresor-muted">
                      Die Datensätze werden zusätzlich angelegt. Vorhandene Schlüssel bleiben unverändert.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-md border border-status-rot/30 p-3 text-sm">
                  <input
                    type="radio"
                    checked={modus === "ersetzen"}
                    onChange={() => setModus("ersetzen")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-status-rot">Bestand vollständig ersetzen</span>
                    <span className="block text-tresor-muted">
                      Alle vorhandenen Schlüssel werden durch die gültigen Zeilen dieser Datei ersetzt.
                      Die Datenbank führt Löschen und Einfügen gemeinsam aus: Bei einem Fehler bleibt der alte Bestand erhalten.
                    </span>
                  </span>
                </label>
              </fieldset>

              {fehlerhafte.length > 0 && (
                <Hinweis
                  art="info"
                  text={`${fehlerhafte.length} fehlerhafte Zeilen werden nicht importiert. Korrigieren Sie die Datei, wenn diese Datensätze benötigt werden.`}
                />
              )}

              <button
                onClick={importieren}
                disabled={laeuft || gueltige.length === 0}
                className="mt-4 w-full rounded-md bg-tresor-blau px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {laeuft ? "Import wird ausgeführt …" : `${gueltige.length} gültige Datensätze importieren`}
              </button>
            </div>
          </>
        )}
      </div>
    </SeitenRahmen>
  );
}
