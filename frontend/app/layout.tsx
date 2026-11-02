import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SwRegister } from "@/components/pwa/SwRegister";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Temerelle",
  description: "Your time, beautifully organized. Онлайн-запис для малого бізнесу",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, title: "Temerelle", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="text-base min-h-full flex flex-col">
        <OfflineBanner />
        <main className="flex-1 flex flex-col px-5">
          <div className="w-full max-w-xl mx-auto flex-1 flex flex-col">{children}</div>
        </main>
        <SwRegister />
      </body>
    </html>
  );
}
