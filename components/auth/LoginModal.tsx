"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { signIn, useSession } from "next-auth/react";
import { useGateRouter } from "@/components/common/routeGate";

type Props = {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
  disableClose?: boolean;
};

export default function LoginModal({
  open,
  onClose,
  callbackUrl,
  disableClose
}: Props) {
  const router = useGateRouter();
  const [mounted, setMounted] = useState(false);
  const [isLightMode, setIsLightMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { status } = useSession();

  const cb = useMemo(() => callbackUrl ?? "/", [callbackUrl]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted || !open) return;
    const updateTheme = () => {
      const hasAdminRoot = Boolean(document.querySelector(".admin-root"));
      if (hasAdminRoot) {
        setIsLightMode(document.body.classList.contains("admin-light"));
        return;
      }
      setIsLightMode(!document.body.classList.contains("site-dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || !open || disableClose) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [disableClose, mounted, onClose, open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    if (status === "authenticated") {
      onClose?.();
      router.replace(cb);
      router.refresh();
    }
  }, [status, open, cb, onClose, router]);

  if (!mounted || !open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: cb
      });

      if (res?.ok) {
        onClose?.();
        const url = (res as any)?.url || cb;
        router.replace(url);
        router.refresh();
        return;
      }

      const msg =
        res?.error === "CredentialsSignin"
          ? "아이디나 비밀번호가 틀렸습니다"
          : "로그인에 실패했어요. 잠시 후 다시 시도해 주세요";
      setToast(msg);
    } catch {
      setToast("일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  }

  async function handleKakao() {
    if (kakaoLoading) return;
    setKakaoLoading(true);
    try {
      await signIn("kakao", { callbackUrl: cb });
    } finally {
      setKakaoLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label={disableClose ? undefined : "닫기"}
        onClick={disableClose ? undefined : onClose}
        className={`absolute inset-0 backdrop-blur-[2px] ${
          isLightMode ? "bg-black/40" : "bg-black/60"
        }`}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={[
            "w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ring-1 relative",
            isLightMode ? "bg-[#151a22] text-zinc-900 ring-black/5" : "bg-zinc-950 text-zinc-100 ring-white/10"
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-4 py-4">
            {disableClose ? (
              <div className="w-6" aria-hidden />
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={[
                  "p-1 rounded transition",
                  isLightMode ? "hover:bg-zinc-100" : "hover:bg-zinc-800 text-zinc-200"
                ].join(" ")}
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            <div className="text-base font-semibold">로그인</div>
            <div className="w-6" aria-hidden />
          </div>

          <div className="px-5 pb-5 space-y-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <label
                className={`block text-sm font-medium ${
                  isLightMode ? "text-zinc-700" : "text-zinc-200"
                }`}
              >
                이메일
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={[
                  "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2",
                  isLightMode
                    ? "border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                    : "border-zinc-800 bg-zinc-900/70 text-zinc-100 focus:ring-zinc-700"
                ].join(" ")}
              />

              <label
                className={`block text-sm font-medium ${
                  isLightMode ? "text-zinc-700" : "text-zinc-200"
                }`}
              >
                비밀번호
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={[
                  "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2",
                  isLightMode
                    ? "border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                    : "border-zinc-800 bg-zinc-900/70 text-zinc-100 focus:ring-zinc-700"
                ].join(" ")}
              />

              <button
                type="submit"
                disabled={loading || !email || !password}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60 focus:outline-none focus:ring-2",
                  isLightMode
                    ? "bg-black text-white focus:ring-black/20 hover:bg-zinc-900"
                    : "bg-[#151a22] text-zinc-900 focus:ring-white/20 hover:bg-zinc-200"
                ].join(" ")}
              >
                {loading ? "로그인 중…" : "로그인"}
              </button>

              <button
                type="button"
                onClick={handleKakao}
                disabled={kakaoLoading}
                className={[
                  "w-full rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60 border hover:brightness-[0.98] focus:outline-none focus:ring-2 focus:ring-black/10 flex items-center justify-center gap-2",
                  isLightMode ? "border-black/10" : "border-white/10"
                ].join(" ")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 4.5c-4.694 0-8.5 3.03-8.5 6.767 0 2.214 1.3 4.168 3.342 5.392l-1.079 3.22c-.14.42.27.81.67.62l3.887-1.9c.542.094 1.103.143 1.68.143 4.694 0 8.5-3.03 8.5-6.767C20.5 7.53 16.694 4.5 12 4.5Z"
                    fill="currentColor"
                  />
                </svg>
                {kakaoLoading ? "카카오로 이동 중…" : "카카오로 시작하기"}
              </button>

              <div className="text-center pt-1">
                <a href="/signup" className="text-sm font-semibold text-black hover:opacity-80">
                  가입하기
                </a>
              </div>
            </form>
          </div>

          <div
            aria-live="assertive"
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 transition-all ${
              toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            {toast && (
              <div className="pointer-events-auto rounded-xl bg-black px-4 py-2 text-sm text-white shadow-lg ring-1 ring-black/10">
                {toast}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
