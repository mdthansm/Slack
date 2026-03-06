import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { CurrentUserProvider } from "@/context/CurrentUserContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Slack Clone - Team Chat",
  description: "A Slack clone built with Next.js and Convex",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} font-sans antialiased h-full`}
      >
        <ConvexClientProvider>
          <CurrentUserProvider>{children}</CurrentUserProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
