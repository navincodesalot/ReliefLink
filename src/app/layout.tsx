import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { resolveSessionContext } from "@/lib/ai/preferences";

export const metadata: Metadata = {
  title: "ReliefLink — Chain of Custody",
  description:
    "ReliefLink: verified, trackable handoffs of food aid across warehouse, transporter, and local nodes.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await resolveSessionContext();

  return (
    <html
      lang={session.resolvedLanguage}
      className={`${geist.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <LanguageProvider initialSession={session}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
