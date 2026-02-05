import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidNickname, nicknameKeyOf } from "@/lib/nickname";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get("v") ?? "";

  if (!isValidNickname(value)) {
    return NextResponse.json({ ok: true, available: false, reason: "INVALID" });
  }

  const key = nicknameKeyOf(value);
  const exists = await prisma.user.findUnique({
    where: { nicknameKey: key },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, available: !exists });
}
