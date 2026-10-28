import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Kanit } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบรับสมัครผู้เข้ารับการอบรม - การกีฬาแห่งประเทศไทย (กกท.)",
  description:
    "ระบบรับสมัครบุคลากรกีฬาเพื่อเข้ารับการฝึกอบรม ปีงบประมาณ พ.ศ. 2570 กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย",
  keywords: [
    "การกีฬาแห่งประเทศไทย",
    "กกท",
    "SAT",
    "อบรมกีฬา",
    "ผู้บริหารกีฬา",
    "ผู้ฝึกสอนกีฬา",
    "วิทยาศาสตร์การกีฬา",
  ],
  icons: {
    icon: "/assets/logo-sat-header.png",
    apple: "/assets/logo-sat-header.png",
  },
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
