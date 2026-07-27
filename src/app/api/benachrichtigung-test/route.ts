import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Loest eine Test-E-Mail ueber die Edge Function aus.
 * Nur Administratoren duerfen diesen Weg nutzen. Das Webhook-Geheimnis
 * bleibt ausschliesslich auf dem Server.
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
      { fehler: "Nur Administratoren dürfen Test-E-Mails versenden." },
      { status: 403 }
    );
  }

  const { an } = await anfrage.json();
  if (!an || !String(an).includes("@")) {
    return NextResponse.json(
      { fehler: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
      { status: 400 }
    );
  }

  const ziel = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/benachrichtigung-senden`;

  try {
    const antwort = await fetch(ziel, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "x-webhook-secret": process.env.WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({ test: true, an: String(an) }),
    });

    if (!antwort.ok) {
      const text = await antwort.text();
      return NextResponse.json(
        { fehler: `Die Test-E-Mail wurde abgelehnt: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ erfolg: true });
  } catch {
    return NextResponse.json(
      { fehler: "Die Edge Function ist nicht erreichbar." },
      { status: 502 }
    );
  }
}
