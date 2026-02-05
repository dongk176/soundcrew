"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Artist } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useBookmarkStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ArtistDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [notFound, setNotFound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { bookmarks, toggleBookmark } = useBookmarkStore();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/artists/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setArtist(data.artist);
        setCurrentIndex(0);
      } catch {
        setNotFound(true);
      }
    };
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => setActiveTrack(null);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader showSearch={false} />
        <div className="mx-auto max-w-4xl px-6 pb-16 pt-12">
          <h1 className="text-2xl font-semibold">아티스트를 찾을 수 없습니다</h1>
          <Link href="/" className="mt-4 inline-block text-sm text-accent">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!artist) return null;

  const saved = bookmarks.includes(artist.id);

  const playTrack = (track: { id: string; url: string }, index?: number) => {
    if (!audioRef.current) return;
    if (activeTrack === track.id) {
      audioRef.current.pause();
      setActiveTrack(null);
      return;
    }
    audioRef.current.src = track.url;
    audioRef.current.play().catch(() => {});
    setActiveTrack(track.id);
    if (typeof index === "number") setCurrentIndex(index);
  };

  const hasMulti = (artist?.tracks?.length || 0) > 1;
  const goPrev = () => {
    if (!artist?.tracks?.length) return;
    const next = (currentIndex - 1 + artist.tracks.length) % artist.tracks.length;
    const track = artist.tracks[next];
    playTrack(track, next);
  };
  const goNext = () => {
    if (!artist?.tracks?.length) return;
    const next = (currentIndex + 1) % artist.tracks.length;
    const track = artist.tracks[next];
    playTrack(track, next);
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader showSearch={false} />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-10">
        <Card className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border border-border bg-slate-100">
              {artist.avatarUrl ? (
                <img
                  src={artist.avatarUrl}
                  alt={`${artist.stageName} 프로필`}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-semibold">{artist.stageName}</h1>
              {artist.shortIntro && (
                <p className="text-sm text-muted whitespace-pre-line">{artist.shortIntro}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {artist.roles?.map((role) => (
                  <Badge key={role}>{role}</Badge>
                ))}
                {artist.genres?.map((genre) => (
                  <Badge key={genre}>{genre}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted">
                {[artist.onlineAvailable ? "온라인" : null, artist.offlineAvailable ? "오프라인" : null]
                  .filter(Boolean)
                  .join(" · ")}
                {artist.averageWorkDuration ? ` · 평균 ${artist.averageWorkDuration}` : ""}
              </p>
              {artist.offlineAvailable && artist.offlineRegions?.length ? (
                <p className="text-xs text-muted">오프라인 지역: {artist.offlineRegions.join(" · ")}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => toggleBookmark(artist.id)}
              className={cn(
                "h-11 rounded-lg border border-border px-5 text-sm font-semibold transition",
                saved ? "bg-foreground text-white" : "bg-white text-foreground"
              )}
              aria-pressed={saved}
            >
              저장
            </button>
          </div>
        </Card>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-6">
            {artist.portfolioText ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold">포트폴리오</h2>
                <p className="mt-3 text-sm text-muted whitespace-pre-line">
                  {artist.portfolioText}
                </p>
              </Card>
            ) : null}

            {/* 트랙 카드 제거 */}
          </div>

          <div className="space-y-6 self-start">
            <div className="space-y-3">
              {artist.tracks?.length ? (
                  artist.tracks.map((track, index) => (
                    <div key={track.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{track.title || "대표 트랙"}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTrack(track, index)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#3D5AFE] to-[#1E3A8A] text-xs font-semibold text-white shadow-[0_6px_14px_rgba(61,90,254,0.25)]"
                            aria-label={activeTrack === track.id ? "일시정지" : "재생"}
                          >
                            {activeTrack === track.id ? (
                              <span className="inline-block rotate-90 text-2xl font-bold">＝</span>
                            ) : (
                              <span className="text-base">▶</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted">등록된 트랙이 없습니다.</p>
              )}
              <audio ref={audioRef} className="hidden" />
            </div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold">SNS</h2>
              <div className="mt-4 space-y-3">
                {artist.portfolioLinks?.length ? (
                  artist.portfolioLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border p-4 text-sm text-accent"
                    >
                      {link}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted">등록된 링크가 없습니다.</p>
                )}
              </div>
            </Card>
            <Button className="w-full">메시지 보내기</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
