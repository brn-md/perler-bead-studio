import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perler Studio - Bead Pattern & Pegboard Generator",
  description: "Create official Perler and fuse bead patterns, pegboard templates, and shopping lists from any photo or design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased overflow-hidden">{children}</body>
    </html>
  );
}