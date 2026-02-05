import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const genreValues = [
  "POP",
  "HIPHOP",
  "RNB",
  "ELECTRONIC",
  "ROCK",
  "ACOUSTIC",
  "JAZZ",
  "CINEMATIC",
  "WORLD",
  "GOSPEL",
  "INDIE"
] as const;

const roleValues = [
  "PRODUCER",
  "SINGER",
  "MIXING_ENGINEER",
  "SONGWRITER",
  "MASTERING_ENGINEER",
  "SESSION_MUSICIAN"
] as const;

const trackSchema = z.object({
  title: z.string().optional(),
  sourceType: z.enum(["UPLOAD"]),
  url: z.string().url(),
  fileKey: z.string().optional()
});

const photoSchema = z.object({
  url: z.string().url(),
  fileKey: z.string().optional(),
  isMain: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

const createSchema = z.object({
  stageName: z.string().min(1),
  shortIntro: z.string().max(50).optional(),
  roles: z.array(z.enum(roleValues)).min(1),
  genres: z.array(z.enum(genreValues)).min(1),
  mainGenre: z.enum(genreValues),
  onlineAvailable: z.boolean().optional(),
  offlineAvailable: z.boolean().optional(),
  offlineRegions: z.array(z.string()).optional(),
  averageWorkDuration: z.string().optional(),
  portfolioText: z.string().optional(),
  portfolioLinks: z.array(z.string().url()).optional(),
  avatarUrl: z.string().url().optional(),
  avatarKey: z.string().optional(),
  tracks: z.array(trackSchema).max(3).optional(),
  photos: z.array(photoSchema).max(5).optional()
});

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

export async function GET() {
  const artists = await prisma.artistProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { tracks: true, photos: true }
  });

  return NextResponse.json({
    artists: artists.map((artist) => ({
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
      photos: artist.photos?.map((photo) => ({
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
    }))
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (!data.mainGenre) {
    return NextResponse.json({ ok: false, error: "MAIN_GENRE_REQUIRED" }, { status: 400 });
  }
  if (data.mainGenre && !data.genres.includes(data.mainGenre)) {
    return NextResponse.json({ ok: false, error: "MAIN_GENRE_INVALID" }, { status: 400 });
  }
  const mainPhoto =
    data.photos?.find((photo) => photo.isMain) ?? data.photos?.[0];

  const artist = await prisma.$transaction(async (tx) => {
    const count = await tx.artistProfile.count();
    const slug = `artist${count + 1}`;
    return tx.artistProfile.create({
      data: {
        slug,
        userId,
        stageName: data.stageName,
        shortIntro: data.shortIntro,
        roles: data.roles,
        genres: data.genres,
        mainGenre: data.mainGenre,
        onlineAvailable: data.onlineAvailable ?? false,
        offlineAvailable: data.offlineAvailable ?? false,
        offlineRegions: data.offlineRegions ?? [],
        averageWorkDuration: data.averageWorkDuration,
        portfolioText: data.portfolioText,
        portfolioLinks: data.portfolioLinks ?? [],
        avatarUrl: data.avatarUrl ?? mainPhoto?.url,
        avatarKey: data.avatarKey ?? mainPhoto?.fileKey,
        photos: data.photos?.length
          ? {
              create: data.photos.map((photo, index) => ({
                url: photo.url,
                fileKey: photo.fileKey,
                isMain: photo.isMain ?? index === 0,
                sortOrder: photo.sortOrder ?? index
              }))
            }
          : undefined,
        tracks: data.tracks?.length
          ? {
              create: data.tracks.map((track) => ({
                title: track.title,
                sourceType: track.sourceType,
                url: track.url,
                fileKey: track.fileKey
              }))
            }
          : undefined
      },
      include: { tracks: true, photos: true }
    });
  });

  return NextResponse.json({
    ok: true,
    artist: {
      id: artist.id,
      slug: artist.slug,
      stageName: artist.stageName,
      shortIntro: artist.shortIntro,
      roles: artist.roles.map((role) => mapRoleToLabel[role]),
      genres: artist.genres.map((g) => mapGenreToLabel[g]),
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
      photos: artist.photos?.map((photo) => ({
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
