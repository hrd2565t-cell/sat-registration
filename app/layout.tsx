import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Kanit } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "สถาบันพัฒนากีฬาแห่งประเทศไทย - ระบบสมัครเข้ารับการฝึกอบรม",
  description: "ระบบสมัครเข้ารับการฝึกอบรมด้านกีฬาแห่งชาติ",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${kanit.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
