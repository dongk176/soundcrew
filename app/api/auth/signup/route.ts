export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isValidNickname, normalizeNickname, nicknameKeyOf } from "@/lib/nickname";
import { LEGAL_TERMS_VERSION, PRIVACY_CONSENT_VERSION } from "@/lib/legal";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ConsentType, Prisma } from "@prisma/client";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}
function validEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function parseBirthDate(s: string) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { birthYear: m[1], birthDay: `${m[2]}${m[3]}` };
}
function normalizeGender(s: string) {
  const v = String(s || "").toUpperCase();
  if (v === "MALE" || v === "FEMALE" || v === "OTHER") return v;
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const {
      email,
      password,
      nickname,
      legalName,
      birthDate,
      gender,
      agreeTerms,
      agreePrivacy,
      agreeMarketing
    } = await req.json();

    const lower = String(email || "").toLowerCase().trim();
    const pw = String(password || "");

    const nick = normalizeNickname(String(nickname || ""));
    const nickKey = nicknameKeyOf(nick);
    const legal = String(legalName || "").trim();
    const birthParts = parseBirthDate(String(birthDate || ""));
    const genderNorm = normalizeGender(String(gender || ""));

    if (!isValidNickname(nick))
      return NextResponse.json({ ok: false, error: "INVALID_NICKNAME" }, { status: 400 });
    if (!validEmail(lower))
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    if (pw.length < 8)
      return NextResponse.json({ ok: false, error: "WEAK_PASSWORD" }, { status: 400 });
    if (!legal)
      return NextResponse.json({ ok: false, error: "INVALID_NAME" }, { status: 400 });
    if (!birthParts)
      return NextResponse.json({ ok: false, error: "INVALID_BIRTHDATE" }, { status: 400 });
    if (!genderNorm)
      return NextResponse.json({ ok: false, error: "INVALID_GENDER" }, { status: 400 });
    if (agreeTerms !== true || agreePrivacy !== true) {
      return NextResponse.json({ ok: false, error: "REQUIRED_CONSENT" }, { status: 400 });
    }

    const passwordHash = await hashPassword(pw);
    const ua = req.headers.get("user-agent") || undefined;
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || undefined;

    const sessionPhone = (session?.user as any)?.phone as string | null;
    const sessionPhoneVerified = !!(session?.user as any)?.phoneVerified;

    if (!sessionPhoneVerified || !sessionPhone) {
      return NextResponse.json({ ok: false, error: "PHONE_NOT_VERIFIED" }, { status: 401 });
    }

    const p = onlyDigits(sessionPhone);

    const nickOwner = await prisma.user.findFirst({
      where: { nicknameKey: nickKey },
      select: { id: true }
    });
    if (nickOwner) {
      return NextResponse.json({ ok: false, error: "NICKNAME_TAKEN" }, { status: 409 });
    }

    const emailOwner = await prisma.user.findFirst({
      where: { email: lower },
      select: { id: true }
    });
    if (emailOwner) {
      return NextResponse.json({ ok: false, error: "EMAIL_TAKEN" }, { status: 409 });
    }

    const phoneOwner = await prisma.user.findFirst({
      where: { phone: p },
      select: { id: true }
    });
    if (phoneOwner) {
      return NextResponse.json({ ok: false, error: "PHONE_TAKEN" }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: lower,
          passwordHash,
          name: nick,
          nicknameKey: nickKey,
          legalName: legal,
          birthYear: birthParts.birthYear,
          birthDay: birthParts.birthDay,
          gender: genderNorm as any,
          phone: p,
          phoneVerifiedAt: new Date(),
          usageTickets: 3
        },
        select: { id: true }
      });

      await tx.userConsent.createMany({
        data: ([
          {
            userId: user.id,
            type: ConsentType.TERMS,
            version: LEGAL_TERMS_VERSION,
            userAgent: ua,
            ip
          },
          {
            userId: user.id,
            type: ConsentType.PRIVACY,
            version: PRIVACY_CONSENT_VERSION,
            userAgent: ua,
            ip
          },
          ...(agreeMarketing
            ? [
                {
                  userId: user.id,
                  type: ConsentType.MARKETING,
                  version: "v1.0",
                  userAgent: ua,
                  ip
                }
              ]
            : [])
        ] satisfies Prisma.UserConsentCreateManyInput[]),
        skipDuplicates: true
      });

      return user;
    });

    if (!created) return NextResponse.json({ ok: false }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
