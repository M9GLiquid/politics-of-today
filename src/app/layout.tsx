import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminPreviewHost } from "@/components/admin-preview-host";
import { GameAdminHost } from "@/components/game-admin-host";
import { FloatingTutorial } from "@/components/floating-tutorial";
import { SessionReconcile } from "@/components/session-reconcile";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Politics of Today",
  description:
    "Learn a new political system through play: monthly votes on party policies across categories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        <SessionReconcile />
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <FloatingTutorial />
        <GameAdminHost />
        <AdminPreviewHost />
      </body>
    </html>
  );
}
