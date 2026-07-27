"use client";

import Navigation from "./Navigation";
import { useSitzung } from "./Sitzung";
import { useBestand } from "./Datenbestand";
import { Hinweis, Laden } from "./Bausteine";

export default function SeitenRahmen({
  titel,
  beschreibung,
  nurAdmin = false,
  aktion,
  children,
}: {
  titel: string;
  beschreibung: string;
  nurAdmin?: boolean;
  aktion?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { profil, laedt } = useSitzung();
  const { fehler } = useBestand();

  if (laedt) return <Laden text="Anmeldung wird geprüft …" />;
  if (!profil) return <Laden text="Sie werden zur Anmeldung weitergeleitet …" />;

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-tresor-text sm:text-3xl">{titel}</h1>
            <p className="mt-1 text-sm text-tresor-muted">{beschreibung}</p>
          </div>
          {aktion}
        </div>
        {fehler && (
          <div className="mb-4">
            <Hinweis art="fehler" text={fehler} />
          </div>
        )}
        {nurAdmin && profil.rolle !== "admin" ? (
          <Hinweis
            art="fehler"
            text="Diese Seite ist Administratoren vorbehalten. Wenden Sie sich an einen Administrator, wenn Sie Zugriff benötigen."
          />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
