import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

// Title / headings — MADE Tommy Soft Black (boldest weight available), the same
// title font Report The Reef uses.
const madeTommy = localFont({
  src: [
    {
      path: "./fonts/made_tommy_soft_black-webfont.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/made_tommy_soft_black-webfont.woff",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-made-tommy",
  display: "swap",
});

// Body text — Inter (Google Fonts)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BVI Sargassum Monitoring — Community Data",
  description:
    "Help the Ministry of Environment, Natural Resources & Climate Change track and monitor sargassum across the Territory.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b6d8d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${madeTommy.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
