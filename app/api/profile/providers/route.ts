import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kakaoUserId: true, passwordHash: true }
  });

  return NextResponse.json({
    ok: true,
    isKakao: !!user?.kakaoUserId,
    hasPassword: !!user?.passwordHash
  });
}
