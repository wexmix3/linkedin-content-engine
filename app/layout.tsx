import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedIn Content Engine",
  description: "Draft, queue, and post LinkedIn content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: "#0a0e1a", color: "#f9fafb" }}
      >
        {children}
      </body>
    </html>
  );
}
