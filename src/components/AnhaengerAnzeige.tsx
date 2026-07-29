import { farbStil } from "@/lib/anhaenger";
import type { SchluesselAnhaenger } from "@/lib/typen";

export default function AnhaengerAnzeige({
  anhaenger,
  kompakt = false,
  leerText = "Ohne Beschriftung",
}: {
  anhaenger: SchluesselAnhaenger[];
  kompakt?: boolean;
  leerText?: string;
}) {
  if (anhaenger.length === 0) {
    return <span className="text-tresor-muted">{leerText}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {anhaenger.map((a, index) => {
        const stil = farbStil(a.farbe);
        return (
          <span
            key={`${a.text}-${a.farbe ?? "ohne"}-${index}`}
            title={a.farbe ? `Anhängerfarbe: ${a.farbe}` : "Keine Anhängerfarbe ausgewählt"}
            className={`inline-flex max-w-full items-center rounded-full border font-medium ${
              kompakt ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
            }`}
            style={{
              backgroundColor: stil.hintergrund,
              borderColor: stil.rand,
              color: stil.text,
            }}
          >
            <span className="truncate">{a.text}</span>
          </span>
        );
      })}
    </div>
  );
}
