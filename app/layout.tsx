// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import RootLayoutClient from "@/components/root-layout-client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatWit Social - Gerenciamento de Redes Sociais",
  description: "Plataforma para gerenciamento e automação de redes sociais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={cn(inter.className, "min-h-screen")}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
