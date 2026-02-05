import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("v") || "";
  const digits = onlyDigits(raw);

  if (digits.length < 10 || digits.length > 11) {
    return NextResponse.json({ ok: true, available: false, reason: "INVALID" });
  }

  const exists = await prisma.user.findFirst({
    where: { phone: digits },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, available: !exists });
}
