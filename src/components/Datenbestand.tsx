"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSitzung } from "./Sitzung";
import type { Ereignis, Schluessel } from "@/lib/typen";

interface Bestand {
  schluessel: Schluessel[];
  ereignisse: Ereignis[];
  laedt: boolean;
  fehler: string | null;
  neuLaden: () => Promise<void>;
}

const BestandKontext = createContext<Bestand | null>(null);

export function DatenbestandProvider({ children }: { children: React.ReactNode }) {
  const { supabase, profil } = useSitzung();
  const [schluessel, setSchluessel] = useState<Schluessel[]>([]);
  const [ereignisse, setEreignisse] = useState<Ereignis[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const neuLaden = useCallback(async () => {
    const [k, e] = await Promise.all([
      supabase.from("keys").select("*").order("position", { ascending: true }),
      supabase.from("key_events").select("*").order("zeitpunkt", { ascending: false }).limit(1000),
    ]);
    if (k.error || e.error) {
      setFehler("Die Daten konnten nicht geladen werden. Bitte laden Sie die Seite neu.");
    } else {
      setFehler(null);
      setSchluessel((k.data ?? []) as Schluessel[]);
      setEreignisse((e.data ?? []) as Ereignis[]);
    }
    setLaedt(false);
  }, [supabase]);

  useEffect(() => {
    if (!profil) return;
    neuLaden();

    // Echtzeit: Aenderungen erscheinen sofort bei allen angemeldeten Benutzern.
    const kanal = supabase
      .channel("schluessel-tresor")
      .on("postgres_changes", { event: "*", schema: "public", table: "keys" }, (nutzlast) => {
        setSchluessel((alt) => {
          if (nutzlast.eventType === "DELETE") {
            return alt.filter((k) => k.id !== (nutzlast.old as Schluessel).id);
          }
          const neu = nutzlast.new as Schluessel;
          const index = alt.findIndex((k) => k.id === neu.id);
          if (index === -1) return [...alt, neu].sort((a, b) => a.position - b.position);
          const kopie = [...alt];
          kopie[index] = neu;
          return kopie;
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "key_events" }, (nutzlast) => {
        setEreignisse((alt) => [nutzlast.new as Ereignis, ...alt]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil?.id]);

  return (
    <BestandKontext.Provider value={{ schluessel, ereignisse, laedt, fehler, neuLaden }}>
      {children}
    </BestandKontext.Provider>
  );
}

export function useBestand(): Bestand {
  const wert = useContext(BestandKontext);
  if (!wert) throw new Error("useBestand muss innerhalb von DatenbestandProvider verwendet werden.");
  return wert;
}
