import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Providers from "./providers";
import MobileNavigation from "@/components/navigation/MobileNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MultifamilyOS.ai",
  description: "Mobile-first multifamily operating system",
  icons: [
    {
      rel: 'icon',
      url: '/new-favicon-2024.png',
      type: 'image/png',
    },
    {
      rel: 'shortcut icon',
      url: '/new-favicon-2024.png',
    },
  ],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <Script id="reditus-tracking" strategy="afterInteractive">
          {`
            (function (w, d, s, p, t) { 
              w.gr = w.gr || function () { 
                w.gr.ce = 60; 
                w.gr.q = w.gr.q || []; 
                w.gr.q.push(arguments); 
              }; 
              p = d.getElementsByTagName(s)[0]; 
              t = d.createElement(s); 
              t.async = true; 
              t.src = "https://script.getreditus.com/v2.js"; 
              p.parentNode.insertBefore(t, p); 
            })(window, document, "script"); 
            gr("initCustomer", "2ccb8f8c-64d4-4653-b7d0-9b45825678ce"); 
            gr("track", "pageview");
          `}
        </Script>
        
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Mobile-First Navigation */}
            <MobileNavigation />
            
            {/* Main Content */}
            <main className="flex-1 overflow-hidden pt-16 lg:pt-16">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}