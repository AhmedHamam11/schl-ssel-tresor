import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Legt einen neuen Benutzer an. Nur Administratoren duerfen diesen Weg nutzen.
 * Der Service-Role-Key wird ausschliesslich hier auf dem Server verwendet.
 */
export async function POST(anfrage: Request) {
  const supabase = supabaseServer();
  const { data: sitzung } = await supabase.auth.getUser();
  if (!sitzung.user) {
    return NextResponse.json({ fehler: "Sie sind nicht angemeldet." }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", sitzung.user.id)
    .maybeSingle();

  if (profil?.rolle !== "admin") {
    return NextResponse.json(
      { fehler: "Nur Administratoren dürfen Benutzer anlegen." },
      { status: 403 }
    );
  }

  const { name, email, passwort, rolle } = await anfrage.json();
  if (!name || !email || !passwort) {
    return NextResponse.json(
      { fehler: "Name, E-Mail-Adresse und Passwort sind erforderlich." },
      { status: 400 }
    );
  }
  if (String(passwort).length < 8) {
    return NextResponse.json(
      { fehler: "Das Passwort muss mindestens 8 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const dienst = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await dienst.auth.admin.createUser({
    email,
    password: passwort,
    email_confirm: true,
    user_metadata: { name, rolle: rolle === "admin" ? "admin" : "mitarbeiter" },
  });

  if (error) {
    const text = error.message.toLowerCase().includes("already registered")
      ? "Für diese E-Mail-Adresse besteht bereits ein Konto."
      : "Der Benutzer konnte nicht angelegt werden.";
    return NextResponse.json({ fehler: text }, { status: 400 });
  }

  await dienst
    .from("profiles")
    .upsert({ id: data.user!.id, name, email, rolle: rolle === "admin" ? "admin" : "mitarbeiter" });

  return NextResponse.json({ erfolg: true });
}
