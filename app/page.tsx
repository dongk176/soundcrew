"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Artist, ArtistGenre, ArtistRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LoginModal from "@/components/auth/LoginModal";
import AppSidebar from "@/components/layout/AppSidebar";
import { Bookmark, ChevronDown, Star } from "lucide-react";

const genreOptions: ArtistGenre[] = [
  "팝",
  "힙합",
  "알앤비",
  "일렉트로닉",
  "락",
  "어쿠스틱",
  "재즈",
  "시네마틱",
  "월드 뮤직",
  "가스펠",
  "인디"
];

const roleOptions: ArtistRole[] = [
  "프로듀서",
  "믹싱 엔지니어",
  "싱어",
  "마스터링 엔지니어",
  "송라이터",
  "세션 뮤지션"
];

const sortOptions = [
  { value: "latest", label: "최신 등록" },
  { value: "stageName", label: "활동명순" }
];

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(sortOptions[0].value);
  const [selectedGenre, setSelectedGenre] = useState<ArtistGenre | null>(null);
  const [selectedRole, setSelectedRole] = useState<ArtistRole | null>(null);
  const [genreOpen, setGenreOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [savedState, setSavedState] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hoveredArtistId, setHoveredArtistId] = useState<string | null>(null);
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeType, setActiveType] = useState<"audio" | "video" | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/artists");
        if (!res.ok) return;
        const data = await res.json();
        setArtists(data.artists ?? []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePlay = () => setIsAudioPlaying(true);
    const handlePause = () => setIsAudioPlaying(false);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  const extractYouTubeId = (url: string) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace("www.", "");
      if (host === "youtu.be") {
        return parsed.pathname.replace("/", "") || null;
      }
      if (host.endsWith("youtube.com")) {
        const v = parsed.searchParams.get("v");
        if (v) return v;
        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
        if (shortsMatch?.[1]) return shortsMatch[1];
        const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
        if (embedMatch?.[1]) return embedMatch[1];
      }
    } catch {
      // fall through to regex
    }
    const match =
      url.match(/v=([^&]+)/) ||
      url.match(/youtu\.be\/([^?]+)/) ||
      url.match(/youtube\.com\/shorts\/([^?]+)/) ||
      url.match(/youtube\.com\/embed\/([^?]+)/);
    return match?.[1] ?? null;
  };

  const getPlayableItems = (artist: Artist) => {
    const tracks =
      artist.tracks?.map((track) => ({
        id: track.id,
        url: track.url,
        title: track.title ?? "대표 트랙",
        type: "audio" as const
      })) ?? [];
    const videos =
      artist.videos
        ?.map((video) => ({
          id: video.id,
          url: video.url,
          title: video.title ?? "유튜브 영상",
          type: "video" as const,
          videoId: extractYouTubeId(video.url)
        }))
        .filter((video) => !!video.videoId) ?? [];
    return {
      items: [...tracks, ...videos]
    };
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setVideoSrc(null);
    setActiveType(null);
    setActiveArtistId(null);
    setActiveIndex(0);
  };

  const toggleSave = async (slug: string) => {
    if (!slug) return;
    if (!session?.user?.id) {
      setLoginOpen(true);
      return;
    }
    setSavedState((prev) => ({ ...prev, [slug]: !prev[slug] }));
    try {
      const res = await fetch(`/api/artists/${slug}/save`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setSavedState((prev) => ({ ...prev, [slug]: !!data.isSaved }));
    } catch {
      // ignore
    }
  };

  const playItem = (artist: Artist, index: number) => {
    const playable = getPlayableItems(artist);
    const item = playable.items[index];
    if (!item) return;

    if (
      activeArtistId === artist.id &&
      activeIndex === index &&
      activeType === item.type
    ) {
      if (item.type === "audio") {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      } else {
        stopPlayback();
      }
      return;
    }

    setActiveArtistId(artist.id);
    setActiveIndex(index);
    setActiveType(item.type);

    if (item.type === "audio") {
      const audio = audioRef.current;
      if (!audio) return;
      setVideoSrc(null);
      audio.pause();
      audio.src = item.url;
      audio.play().catch(() => {});
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      const id = "videoId" in item ? item.videoId : extractYouTubeId(item.url);
      if (!id) return;
      setVideoSrc(`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`);
    }
  };

  const goPrev = (artist: Artist) => {
    const playable = getPlayableItems(artist);
    if (!playable.items.length) return;
    const nextIndex = Math.max(0, activeIndex - 1);
    playItem(artist, nextIndex);
  };

  const goNext = (artist: Artist) => {
    const playable = getPlayableItems(artist);
    if (!playable.items.length) return;
    const nextIndex = Math.min(playable.items.length - 1, activeIndex + 1);
    playItem(artist, nextIndex);
  };

  const filteredArtists = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = artists.filter((artist) => {
      const matchesSearch = term
        ? [
            artist.stageName,
            artist.shortIntro,
            ...(artist.roles || []),
            ...(artist.genres || []),
            ...(artist.offlineRegions || [])
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)
        : true;
      const matchesGenre = selectedGenre
        ? artist.genres?.includes(selectedGenre)
        : true;
      const matchesRole = selectedRole
        ? (artist.roles || []).includes(selectedRole)
        : true;
      return matchesSearch && matchesGenre && matchesRole;
    });

    if (sort === "stageName") {
      list = list.sort((a, b) => a.stageName.localeCompare(b.stageName));
    } else {
      list = list.sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      );
    }

    return list;
  }, [artists, search, selectedGenre, selectedRole, sort]);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="home" />

      <main className="relative flex-1 overflow-y-auto px-8 pb-20 pt-8">
        <div className="mb-8 flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-[#e7e9ee]">홈</h1>
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="포지션/악기/장르/지역 검색"
              className="min-w-[240px] rounded-full border border-[#232936] bg-[#10141b] px-4 py-2 text-sm text-[#e7e9ee] placeholder:text-[#9aa3b2]"
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setRoleOpen((prev) => !prev);
                  setGenreOpen(false);
                  setSortOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-2 border-r border-[#232936] px-4 py-2 text-sm transition",
                  selectedRole ? "text-[#e7e9ee]" : "text-[#c1c7d3]",
                  "hover:text-[#e7e9ee]"
                )}
              >
                {selectedRole ?? "포지션"}
                <ChevronDown className="h-4 w-4" />
              </button>
              {roleOpen && (
                <div className="absolute left-0 top-12 z-20 w-56 border border-[#232936] bg-[#11151c] p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]">
                  <div className="flex flex-col divide-y divide-[#232936]">
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role === selectedRole ? null : role);
                          setRoleOpen(false);
                        }}
                        className={cn(
                          "px-3 py-2 text-left text-sm transition hover:bg-[#1a202b]",
                          selectedRole === role ? "bg-[#23D3FF]/10 text-[#e7e9ee]" : "text-[#c1c7d3]"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole(null);
                        setRoleOpen(false);
                      }}
                      className="px-3 py-2 text-left text-sm text-[#c1c7d3] transition hover:bg-[#1a202b]"
                    >
                      전체
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setGenreOpen((prev) => !prev);
                  setRoleOpen(false);
                  setSortOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-2 border-r border-[#232936] px-4 py-2 text-sm transition",
                  selectedGenre ? "text-[#e7e9ee]" : "text-[#c1c7d3]",
                  "hover:text-[#e7e9ee]"
                )}
              >
                {selectedGenre ?? "장르"}
                <ChevronDown className="h-4 w-4" />
              </button>
              {genreOpen && (
                <div className="absolute left-0 top-12 z-20 w-64 bg-[#11151c] p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]">
                  <div className="grid grid-cols-2 gap-0">
                    {genreOptions.map((genre, index) => {
                      const isLeftCol = index % 2 === 0;
                      const isTopRow = index < 2;
                      return (
                        <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          setSelectedGenre(genre === selectedGenre ? null : genre);
                          setGenreOpen(false);
                        }}
                          className={cn(
                            "px-3 py-2 text-left text-sm transition hover:bg-[#1a202b]",
                            !isLeftCol && "border-l border-[#232936]",
                            !isTopRow && "border-t border-[#232936]",
                            selectedGenre === genre ? "bg-[#23D3FF]/10 text-[#e7e9ee]" : "text-[#c1c7d3]"
                          )}
                        >
                          {genre}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGenre(null);
                        setGenreOpen(false);
                      }}
                      className="px-3 py-2 text-left text-sm text-[#c1c7d3] transition hover:bg-[#1a202b] border-t border-[#232936] border-l border-[#232936]"
                    >
                      전체
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSortOpen((prev) => !prev);
                  setRoleOpen(false);
                  setGenreOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-2 border-r border-[#232936] px-4 py-2 text-sm transition",
                  "text-[#c1c7d3] hover:text-[#e7e9ee]"
                )}
              >
                {sortOptions.find((option) => option.value === sort)?.label}
                <ChevronDown className="h-4 w-4" />
              </button>
              {sortOpen && (
                <div className="absolute left-0 top-12 z-20 w-44 bg-[#11151c] p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]">
                  <div className="flex flex-col divide-y divide-[#232936]">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                        className={cn(
                          "px-3 py-2 text-left text-sm transition hover:bg-[#1a202b]",
                          sort === option.value
                            ? "bg-[#23D3FF]/10 text-[#e7e9ee]"
                            : "text-[#c1c7d3]"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ml-auto flex flex-wrap gap-3" />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-[#c1c7d3]">
            {filteredArtists.length}명의 아티스트를 찾았습니다
          </p>
        </div>

        {filteredArtists.length === 0 ? (
          <div className="rounded-3xl border border-[#232936] bg-[#151a22] p-12 text-center">
            <p className="text-lg font-semibold text-[#e7e9ee]">등록된 아티스트가 없습니다</p>
            <p className="mt-2 text-sm text-[#c1c7d3]">
              첫 번째 아티스트를 등록하고 포트폴리오를 공개해보세요.
            </p>
            <Button
              className="mt-6 rounded-full bg-[#23D3FF] px-6 py-2 text-sm font-semibold text-white"
              onClick={() => {
                if (session?.user?.id) {
                  router.push("/artists/new");
                  return;
                }
                setLoginOpen(true);
              }}
            >
              아티스트 등록
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-4">
            {filteredArtists.map((artist) => {
              const mainGenre = artist.mainGenre ?? artist.genres?.[0] ?? "정보 없음";
              const roles = artist.roles?.length ? artist.roles.join(" · ") : undefined;
              const regionText =
                artist.offlineRegions && artist.offlineRegions.length > 0
                  ? artist.offlineRegions.join(" | ")
                  : "지역 정보 없음";

              return (
                <article
                  key={artist.id}
                  onMouseEnter={() => setHoveredArtistId(artist.id)}
                  onMouseLeave={() => setHoveredArtistId(null)}
                  className="flex flex-col overflow-hidden rounded-md border border-[#232936] bg-[#151a22] shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)]"
                >
                  <div className="relative h-[220px] w-full bg-[#10141b]">
                    {artist.avatarUrl ? (
                      <img
                        src={artist.avatarUrl}
                        alt={artist.stageName}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    {artist.avgRating !== undefined && artist.reviewCount ? (
                      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#151a22]/90 px-2.5 py-1 text-xs font-semibold text-[#e7e9ee] shadow-sm">
                        <Star className="h-3.5 w-3.5 text-[#23D3FF]" />
                        {artist.avgRating.toFixed(1)}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={cn(
                        "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#232936] bg-[#151a22]/90 transition",
                        "hover:border-[#23D3FF]"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        toggleSave(artist.slug ?? "");
                      }}
                      aria-label="저장"
                    >
                      <Bookmark
                        className={cn(
                          "h-4 w-4",
                          savedState[artist.slug ?? ""] ? "text-[#23D3FF]" : "text-[#e7e9ee]"
                        )}
                      />
                    </button>
                    {(() => {
                      const playable = getPlayableItems(artist);
                      if (playable.items.length === 0) return null;
                      const isActive = activeArtistId === artist.id;
                      const showControls = hoveredArtistId === artist.id || isActive;
                      const currentIndex = isActive ? activeIndex : 0;
                      const canPrev = isActive && currentIndex > 0;
                      const canNext =
                        playable.items.length > 1 &&
                        currentIndex < playable.items.length - 1;
                      const isPlaying =
                        isActive &&
                        ((activeType === "audio" && isAudioPlaying) ||
                          (activeType === "video" && !!videoSrc));
                      return (
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0 bg-black/45 transition-opacity",
                            showControls ? "opacity-100" : "opacity-0"
                          )}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => goPrev(artist)}
                              disabled={!canPrev}
                              className={cn(
                                "pointer-events-auto absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white transition",
                                canPrev ? "hover:bg-white/10" : "opacity-40"
                              )}
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => playItem(artist, isActive ? activeIndex : 0)}
                              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#23D3FF] bg-[#151a22] text-2xl text-[#23D3FF]"
                            >
                              {isPlaying ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-5 w-1.5 rounded-full bg-[#23D3FF]" />
                                  <span className="h-5 w-1.5 rounded-full bg-[#23D3FF]" />
                                </span>
                              ) : (
                                <span className="leading-none">▶</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => goNext(artist)}
                              disabled={!canNext}
                              className={cn(
                                "pointer-events-auto absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white transition",
                                canNext ? "hover:bg-white/10" : "opacity-40"
                              )}
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex h-full flex-col gap-2 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-2xl font-semibold text-[#e7e9ee]">
                        {artist.stageName}
                      </h3>
                      <span className="shrink-0 rounded-md border border-[#232936] px-2.5 py-1 text-xs text-[#23D3FF]">
                        {mainGenre}
                      </span>
                    </div>
                    <p className="truncate text-sm text-[#c1c7d3]">
                      {artist.shortIntro || "소개 정보 없음"}
                    </p>
                    <div className="space-y-1 text-sm text-[#c1c7d3]">
                      {roles ? <div>{roles}</div> : null}
                      <div className="truncate">{regionText}</div>
                    </div>
                    <Button
                      className="mt-auto w-full rounded-xl bg-[#23D3FF] py-2 text-base font-semibold text-[#151a22] hover:bg-[#0FB8E3]"
                      onClick={() => window.open(`/${artist.slug}`, "_blank", "noopener,noreferrer")}
                    >
                      프로필 보기
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="fixed bottom-8 right-8 z-40">
          <Button
            className="rounded-2xl bg-[#23D3FF] px-8 py-4 text-lg font-semibold text-[#151a22] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)] hover:bg-[#0FB8E3]"
            onClick={() => router.push("/post")}
          >
            + 공고글 등록
          </Button>
        </div>
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <audio ref={audioRef} className="hidden" />
      {videoSrc ? (
        <iframe
          title="youtube-audio"
          src={videoSrc}
          className="pointer-events-none fixed left-0 top-0 h-1 w-1 opacity-0"
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      ) : null}
    </div>
  );
}
