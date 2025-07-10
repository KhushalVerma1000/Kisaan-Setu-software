import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kisaan Setu",
  description: "kisaan setu is a account and profile management ERP software specially developed for FPOs ,FPCs ,Fisheries and dairy developed under named of company sukrsh infotech with tech partners codzen technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
       <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  
      <main
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </main>
</body>
</html>
  );
}
