import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "TSender",
  description: "A simple and fast file sender",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Wrap the entire body content with Providers */}
        <Providers>
          <Header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-200" />
          <main className="flex-1 pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
