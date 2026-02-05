import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import Providers from "./providers";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body"
});
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "SoundCrew",
  description: "뮤지션 전용 구인구직 플랫폼 UI 스캐폴딩"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${bodyFont.className} bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
