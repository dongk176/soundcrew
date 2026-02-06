import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const artist = await prisma.artistProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!artist) {
    return NextResponse.json({ ok: true, views: 0, saves: 0 });
  }

  const [views, saves] = await Promise.all([
    prisma.artistView.count({ where: { artistId: artist.id } }),
    prisma.artistSave.count({ where: { artistId: artist.id } })
  ]);

  return NextResponse.json({ ok: true, views, saves });
}
