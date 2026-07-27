"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSitzung } from "./Sitzung";

const SEITEN = [
  { pfad: "/uebersicht", titel: "Übersicht" },
  { pfad: "/tresor", titel: "Schlüsseltresor" },
  { pfad: "/schluesselliste", titel: "Schlüsselliste" },
  { pfad: "/verlauf", titel: "Verlauf" },
  { pfad: "/import", titel: "Excel-Import", nurAdmin: true },
  { pfad: "/export", titel: "Excel-Export" },
  { pfad: "/benutzer", titel: "Benutzerverwaltung", nurAdmin: true },
];

export default function Navigation() {
  const { profil, abmelden } = useSitzung();
  const pfad = usePathname();
  const [offen, setOffen] = useState(false);
  if (!profil) return null;

  const sichtbar = SEITEN.filter((s) => !s.nurAdmin || profil.rolle === "admin");

  return (
    <header className="sticky top-0 z-30 border-b border-tresor-line bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/uebersicht" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tresor-blau text-sm font-bold text-white">
            ST
          </span>
          <span className="text-base font-semibold tracking-tight text-tresor-text">
            Schlüssel&nbsp;Tresor
          </span>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {sichtbar.map((s) => (
            <Link
              key={s.pfad}
              href={s.pfad}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                pfad === s.pfad
                  ? "bg-tresor-blau text-white"
                  : "text-tresor-muted hover:bg-tresor-bg hover:text-tresor-text"
              }`}
            >
              {s.titel}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium text-tresor-text">{profil.name}</div>
            <div className="text-xs text-tresor-muted">
              {profil.rolle === "admin" ? "Administrator" : "Mitarbeiter"}
            </div>
          </div>
          <button
            onClick={abmelden}
            className="rounded-md border border-tresor-line px-3 py-2 text-sm font-medium text-tresor-text hover:bg-tresor-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tresor-blau"
          >
            Abmelden
          </button>
        </div>

        <button
          onClick={() => setOffen(!offen)}
          className="ml-auto rounded-md border border-tresor-line px-3 py-2 text-sm lg:hidden"
          aria-expanded={offen}
        >
          Menü
        </button>
      </div>

      {offen && (
        <div className="border-t border-tresor-line bg-white px-4 py-3 lg:hidden">
          <div className="mb-3 text-sm text-tresor-muted">
            Angemeldet als <span className="font-medium text-tresor-text">{profil.name}</span>
          </div>
          <div className="grid gap-1">
            {sichtbar.map((s) => (
              <Link
                key={s.pfad}
                href={s.pfad}
                onClick={() => setOffen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pfad === s.pfad ? "bg-tresor-blau text-white" : "text-tresor-text hover:bg-tresor-bg"
                }`}
              >
                {s.titel}
              </Link>
            ))}
            <button
              onClick={abmelden}
              className="mt-2 rounded-md border border-tresor-line px-3 py-2 text-left text-sm font-medium"
            >
              Abmelden
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
