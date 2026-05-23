import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const calSans = localFont({
  src: "../public/fonts/cal.ttf",
  variable: "--font-cal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orchy — AI Agent Orchestration",
  description: "Create, configure, and run AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${calSans.variable} h-full antialiased`}>
      <body className="h-full flex">
        <Sidebar />
        <main className="ml-52 flex-1 min-h-screen bg-background">{children}</main>
      </body>
    </html>
  );
}
