"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Artist } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookmarkStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export default function MePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bookmarks } = useBookmarkStore();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [myArtist, setMyArtist] = useState<Artist | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/artists");
        const data = await res.json();
        setArtists(data?.artists ?? []);
      } catch {
        setArtists([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMy = async () => {
      try {
        const res = await fetch("/api/me/artist", { cache: "no-store" });
        const data = await res.json();
        setMyArtist(data?.artist ?? null);
      } catch {
        setMyArtist(null);
      }
    };
    loadMy();
  }, []);

  const savedArtists = useMemo(
    () => artists.filter((artist) => bookmarks.includes(artist.id)),
    [artists, bookmarks]
  );

  return (
    <div className="min-h-screen bg-white">
      <AppHeader showSearch={false} />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">마이페이지</h1>
            <p className="mt-1 text-sm text-muted">
              {session?.user?.email ?? "로그인 정보 없음"}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            로그아웃
          </Button>
        </div>

        <Tabs defaultValue={searchParams?.get("tab") || "profile"} className="mt-6 space-y-6">
          <TabsList>
            <TabsTrigger value="profile">내 프로필</TabsTrigger>
            <TabsTrigger value="applications">내 지원</TabsTrigger>
            <TabsTrigger value="saved">저장</TabsTrigger>
            <TabsTrigger value="settlement">정산</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            {myArtist ? (
              <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted">{myArtist.genres?.join(" · ")}</p>
                    <p className="mt-1 text-lg font-semibold">{myArtist.stageName}</p>
                    {myArtist.shortIntro && (
                      <p className="mt-2 text-sm text-muted whitespace-pre-line">
                        {myArtist.shortIntro}
                      </p>
                    )}
                  </div>
                  <Button onClick={() => router.push("/artists/new?edit=1")}>수정하기</Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-muted">등록한 아티스트 프로필이 없습니다.</p>
                  <Button onClick={() => router.push("/artists/new")}>아티스트 등록</Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="applications">
            <Card className="p-6">
              <p className="text-sm text-muted">지원 내역이 없습니다.</p>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <div className="space-y-4">
              {savedArtists.length === 0 ? (
                <Card className="p-6 text-sm text-muted">저장한 아티스트가 없습니다.</Card>
              ) : (
                savedArtists.map((artist) => (
                  <Card key={artist.id} className="p-4">
                    <p className="text-xs text-muted">{artist.genres.join(" · ")}</p>
                    <p className="mt-1 text-sm font-semibold">{artist.stageName}</p>
                    {artist.offlineRegions?.length ? (
                      <p className="mt-2 text-xs text-muted">
                        {artist.offlineRegions.join(" · ")}
                      </p>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settlement">
            <Card className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "이번 달 정산", value: "₩1,250,000" },
                  { label: "정산 예정", value: "₩480,000" },
                  { label: "누적 정산", value: "₩7,840,000" }
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border p-4">
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
