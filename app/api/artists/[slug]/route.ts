import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const mapGenreToLabel: Record<string, string> = {
  POP: "팝",
  HIPHOP: "힙합",
  RNB: "알앤비",
  ELECTRONIC: "일렉트로닉",
  ROCK: "락",
  ACOUSTIC: "어쿠스틱",
  JAZZ: "재즈",
  CINEMATIC: "시네마틱",
  WORLD: "월드 뮤직",
  GOSPEL: "가스펠",
  INDIE: "인디"
};

const mapRoleToLabel: Record<string, string> = {
  PRODUCER: "프로듀서",
  SINGER: "싱어",
  MIXING_ENGINEER: "믹싱 엔지니어",
  SONGWRITER: "송라이터",
  MASTERING_ENGINEER: "마스터링 엔지니어",
  SESSION_MUSICIAN: "세션 뮤지션"
};

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const artist = await prisma.artistProfile.findUnique({
    where: { slug: params.slug },
    include: { tracks: true, photos: true }
  });

  if (!artist) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    artist: {
      id: artist.id,
      slug: artist.slug,
      stageName: artist.stageName,
      shortIntro: artist.shortIntro,
      roles: artist.roles.map((role) => mapRoleToLabel[role]),
      genres: artist.genres.map((g) => mapGenreToLabel[g]),
      mainGenre: artist.mainGenre ? mapGenreToLabel[artist.mainGenre] : undefined,
      onlineAvailable: artist.onlineAvailable,
      offlineAvailable: artist.offlineAvailable,
      offlineRegions: artist.offlineRegions,
      averageWorkDuration: artist.averageWorkDuration,
      portfolioText: artist.portfolioText,
      portfolioLinks: artist.portfolioLinks,
      avatarUrl:
        artist.avatarUrl ??
        artist.photos?.find((photo) => photo.isMain)?.url ??
        artist.photos?.[0]?.url,
      photos: artist.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        isMain: photo.isMain,
        sortOrder: photo.sortOrder
      })),
      tracks: artist.tracks.map((track) => ({
        id: track.id,
        title: track.title ?? undefined,
        sourceType: track.sourceType,
        url: track.url
      })),
      createdAt: artist.createdAt.toISOString()
    }
  });
}
