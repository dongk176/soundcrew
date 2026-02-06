import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6)
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, kakaoUserId: true }
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (user.kakaoUserId) {
    return NextResponse.json({ ok: false, error: "KAKAO_USER" }, { status: 400 });
  }

  if (user.passwordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ ok: false, error: "CURRENT_REQUIRED" }, { status: 400 });
    }
    const valid = verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "CURRENT_INVALID" }, { status: 400 });
    }
  }

  const hashed = hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashed }
  });

  return NextResponse.json({ ok: true });
}
