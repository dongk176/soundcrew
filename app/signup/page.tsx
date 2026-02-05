"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import LegalSheet from "@/components/legal/LegalSheet";
import PhoneAuthWidget from "@/components/auth/PhoneAuthWidget";
import { useGateRouter } from "@/components/common/routeGate";
import { AppHeader } from "@/components/layout/AppHeader";

function normalizeNickname(s: string) {
  return (s || "").trim().replace(/\s+/g, " ");
}
function isValidNickname(s: string) {
  const n = normalizeNickname(s);
  return /^[\p{L}\p{N} _.\-]{2,20}$/u.test(n);
}
function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim().toLowerCase());
}
function isValidBirthDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
}
function isValidLegalName(s: string) {
  const v = (s || "").trim();
  if (!v) return false;
  return /^[가-힣]+(?:\s+[가-힣]+)*$/.test(v);
}

const DOC_URL = {
  terms: "/legal/terms",
  privacy: "/legal/privacy-consent"
} as const;

export default function SignupPage() {
  const router = useGateRouter();

  const [verified, setVerified] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nickOK, setNickOK] = useState<boolean | null>(null);
  const [checkingNick, setCheckingNick] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");

  const [email, setEmail] = useState("");
  const [emailOK, setEmailOK] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const allReqOk = agreeTerms && agreePrivacy;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDoc, setSheetDoc] = useState<"terms" | "privacy">("terms");

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const up = (e: MediaQueryList | MediaQueryListEvent) => setIsDesktop(!!e.matches);
    up(mq);
    mq.addEventListener?.("change", up);
    return () => mq.removeEventListener?.("change", up);
  }, []);

  const openDoc = (doc: "terms" | "privacy") => {
    if (isDesktop) {
      window.open(DOC_URL[doc], "_blank", "noopener");
    } else {
      setSheetDoc(doc);
      setSheetOpen(true);
    }
  };

  const birthMax = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const v = nickname;
    setNickOK(null);
    if (!isValidNickname(v)) return;
    setCheckingNick(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/check-nickname?v=${encodeURIComponent(v)}`, {
          cache: "no-store"
        });
        const j = await r.json();
        setNickOK(!!j.available);
      } catch {
        setNickOK(null);
      } finally {
        setCheckingNick(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [nickname]);

  useEffect(() => {
    const v = (email || "").trim().toLowerCase();
    setEmailOK(null);
    if (!isValidEmail(v)) return;
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/check-email?v=${encodeURIComponent(v)}`, {
          cache: "no-store"
        });
        const j = await r.json();
        setEmailOK(!!j.available);
      } catch {
        setEmailOK(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [email]);

  async function submit() {
    setError(null);
    if (!verified) {
      setError("휴대폰 인증을 완료해 주세요.");
      return;
    }
    if (!isValidNickname(nickname)) {
      setError("닉네임은 2~20자로 입력해 주세요.");
      return;
    }
    if (nickOK === false) {
      setError("이미 사용중인 닉네임입니다.");
      return;
    }
    if (!isValidLegalName(legalName)) {
      setError("이름은 한글만 입력해 주세요.");
      return;
    }
    if (!isValidBirthDate(birthDate)) {
      setError("생년월일을 확인해 주세요.");
      return;
    }
    if (!gender || gender === "UNKNOWN") {
      setError("성별을 선택해 주세요.");
      return;
    }
    if (!allReqOk) {
      setError("필수 약관에 동의해 주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (emailOK === false) {
      setError("이미 사용중인 이메일입니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상으로 설정해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname: normalizeNickname(nickname),
          legalName: legalName.trim(),
          birthDate,
          gender,
          agreeTerms,
          agreePrivacy,
          agreeMarketing
        })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "SIGNUP_FAIL");

      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.ok) router.replace("/");
      else router.replace("/login?ok=1");
    } catch (e: any) {
      const code = (e?.message || "").toUpperCase();
      if (code === "NICKNAME_TAKEN") setError("이미 사용중인 닉네임입니다.");
      else if (code === "EMAIL_TAKEN") setError("이미 사용중인 이메일입니다.");
      else if (code === "INVALID_NICKNAME")
        setError("닉네임은 2~20자, 한글/영문/숫자/공백/._-만 사용 가능해요.");
      else if (code === "INVALID_NAME") setError("이름은 한글만 입력해 주세요.");
      else if (code === "INVALID_BIRTHDATE") setError("생년월일을 확인해 주세요.");
      else if (code === "INVALID_GENDER") setError("성별을 선택해 주세요.");
      else if (code === "WEAK_PASSWORD") setError("비밀번호는 8자 이상이어야 해요.");
      else if (code === "INVALID_EMAIL") setError("이메일 형식을 확인해 주세요.");
      else if (code === "PHONE_NOT_VERIFIED")
        setError("휴대폰 인증이 필요해요. 위에서 인증을 완료해 주세요.");
      else if (code === "PHONE_TAKEN" || code === "ACCOUNT_CONFLICT")
        setError("이미 가입된 전화번호예요. 로그인 또는 아이디 찾기를 이용해 주세요.");
      else setError("가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100svh] bg-white">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-[18px] font-semibold">휴대폰 인증</h2>
            <div className="mt-3">
              <PhoneAuthWidget onVerified={() => setVerified(true)} callbackUrl="/signup" />
            </div>
          </div>

          <div>
            <h2 className="text-[18px] font-semibold">기본 정보</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">닉네임</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="2~20자, 한글/영문/숫자/공백/._-"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                />
                {checkingNick && <p className="mt-1 text-xs text-zinc-500">확인 중…</p>}
                {nickOK === false && <p className="mt-1 text-xs text-red-600">이미 사용중</p>}
                {nickOK === true && <p className="mt-1 text-xs text-green-600">사용 가능</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">이름</label>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="한글 이름"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">생년월일</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={birthMax}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">성별</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    <option value="UNKNOWN">선택</option>
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[18px] font-semibold">계정 정보</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">이메일</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                />
                {checkingEmail && <p className="mt-1 text-xs text-zinc-500">확인 중…</p>}
                {emailOK === false && <p className="mt-1 text-xs text-red-600">이미 사용중</p>}
                {emailOK === true && <p className="mt-1 text-xs text-green-600">사용 가능</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    className="absolute right-3 top-3 text-xs text-zinc-500"
                  >
                    {showPw ? "숨김" : "보기"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[18px] font-semibold">약관 동의</h2>
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                <span>
                  (필수) 서비스 이용약관 동의
                  <button type="button" className="ml-2 underline" onClick={() => openDoc("terms")}>
                    보기
                  </button>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
                <span>
                  (필수) 개인정보 수집·이용 동의
                  <button type="button" className="ml-2 underline" onClick={() => openDoc("privacy")}>
                    보기
                  </button>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={(e) => setAgreeMarketing(e.target.checked)}
                />
                <span>(선택) 마케팅 정보 수신 동의</span>
              </label>
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "가입 중…" : "가입하기"}
          </button>
        </div>
      </main>

      <LegalSheet open={sheetOpen} doc={sheetDoc} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
