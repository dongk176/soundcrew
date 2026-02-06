import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

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
  const session = await getServerSession(authOptions);
  const artist = await prisma.artistProfile.findUnique({
    where: { slug: params.slug },
    include: {
      tracks: true,
      photos: true,
      videos: true,
      reviews: true,
      rates: true,
      equipment: true,
      user: { select: { createdAt: true } }
    }
  });

  if (!artist) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const viewerId = session?.user?.id ?? null;
  await prisma.artistView.create({
    data: {
      artistId: artist.id,
      viewerId: viewerId ?? undefined
    }
  });

  const savedCount = await prisma.artistSave.count({ where: { artistId: artist.id } });
  const isSaved = viewerId
    ? (await prisma.artistSave.findFirst({
        where: { artistId: artist.id, userId: viewerId },
        select: { id: true }
      })) !== null
    : false;

  const stats = await (async () => {
    if (!artist.userId) {
      return { responseRate: null, responseTimeMinutes: null, completedCount: 0, totalRequests: 0 };
    }

    const requests = await prisma.artistRequest.findMany({
      where: { artistId: artist.id },
      select: { id: true, threadId: true, createdAt: true, status: true }
    });

    if (!requests.length) {
      return { responseRate: null, responseTimeMinutes: null, completedCount: 0, totalRequests: 0 };
    }

    const threadIds = requests.map((req) => req.threadId).filter(Boolean) as string[];
    const messageByThread = new Map<string, Date>();

    if (threadIds.length > 0) {
      const messages = await prisma.message.findMany({
        where: { threadId: { in: threadIds }, senderId: artist.userId },
        orderBy: { createdAt: "asc" }
      });

      for (const message of messages) {
        if (!messageByThread.has(message.threadId)) {
          messageByThread.set(message.threadId, message.createdAt);
        }
      }
    }

    let responded = 0;
    let totalMinutes = 0;
    let completedCount = 0;

    for (const req of requests) {
      if (req.status === "COMPLETED") completedCount += 1;
      if (!req.threadId) continue;
      const respondedAt = messageByThread.get(req.threadId);
      if (!respondedAt) continue;
      responded += 1;
      totalMinutes += Math.max(0, Math.round((respondedAt.getTime() - req.createdAt.getTime()) / 60000));
    }

    const responseRate = requests.length > 0 ? Math.round((responded / requests.length) * 100) : null;
    const responseTimeMinutes = responded > 0 ? Math.round(totalMinutes / responded) : null;

    return { responseRate, responseTimeMinutes, completedCount, totalRequests: requests.length };
  })();

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
      videos: artist.videos.map((video) => ({
        id: video.id,
        title: video.title ?? undefined,
        url: video.url
      })),
      reviews: artist.reviews.map((review) => ({
        id: review.id,
        authorName: review.authorName,
        authorRole: review.authorRole ?? undefined,
        authorAvatarUrl: review.authorAvatarUrl ?? undefined,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString()
      })),
      rates: artist.rates
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((rate) => ({
          id: rate.id,
          title: rate.title,
          amount: rate.amount,
          sortOrder: rate.sortOrder
        })),
      equipment: artist.equipment
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          category: item.category,
          name: item.name,
          sortOrder: item.sortOrder
        })),
      stats,
      savedCount,
      isSaved,
      joinedAt: artist.user?.createdAt.toISOString(),
      createdAt: artist.createdAt.toISOString(),
      isOwner: session?.user?.id ? session.user.id === artist.userId : false
    }
  });
}
