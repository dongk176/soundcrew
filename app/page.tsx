"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { ArtistPreviewPanel } from "@/components/artists/ArtistPreviewPanel";
import { artists as mockArtists } from "@/lib/mockData";
import { Artist, ArtistGenre, ArtistRole } from "@/lib/types";
import { Select } from "@/components/ui/select";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoginModal from "@/components/auth/LoginModal";

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(sortOptions[0].value);
  const [selectedGenres, setSelectedGenres] = useState<ArtistGenre[]>([]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<ArtistRole[]>([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>(mockArtists);
  const [selected, setSelected] = useState<Artist | null>(mockArtists[0] ?? null);
  const { data: session } = useSession();
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/artists");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.artists?.length) {
          setArtists(data.artists);
          setSelected(data.artists[0]);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

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
      const matchesGenre =
        selectedGenres.length === 0 ||
        artist.genres.some((genre) => selectedGenres.includes(genre));
      const matchesRole =
        selectedRoles.length === 0 ||
        (artist.roles || []).some((role) => selectedRoles.includes(role));
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
  }, [artists, search, selectedGenres, selectedRoles, sort]);

  const toggleGenre = (genre: ArtistGenre) => {
    setSelectedGenres((prev) => (prev[0] === genre ? [] : [genre]));
    setGenreOpen(false);
  };
  const toggleRole = (role: ArtistRole) => {
    setSelectedRoles((prev) => (prev[0] === role ? [] : [role]));
    setRoleOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader searchValue={search} onSearchChange={setSearch} />
      <main className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 pt-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted">
                {filteredArtists.length}명의 아티스트를 찾았습니다
              </p>
            </div>
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => {
                  setRoleOpen((prev) => !prev);
                  setGenreOpen(false);
                }}
                className={cn(
                  "text-base px-5 py-3",
                  selectedRoles[0] ? "text-accent border-accent" : ""
                )}
              >
                {selectedRoles[0] ?? "포지션"}
              </Button>
              {roleOpen && (
                <div className="absolute left-0 top-[58px] z-20 w-56 rounded-2xl border border-border bg-white p-3 shadow-subtle">
                  <div className="flex flex-col divide-y divide-border">
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={
                          selectedRoles.includes(role)
                            ? "px-4 py-3 text-sm text-foreground hover:-translate-y-0.5 transition"
                            : "px-4 py-3 text-sm text-muted hover:-translate-y-0.5 transition"
                        }
                      >
                        {role}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoles([]);
                        setRoleOpen(false);
                      }}
                      className="px-4 py-3 text-sm text-muted hover:-translate-y-0.5 transition"
                    >
                      전체
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => {
                  setGenreOpen((prev) => !prev);
                  setRoleOpen(false);
                }}
                className={cn(
                  "text-base px-5 py-3",
                  selectedGenres[0] ? "text-accent border-accent" : ""
                )}
              >
                {selectedGenres[0] ?? "장르"}
              </Button>
              {genreOpen && (
                <div className="absolute left-0 top-[58px] z-20 w-56 rounded-2xl border border-border bg-white p-3 shadow-subtle">
                  <div className="grid grid-cols-2">
                    {genreOptions.map((genre, idx) => {
                      const isLastCol = idx % 2 === 1;
                      const isLastRow = idx >= genreOptions.length - (genreOptions.length % 2 || 2);
                      return (
                        <div
                          key={genre}
                          className={cn(
                            "border-b border-border",
                            !isLastCol && "border-r border-border",
                            isLastRow && "border-b-0"
                          )}
                        >
                      <button
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={
                          selectedGenres.includes(genre)
                            ? "px-4 py-3 text-sm text-foreground hover:-translate-y-0.5 transition"
                            : "px-4 py-3 text-sm text-muted hover:-translate-y-0.5 transition"
                        }
                      >
                        {genre}
                      </button>
                      </div>
                      );
                    })}
                    <div className={cn("border-b-0", "border-l border-border")}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGenres([]);
                          setGenreOpen(false);
                        }}
                        className="px-4 py-3 text-sm text-muted hover:-translate-y-0.5 transition"
                      >
                        전체
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 선택 칩 영역 제거 */}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredArtists.length === 0 ? (
              <div className="rounded-card border border-border bg-white p-10 text-center lg:col-span-2">
                <p className="text-lg font-semibold">등록된 아티스트가 없습니다</p>
                <p className="mt-2 text-sm text-muted">
                  첫 번째 아티스트를 등록하고 포트폴리오를 공개해보세요.
                </p>
                <Button
                  className="mt-6 text-base px-6 py-3"
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
              filteredArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  onSelect={setSelected}
                  isSelected={selected?.id === artist.id}
                />
              ))
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          {selected && <ArtistPreviewPanel artist={selected} />}
        </aside>
      </main>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} callbackUrl="/artists/new" />
    </div>
  );
}
