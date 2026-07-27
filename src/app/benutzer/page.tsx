"use client";

import { useCallback, useEffect, useState } from "react";
import SeitenRahmen from "@/components/SeitenRahmen";
import { Hinweis } from "@/components/Bausteine";
import { useSitzung } from "@/components/Sitzung";
import { datumZeit, fehlerText } from "@/lib/format";
import type { Profil, Rolle } from "@/lib/typen";

export default function BenutzerSeite() {
  const { supabase, profil } = useSitzung();
  const [benutzer, setBenutzer] = useState<Profil[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [rolle, setRolle] = useState<Rolle>("mitarbeiter");
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const laden = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("erstellt_am", { ascending: true });
    setBenutzer((data ?? []) as Profil[]);
  }, [supabase]);

  useEffect(() => {
    if (profil?.rolle === "admin") laden();
  }, [profil?.rolle, laden]);

  async function anlegen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setErfolg(null);
    if (!name.trim() || !email.trim() || passwort.length < 8) {
      setFehler("Bitte füllen Sie alle Felder aus. Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setLaeuft(true);
    const antwort = await fetch("/api/benutzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), passwort, rolle }),
    });
    const ergebnis = await antwort.json();
    setLaeuft(false);
    if (!antwort.ok) {
      setFehler(ergebnis.fehler ?? "Der Benutzer konnte nicht angelegt werden.");
      return;
    }
    setErfolg(`Der Benutzer „${name.trim()}“ wurde angelegt.`);
    setName("");
    setEmail("");
    setPasswort("");
    setRolle("mitarbeiter");
    laden();
  }

  async function rolleAendern(id: string, neueRolle: Rolle) {
    const { error } = await supabase.from("profiles").update({ rolle: neueRolle }).eq("id", id);
    if (error) setFehler(fehlerText(error.message));
    else laden();
  }

  const eingabe =
    "mt-1 w-full rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30";

  return (
    <SeitenRahmen
      titel="Benutzerverwaltung"
      beschreibung="Legen Sie Konten für Teammitglieder an und vergeben Sie Rollen."
      nurAdmin
    >
      <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <form onSubmit={anlegen} className="grid h-fit gap-4 rounded-lg border border-tresor-line bg-white p-5">
          <h2 className="text-sm font-semibold text-tresor-text">Neuen Benutzer anlegen</h2>
          {fehler && <Hinweis art="fehler" text={fehler} />}
          {erfolg && <Hinweis art="erfolg" text={erfolg} />}
          <div>
            <label htmlFor="b-name" className="block text-sm font-medium">Name</label>
            <input id="b-name" className={eingabe} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="b-email" className="block text-sm font-medium">E-Mail-Adresse</label>
            <input id="b-email" type="email" className={eingabe} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="b-pw" className="block text-sm font-medium">Erstes Passwort</label>
            <input id="b-pw" type="text" className={eingabe} value={passwort} onChange={(e) => setPasswort(e.target.value)} />
            <p className="mt-1 text-xs text-tresor-muted">Mindestens 8 Zeichen.</p>
          </div>
          <div>
            <label htmlFor="b-rolle" className="block text-sm font-medium">Rolle</label>
            <select id="b-rolle" className={eingabe} value={rolle} onChange={(e) => setRolle(e.target.value as Rolle)}>
              <option value="mitarbeiter">Mitarbeiter</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={laeuft}
            className="rounded-md bg-tresor-blau px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {laeuft ? "Wird angelegt …" : "Benutzer anlegen"}
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-tresor-line bg-white">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-tresor-bg text-left text-xs uppercase tracking-wide text-tresor-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">E-Mail-Adresse</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3">Angelegt am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tresor-line">
              {benutzer.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">
                    {b.name}
                    {b.id === profil?.id && (
                      <span className="ml-2 text-xs text-tresor-muted">(Sie)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-tresor-muted">{b.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={b.rolle}
                      onChange={(e) => rolleAendern(b.id, e.target.value as Rolle)}
                      disabled={b.id === profil?.id}
                      aria-label={`Rolle von ${b.name}`}
                      className="rounded-md border border-tresor-line px-2 py-1.5 text-sm disabled:bg-tresor-bg disabled:text-tresor-muted"
                    >
                      <option value="mitarbeiter">Mitarbeiter</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-tresor-muted">{datumZeit(b.erstellt_am)}</td>
                </tr>
              ))}
              {benutzer.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-tresor-muted">
                    Noch keine Benutzer vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SeitenRahmen>
  );
}
