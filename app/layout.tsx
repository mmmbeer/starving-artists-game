import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.starvingartistsgame.com"),
  title: {
    default: "Starving Artists Online | Paint, Sell and Survive",
    template: "%s | Starving Artists",
  },
  description:
    "Play Starving Artists online with one to four players. Collect paint, finish famous canvases, sell art for fame and keep your artist fed.",
  applicationName: "Starving Artists",
  authors: [{ name: "Starving Artists" }],
  creator: "Starving Artists",
  publisher: "Starving Artists",
  keywords: [
    "Starving Artists game",
    "online board game",
    "art strategy game",
    "multiplayer browser game",
    "famous painting game",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Starving Artists",
    title: "Starving Artists Online | Paint, Sell and Survive",
    description:
      "A one-to-four-player strategy game about paint, famous canvases and staying fed.",
    images: [
      {
        url: "/canvases/vincent-van-gogh-starry-night-1889.webp",
        width: 720,
        height: 470,
        alt: "Starry Night canvas card in Starving Artists",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Starving Artists Online",
    description: "Paint famous canvases. Sell them. Try not to starve.",
    images: ["/canvases/vincent-van-gogh-starry-night-1889.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
