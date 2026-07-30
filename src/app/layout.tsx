import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Веб-УНФ — Склад",
  description: "Веб-версия 1С:УНФ — склад, остатки, интеграция с Юкан",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
