"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSitzung } from "./Sitzung";
import { normalisiereEreignis, normalisiereSchluessel } from "@/lib/anhaenger";
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
    setLaedt(true);
    const [k, e] = await Promise.all([
      supabase.from("keys").select("*").order("position", { ascending: true }),
      supabase.from("key_events").select("*").order("zeitpunkt", { ascending: false }).limit(5000),
    ]);
    if (k.error || e.error) {
      setFehler("Die Daten konnten nicht geladen werden. Bitte laden Sie die Seite neu.");
    } else {
      setFehler(null);
      setSchluessel(((k.data ?? []) as Schluessel[]).map(normalisiereSchluessel));
      setEreignisse(((e.data ?? []) as Ereignis[]).map(normalisiereEreignis));
    }
    setLaedt(false);
  }, [supabase]);

  useEffect(() => {
    if (!profil) {
      setSchluessel([]);
      setEreignisse([]);
      setLaedt(false);
      return;
    }

    // Echtzeit: Änderungen erscheinen sofort bei allen angemeldeten Benutzern.
    const kanal = supabase
      .channel(`schluessel-tresor-${profil.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "keys" }, (nutzlast) => {
        setSchluessel((alt) => {
          if (nutzlast.eventType === "DELETE") {
            return alt.filter((k) => k.id !== (nutzlast.old as Schluessel).id);
          }
          const neu = normalisiereSchluessel(nutzlast.new as Schluessel);
          const index = alt.findIndex((k) => k.id === neu.id);
          if (index === -1) return [...alt, neu].sort((a, b) => a.position - b.position);
          const kopie = [...alt];
          kopie[index] = neu;
          return kopie.sort((a, b) => a.position - b.position);
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "key_events" }, (nutzlast) => {
        const neu = normalisiereEreignis(nutzlast.new as Ereignis);
        setEreignisse((alt) => {
          if (alt.some((e) => e.id === neu.id)) return alt;
          return [neu, ...alt].slice(0, 5000);
        });
      })
      .subscribe((status) => {
        // Nach erfolgreicher Anmeldung am Realtime-Kanal erneut laden. So geht
        // auch eine Änderung im kurzen Zeitfenster zwischen Erstabruf und Abo nicht verloren.
        if (status === "SUBSCRIBED") void neuLaden();
      });

    // Sofort Daten zeigen; der zweite Abruf nach SUBSCRIBED schließt die Realtime-Lücke.
    void neuLaden();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [neuLaden, profil, supabase]);

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
