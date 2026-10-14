import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/shared/AppShell";

export const metadata: Metadata = {
  title: "Meme’d — Campaigns that move culture",
  description: "A creator-first campaign and payout tracker for brands and makers.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><div className="site-frame"><AppShell>{children}</AppShell></div></body>
    </html>
  );
}
