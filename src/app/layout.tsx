import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
      <body>
        {/* Wrap the entire body content with Providers */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
