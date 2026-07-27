"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSitzung } from "@/components/Sitzung";
import { Hinweis } from "@/components/Bausteine";
import { fehlerText } from "@/lib/format";

export default function AnmeldungSeite() {
  const { supabase, profil } = useSitzung();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    if (profil) router.replace("/uebersicht");
  }, [profil, router]);

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !passwort) {
      setFehler("Bitte geben Sie E-Mail-Adresse und Passwort ein.");
      return;
    }
    setLaeuft(true);
    setFehler(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: passwort,
    });
    if (error) {
      setFehler(fehlerText(error.message));
      setLaeuft(false);
      return;
    }
    router.replace("/uebersicht");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tresor-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-tresor-blau font-bold text-white">
            ST
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-tresor-text">Schlüssel Tresor</h1>
            <p className="text-sm text-tresor-muted">Interne Schlüsselverwaltung</p>
          </div>
        </div>

        <form onSubmit={anmelden} className="grid gap-4 rounded-xl border border-tresor-line bg-white p-6">
          <h2 className="text-base font-semibold text-tresor-text">Anmeldung</h2>
          {fehler && <Hinweis art="fehler" text={fehler} />}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-tresor-text">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30"
              placeholder="vorname.nachname@firma.de"
            />
          </div>
          <div>
            <label htmlFor="passwort" className="block text-sm font-medium text-tresor-text">
              Passwort
            </label>
            <input
              id="passwort"
              type="password"
              autoComplete="current-password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="mt-1 w-full rounded-md border border-tresor-line px-3 py-2.5 text-sm focus:border-tresor-blau focus:outline-none focus-visible:ring-2 focus-visible:ring-tresor-blau/30"
            />
          </div>
          <button
            type="submit"
            disabled={laeuft}
            className="mt-2 w-full rounded-md bg-tresor-blau px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {laeuft ? "Anmeldung läuft …" : "Anmelden"}
          </button>
          <p className="text-xs text-tresor-muted">
            Kein Zugang? Ein Administrator legt Ihr Konto in der Benutzerverwaltung an.
          </p>
        </form>
      </div>
    </div>
  );
}
