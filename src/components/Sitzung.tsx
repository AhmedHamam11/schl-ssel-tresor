"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Profil } from "@/lib/typen";

interface SitzungWert {
  supabase: SupabaseClient;
  profil: Profil | null;
  laedt: boolean;
  abmelden: () => Promise<void>;
}

const SitzungKontext = createContext<SitzungWert | null>(null);

export function SitzungProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [laedt, setLaedt] = useState(true);
  const router = useRouter();
  const pfad = usePathname();

  useEffect(() => {
    let aktiv = true;

    async function ladeProfil() {
      const { data } = await supabase.auth.getUser();
      const benutzer = data.user;
      if (!aktiv) return;
      if (!benutzer) {
        setProfil(null);
        setLaedt(false);
        if (pfad !== "/anmeldung") router.replace("/anmeldung");
        return;
      }
      const { data: satz } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", benutzer.id)
        .maybeSingle();
      if (!aktiv) return;
      setProfil(
        (satz as Profil) ?? {
          id: benutzer.id,
          name: benutzer.email ?? "Unbekannt",
          email: benutzer.email ?? "",
          rolle: "mitarbeiter",
          aktiv: true,
          erstellt_am: new Date().toISOString(),
        }
      );
      setLaedt(false);
    }

    ladeProfil();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setLaedt(true);
      ladeProfil();
    });
    return () => {
      aktiv = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfad]);

  async function abmelden() {
    await supabase.auth.signOut();
    setProfil(null);
    router.replace("/anmeldung");
  }

  return (
    <SitzungKontext.Provider value={{ supabase, profil, laedt, abmelden }}>
      {children}
    </SitzungKontext.Provider>
  );
}

export function useSitzung(): SitzungWert {
  const wert = useContext(SitzungKontext);
  if (!wert) throw new Error("useSitzung muss innerhalb von SitzungProvider verwendet werden.");
  return wert;
}
