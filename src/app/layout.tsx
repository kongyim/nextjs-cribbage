import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "./components/Analytics";

const GA_MEASUREMENT_ID = "G-BFVJCRTTG5";

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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname + window.location.search,
            });
          `}
        </Script>
      </head>
      <body className="antialiased font-sans">
        {children}
        <Analytics measurementId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
