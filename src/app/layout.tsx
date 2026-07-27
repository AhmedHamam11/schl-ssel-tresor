import type { Metadata } from "next";
import "./globals.css";
import { SitzungProvider } from "@/components/Sitzung";
import { DatenbestandProvider } from "@/components/Datenbestand";

export const metadata: Metadata = {
  title: "Schlüssel Tresor",
  description: "Digitale Verwaltung des Schlüsseltresors mit den Plätzen 1 bis 500.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-tresor-bg font-sans antialiased">
        <SitzungProvider>
          <DatenbestandProvider>{children}</DatenbestandProvider>
        </SitzungProvider>
      </body>
    </html>
  );
}
