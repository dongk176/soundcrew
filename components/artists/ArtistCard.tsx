"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Bookmark } from "lucide-react";
import { Artist } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBookmarkStore } from "@/lib/store";

const regionGroups: Record<string, string[]> = {
  서울: [
    "마포구",
    "서대문구",
    "용산구",
    "은평구",
    "광진구",
    "성동구",
    "동작구",
    "강남구",
    "송파구",
    "강서구",
    "양천구",
    "구로구",
    "영등포구",
    "종로구",
    "중구",
    "성북구"
  ],
  경기: [
    "고양·일산",
    "부천·광명",
    "수원·화성·동탄",
    "과천·의왕",
    "용인권",
    "안산·시흥권",
    "남양주·구리·하남·광주권",
    "파주·김포",
    "평택·오산·안성권",
    "성남·분당",
    "안양·의정부",
    "양주·포천·동두천"
  ],
  인천: [
    "서구",
    "부평구",
    "강화군",
    "미추홀구",
    "남동구",
    "연수구",
    "계양구",
    "동구",
    "중구"
  ]
};

const regionLabel = (region: string) => {
  for (const [group, list] of Object.entries(regionGroups)) {
    if (list.includes(region)) return `${group} · ${region}`;
  }
  return region;
};

export const ArtistCard = ({
  artist,
  onSelect,
  isSelected
}: {
  artist: Artist;
  onSelect?: (artist: Artist) => void;
  isSelected?: boolean;
}) => {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const router = useRouter();
  const saved = bookmarks.includes(artist.id);
  const firstTrack = artist.tracks[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const displayGenres = useMemo(
    () => [artist.mainGenre || artist.genres[0]].filter(Boolean) as string[],
    [artist.mainGenre, artist.genres]
  );

  const embedUrl = useMemo(() => {
    if (!firstTrack?.url) return null;
    const url = firstTrack.url;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const idMatch =
        url.match(/v=([^&]+)/)?.[1] || url.match(/youtu\.be\/([^?]+)/)?.[1];
      if (!idMatch) return null;
      return `https://www.youtube.com/embed/${idMatch}?autoplay=1&playsinline=1`;
    }
    if (url.includes("soundcloud.com")) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    }
    return null;
  }, [firstTrack?.url]);

  const handlePlay = (index?: number, forcePlay = false) => {
    if (!firstTrack) return;
    const targetIndex = typeof index === "number" ? index : currentIndex;
    const target = artist.tracks[targetIndex];
    if (!target) return;
    if (playing && !forcePlay) {
      audioRef.current?.pause();
      setEmbedSrc(null);
      setPlaying(false);
      return;
    }

    if (embedUrl && targetIndex === 0) {
      setEmbedSrc(embedUrl);
      setPlaying(true);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(target.url);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
      audioRef.current.addEventListener("error", () => setPlaying(false));
    }
    audioRef.current.src = target.url;
    audioRef.current.play();
    setPlaying(true);
    setCurrentIndex(targetIndex);
  };

  const hasMulti = artist.tracks.length > 1;
  const goPrev = () => {
    const next = (currentIndex - 1 + artist.tracks.length) % artist.tracks.length;
    handlePlay(next, true);
  };
  const goNext = () => {
    const next = (currentIndex + 1) % artist.tracks.length;
    handlePlay(next, true);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return (
    <Card className="relative rounded-md overflow-hidden transition">
      <button
        onClick={() => toggleBookmark(artist.id)}
        className={cn(
          "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white",
          saved ? "text-accent" : "text-muted"
        )}
        aria-label="아티스트 북마크"
      >
        <Bookmark className="h-4 w-4" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr]">
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => handlePlay()}
            className="group relative block h-full w-full"
          >
            <div className="-m-px w-full bg-slate-100 md:h-full">
              {artist.avatarUrl ? (
                <img
                  src={artist.avatarUrl}
                  alt={`${artist.stageName} 프로필`}
                  className="block h-48 w-full object-cover transition md:h-full md:group-hover:brightness-75"
                />
              ) : null}
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
              {hasMulti && (!isMobile || playing) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 text-white text-2xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                  aria-label="이전 트랙"
                >
                  ◀
                </button>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay();
                  }}
                  className="pointer-events-auto rounded-full border border-white/70 bg-black/50 p-4 text-white shadow-subtle"
                  aria-label="재생"
                >
                  {playing ? (
                    <span className="inline-block rotate-90 text-2xl font-bold">＝</span>
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </button>
              </div>
              {hasMulti && (!isMobile || playing) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 text-white text-2xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                  aria-label="다음 트랙"
                >
                  ▶
                </button>
              )}
            </div>
          </button>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (isMobile) setPortfolioOpen((p) => !p);
          }}
          className="relative flex w-full flex-col p-5 pr-14 text-left"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) {
                setPortfolioOpen((p) => !p);
                return;
              }
              onSelect?.(artist);
            }}
            className="text-left"
          >
            <h3 className="text-lg font-semibold text-foreground">{artist.stageName}</h3>
          </button>
          {artist.shortIntro && (
            <p className="mt-2 text-sm text-muted whitespace-pre-line pr-16 line-clamp-2">
              {artist.shortIntro}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {displayGenres[0] && (
              <span className="relative group rounded-lg border border-border px-3 py-1 text-xs text-muted">
                {displayGenres[0]}
                {artist.genres.length > 1 ? (
                  <span className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground opacity-0 shadow-subtle transition group-hover:opacity-100">
                    {artist.genres.join(" · ")}
                  </span>
                ) : null}
              </span>
            )}
            {artist.onlineAvailable && (
              <span className="rounded-lg border border-border px-3 py-1 text-xs text-muted">
                온라인 가능
              </span>
            )}
            {artist.offlineAvailable && (
              <span className="relative group rounded-lg border border-border px-3 py-1 text-xs text-muted">
                오프라인 가능
                {artist.offlineRegions?.length ? (
                  <span className="pointer-events-none absolute left-1/2 top-0 z-20 w-max -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground opacity-0 shadow-subtle transition group-hover:opacity-100">
                    {artist.offlineRegions.map(regionLabel).join(" / ")}
                  </span>
                ) : null}
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-4 border-t border-border pt-4",
              isMobile && !portfolioOpen ? "hidden" : ""
            )}
          >
            <p className="text-xs font-semibold text-muted">포트폴리오</p>
            <p className="mt-2 text-sm text-foreground whitespace-pre-line line-clamp-6">
              {artist.portfolioText || "포트폴리오가 아직 등록되지 않았습니다."}
            </p>
            {isMobile && portfolioOpen && artist.slug && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${artist.slug}`);
                }}
                className="mt-4 w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                자세히 보기
              </button>
            )}
          </div>
        </div>
      </div>
      {embedSrc && (
        <div className="absolute h-0 w-0 overflow-hidden">
          <iframe
            src={embedSrc}
            title="embedded-audio"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}
    </Card>
  );
};
