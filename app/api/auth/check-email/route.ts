import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function validEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const value = (searchParams.get("v") || "").toLowerCase().trim();

  if (!validEmail(value)) {
    return NextResponse.json({ ok: true, available: false, reason: "INVALID" });
  }

  const exists = await prisma.user.findFirst({
    where: { email: { equals: value, mode: "insensitive" } },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, available: !exists });
}
