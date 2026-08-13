import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Guide",
  description: "Track grades and plan academic targets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
