import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starving Artists Online",
  description:
    "Create a studio, paint famous canvases, and outlast your fellow artists.",
  other: {
    "codex-preview": "development",
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
