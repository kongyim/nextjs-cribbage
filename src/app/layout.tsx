import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cribbage Hand Counter",
  description: "Pick a hand, starter, and see a detailed cribbage score breakdown.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
