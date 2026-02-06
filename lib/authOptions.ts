import type { NextAuthOptions, User } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import KakaoProvider from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendAlimtalk } from "@/lib/alimtalk";

const isProd = process.env.NODE_ENV === "production";

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const TPL_SIGNUP_WELCOME = process.env.SOLAPI_TPL_SIGNUP_WELCOME;

async function sendSignupWelcome(to: string | null | undefined, name: string | null | undefined) {
  const p = onlyDigits(String(to || ""));
  if (p.length < 10 || !TPL_SIGNUP_WELCOME) return;
  try {
    await sendAlimtalk(
      p,
      TPL_SIGNUP_WELCOME,
      {
        "#{회원명}": name || "회원",
        "#{고객명}": name || "회원",
        "#{닉네임}": name || "회원"
      },
      { customFields: { purpose: "signup" } }
    );
  } catch (e) {
    console.error("[signup welcome alimtalk] fail", e);
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: !isProd,
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/signup"
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },

  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "profile_nickname profile_image phone_number account_email name gender birthday birthyear age_range"
        }
      },
      profile(profile) {
        const kakaoAccount = (profile as any)?.kakao_account;
        const phoneRaw: string | undefined = kakaoAccount?.phone_number;
        const phoneDigits = phoneRaw ? onlyDigits(phoneRaw) : undefined;
        const rawGender = String(kakaoAccount?.gender || "").toLowerCase();
        const gender = rawGender === "male" ? "MALE" : rawGender === "female" ? "FEMALE" : null;
        const ageRange = kakaoAccount?.age_range || null;

        return {
          id: String(profile.id),
          name:
            kakaoAccount?.profile?.nickname ||
            (profile as any)?.properties?.nickname ||
            null,
          legalName: kakaoAccount?.name || null,
          birthYear: kakaoAccount?.birthyear || null,
          birthDay: kakaoAccount?.birthday || null,
          gender,
          ageRange,
          email: kakaoAccount?.email || null,
          image:
            kakaoAccount?.profile?.thumbnail_image_url ||
            (profile as any)?.properties?.profile_image ||
            null,
          phone: phoneDigits || null,
          kakaoUserId: String(profile.id)
        } as any;
      }
    }),

    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(creds): Promise<User | null> {
        const emailIn = (creds?.email || "").trim().toLowerCase();
        const password = creds?.password || "";
        if (!emailIn || !password) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: emailIn, mode: "insensitive" } },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            isAdmin: true,
            isHost: true,
            allowKakaoNotice: true,
            kakaoUserId: true,
            phone: true,
            phoneVerifiedAt: true
          }
        });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          image: user.image ?? undefined
        } as unknown as User;
      }
    }),

    CredentialsProvider({
      id: "phone-otp",
      name: "phone-otp",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" }
      },
      async authorize(creds) {
        const phoneDigits = onlyDigits(String(creds?.phone || ""));
        const code = String(creds?.code || "").trim();
        if (!phoneDigits || code.length < 4) throw new Error("INVALID_OTP");

        const otpRow = await prisma.phoneOtp.findFirst({
          where: { phone: phoneDigits },
          orderBy: { createdAt: "desc" }
        });
        if (!otpRow) throw new Error("OTP_NOT_FOUND");
        if (otpRow.expiresAt < new Date()) throw new Error("OTP_EXPIRED");
        if (otpRow.attempts >= OTP_MAX_ATTEMPTS) throw new Error("TOO_MANY_ATTEMPTS");

        const ok = await (await import("bcryptjs")).compare(code, otpRow.codeHash);
        if (!ok) {
          await prisma.phoneOtp.update({
            where: { id: otpRow.id },
            data: { attempts: { increment: 1 } }
          });
          throw new Error("OTP_MISMATCH");
        }

        await prisma.phoneOtp.delete({ where: { id: otpRow.id } });

        return {
          id: `phone:${phoneDigits}`,
          phone: phoneDigits,
          phoneOtpOnly: true
        } as unknown as User;
      }
    })
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if ((user as any)?.phoneOtpOnly) {
        token.sub = (user as any).id;
        (token as any).phone = (user as any).phone ?? null;
        (token as any).phoneVerified = true;
        (token as any).phoneOtpOnly = true;
        return token;
      }

      if (user?.id) {
        token.sub = (user as any).id;
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.sub) },
          select: {
            email: true,
            name: true,
            image: true,
            nicknameKey: true,
            isAdmin: true,
            isHost: true,
            allowKakaoNotice: true,
            kakaoUserId: true,
            phone: true,
            phoneVerifiedAt: true,
            usageTickets: true,
            topExposureTickets: true
          }
        });
        if (dbUser) {
          token.email = dbUser.email ?? token.email;
          (token as any).name = dbUser.name ?? (token as any).name;
          (token as any).picture = dbUser.image ?? (token as any).picture;
          (token as any).nicknameKey = dbUser.nicknameKey ?? (token as any).nicknameKey ?? null;
          (token as any).isAdmin = !!dbUser.isAdmin;
          (token as any).isHost = !!dbUser.isHost;
          (token as any).allowKakaoNotice = !!dbUser.allowKakaoNotice;
          (token as any).kakaoUserId = dbUser.kakaoUserId ?? null;
          (token as any).phone = dbUser.phone ?? null;
          (token as any).phoneVerified = !!dbUser.phoneVerifiedAt;
          (token as any).usageTickets = dbUser.usageTickets ?? 0;
          (token as any).topExposureTickets = dbUser.topExposureTickets ?? 0;
        }
      }

      if (trigger === "update" && token.sub) {
        if ((token as any).phoneOtpOnly) {
          return token;
        }
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.sub) },
          select: {
            email: true,
            name: true,
            image: true,
            nicknameKey: true,
            isAdmin: true,
            isHost: true,
            allowKakaoNotice: true,
            kakaoUserId: true,
            phone: true,
            phoneVerifiedAt: true,
            usageTickets: true,
            topExposureTickets: true
          }
        });
        if (dbUser) {
          token.email = dbUser.email ?? token.email;
          (token as any).name = dbUser.name ?? (token as any).name;
          (token as any).picture = dbUser.image ?? (token as any).picture;
          (token as any).nicknameKey = dbUser.nicknameKey ?? (token as any).nicknameKey ?? null;
          (token as any).isAdmin = !!dbUser.isAdmin;
          (token as any).isHost = !!dbUser.isHost;
          (token as any).allowKakaoNotice = !!dbUser.allowKakaoNotice;
          (token as any).kakaoUserId = dbUser.kakaoUserId ?? null;
          (token as any).phone = dbUser.phone ?? null;
          (token as any).phoneVerified = !!dbUser.phoneVerifiedAt;
          (token as any).usageTickets = dbUser.usageTickets ?? 0;
          (token as any).topExposureTickets = dbUser.topExposureTickets ?? 0;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub ?? (session.user as any).id;
        session.user.email = (token.email as string | null) ?? session.user.email ?? null;
        session.user.name = ((token as any).name as string | null) ?? session.user.name ?? null;
        session.user.image =
          ((token as any).picture as string | null) ?? session.user.image ?? null;
        (session.user as any).nicknameKey =
          (token as any).nicknameKey ?? (session.user as any).nicknameKey ?? null;
        (session.user as any).isAdmin = !!(token as any).isAdmin;
        (session.user as any).isHost = !!(token as any).isHost;
        (session.user as any).allowKakaoNotice = !!(token as any).allowKakaoNotice;
        (session.user as any).kakaoUserId = (token as any).kakaoUserId ?? null;
        (session.user as any).phone = (token as any).phone ?? null;
        (session.user as any).phoneVerified = !!(token as any).phoneVerified;
        (session.user as any).usageTickets = (token as any).usageTickets ?? 0;
        (session.user as any).topExposureTickets = (token as any).topExposureTickets ?? 0;
        (session.user as any).phoneOtpOnly = !!(token as any).phoneOtpOnly;
      }
      return session;
    }
  },

  events: {
    async createUser({ user }) {
      await sendSignupWelcome((user as any)?.phone ?? null, user.name ?? null);
      try {
        if ((user as any)?.usageTickets && (user as any).usageTickets > 0) return;
        await prisma.user.update({
          where: { id: user.id },
          data: { usageTickets: 3 }
        });
      } catch (err) {
        console.error("[createUser] usageTickets init failed:", err);
      }
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "kakao" && account.providerAccountId) {
        const p = profile as any;
        const kakaoAccount = p?.kakao_account;
        const phoneRaw: string | undefined = kakaoAccount?.phone_number;
        const phoneDigits = p?.phone || (phoneRaw ? onlyDigits(phoneRaw) : undefined);
        const rawGender = String(kakaoAccount?.gender || "").toLowerCase();
        const mappedGender =
          rawGender === "male" ? "MALE" : rawGender === "female" ? "FEMALE" : null;
        const legalName = p?.legalName || kakaoAccount?.name || null;
        const birthYear = p?.birthYear || kakaoAccount?.birthyear || null;
        const birthDay = p?.birthDay || kakaoAccount?.birthday || null;
        const gender = p?.gender || mappedGender || null;
        const ageRange = p?.ageRange || kakaoAccount?.age_range || null;

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              kakaoUserId: account.providerAccountId,
              ...(legalName ? { legalName } : {}),
              ...(birthYear ? { birthYear: String(birthYear) } : {}),
              ...(birthDay ? { birthDay: String(birthDay) } : {}),
              ...(gender ? { gender: gender as any } : {}),
              ...(ageRange ? { ageRange: String(ageRange) } : {}),
              ...(phoneDigits ? { phone: phoneDigits, phoneVerifiedAt: new Date() } : {})
            }
          });
        } catch (e) {
          console.error("[kakao signIn] update failed:", e);
        }
      }
    }
  },

  logger: {
    error(code, ...msg) {
      console.error("[NextAuth error]", code, ...msg);
    },
    warn(code, ...msg) {
      console.warn("[NextAuth warn]", code, ...msg);
    },
    debug(code, ...msg) {
      if (!isProd) console.log("[NextAuth debug]", code, ...msg);
    }
  }
};
