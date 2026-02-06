import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const artist = await prisma.artistProfile.findUnique({
    where: { slug: params.slug },
    select: { id: true }
  });

  if (!artist) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const artistId = artist.id;
  const existing = await prisma.artistSave.findFirst({
    where: { artistId, userId },
    select: { id: true }
  });

  if (existing) {
    await prisma.artistSave.delete({ where: { id: existing.id } });
  } else {
    await prisma.artistSave.create({
      data: { artistId, userId }
    });
  }

  const savedCount = await prisma.artistSave.count({ where: { artistId } });
  const isSaved = !existing;

  return NextResponse.json({ ok: true, isSaved, savedCount });
}
