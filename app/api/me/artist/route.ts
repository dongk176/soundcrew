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

const updateSchema = z.object({
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

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const artist = await prisma.artistProfile.findUnique({
    where: { userId },
    include: { tracks: true, photos: true }
  });

  if (!artist) return NextResponse.json({ ok: true, artist: null });

  return NextResponse.json({
    ok: true,
    artist: {
      id: artist.id,
      slug: artist.slug,
      stageName: artist.stageName,
      shortIntro: artist.shortIntro,
      roles: artist.roles,
      genres: artist.genres,
      mainGenre: artist.mainGenre ?? undefined,
      mainGenre: artist.mainGenre ?? undefined,
      onlineAvailable: artist.onlineAvailable,
      offlineAvailable: artist.offlineAvailable,
      offlineRegions: artist.offlineRegions,
      averageWorkDuration: artist.averageWorkDuration,
      portfolioText: artist.portfolioText,
      portfolioLinks: artist.portfolioLinks,
      avatarUrl: artist.avatarUrl,
      avatarKey: artist.avatarKey,
      photos: artist.photos?.map((photo) => ({
        id: photo.id,
        url: photo.url,
        fileKey: photo.fileKey ?? undefined,
        isMain: photo.isMain,
        sortOrder: photo.sortOrder
      })),
      tracks: artist.tracks.map((track) => ({
        id: track.id,
        title: track.title ?? undefined,
        sourceType: track.sourceType,
        url: track.url,
        fileKey: track.fileKey ?? undefined
      })),
      createdAt: artist.createdAt.toISOString()
    }
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
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

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.artistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!existing) return null;

    await tx.artistTrack.deleteMany({ where: { artistId: existing.id } });
    await tx.artistPhoto.deleteMany({ where: { artistId: existing.id } });

    return tx.artistProfile.update({
      where: { id: existing.id },
      data: {
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

  if (!updated) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, artist: { slug: updated.slug } });
}
