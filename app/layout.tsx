import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

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
        className="bg-background text-foreground"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
