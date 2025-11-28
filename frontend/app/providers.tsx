"use client";
import { LanguageProvider } from "@/lib/lang";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}


