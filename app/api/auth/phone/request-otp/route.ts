export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import bcrypt from "bcryptjs";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

const TTL = Number(process.env.OTP_TTL_SECONDS || 180);
const RESEND_COOLDOWN = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const p = onlyDigits(phone);
    if (!p || p.length < 10) {
      return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }

    const last = await prisma.phoneOtp.findFirst({
      where: { phone: p },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    });
    if (last) {
      const diff = (Date.now() - last.createdAt.getTime()) / 1000;
      if (diff < RESEND_COOLDOWN) {
        return NextResponse.json(
          { ok: false, error: "COOLDOWN", retryAfter: Math.ceil(RESEND_COOLDOWN - diff) },
          { status: 429 }
        );
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 1000 * TTL);

    const created = await prisma.phoneOtp.create({
      data: {
        phone: p,
        codeHash,
        expiresAt
      },
      select: { id: true }
    });

    const ttlMin = Math.max(1, Math.ceil(TTL / 60));
    await sendSms(p, `[SoundCrew] 인증번호 ${code} (${ttlMin}분 내 입력)`, {
      customFields: { purpose: "otp", otpId: created.id, phone: p }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-otp]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
