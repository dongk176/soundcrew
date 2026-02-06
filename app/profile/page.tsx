"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [artistSlug, setArtistSlug] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    notifyMessage: true,
    notifyRequest: true,
    notifyMarketing: false
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isKakao, setIsKakao] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/me/artist", { cache: "no-store" });
        const data = await res.json();
        if (data?.artist?.slug) setArtistSlug(data.artist.slug);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile/notifications", { cache: "no-store" });
        const data = await res.json();
        if (data?.settings) {
          setSettings(data.settings);
        }
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile/providers", { cache: "no-store" });
        const data = await res.json();
        setIsKakao(!!data?.isKakao);
        setHasPassword(!!data?.hasPassword);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await fetch("/api/profile/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
  };

  const submitPassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword || undefined,
        newPassword
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.error === "KAKAO_USER") {
        setPasswordError("카카오 로그인 계정은 비밀번호를 변경할 수 없습니다.");
        return;
      }
      if (data?.error === "CURRENT_REQUIRED") {
        setPasswordError("현재 비밀번호를 입력해주세요.");
        return;
      }
      if (data?.error === "CURRENT_INVALID") {
        setPasswordError("현재 비밀번호가 올바르지 않습니다.");
        return;
      }
      setPasswordError("비밀번호 변경에 실패했습니다.");
      return;
    }
    setPasswordSuccess("비밀번호가 변경되었습니다.");
    setCurrentPassword("");
    setNewPassword("");
    setHasPassword(true);
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="profile" />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="mb-8 text-3xl font-bold">내 계정</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 flex flex-col gap-6">
            <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-full bg-[#10141b] bg-cover bg-center"
                  style={{
                    backgroundImage: session?.user?.image ? `url(\"${session.user.image}\")` : "none"
                  }}
                />
                <div>
                  <p className="text-lg font-semibold">
                    {session?.user?.name ?? "이름 없음"}
                  </p>
                  <p className="text-sm text-[#9aa3b2]">
                    {session?.user?.email ?? "이메일 없음"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#232936] px-3 py-1 text-xs text-[#9aa3b2]">
                  {isKakao ? "카카오 로그인" : "일반 로그인"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">내 아티스트 프로필</h2>
                  <p className="text-sm text-[#9aa3b2]">
                    프로필을 업데이트하고 포트폴리오를 관리하세요.
                  </p>
                </div>
                <Button
                  className="rounded-full bg-[#23D3FF] text-white"
                  onClick={() => {
                    if (artistSlug) {
                      window.location.href = `/${artistSlug}`;
                      return;
                    }
                    window.location.href = "/artists/new";
                  }}
                >
                  {artistSlug ? "프로필 보기" : "프로필 등록"}
                </Button>
              </div>
              {artistSlug && (
                <div className="mt-4 flex justify-end">
                  <Button
                    className="rounded-full bg-[#ff4d4d] text-white hover:bg-[#e24343]"
                    onClick={() => {
                      setDeleteText("");
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                  >
                    삭제하기
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6">
              <h2 className="text-lg font-semibold">알림 설정</h2>
              <div className="mt-4 space-y-3 text-sm">
                {loadingSettings ? (
                  <p className="text-sm text-[#9aa3b2]">불러오는 중...</p>
                ) : (
                  <>
                    <label className="flex items-center justify-between">
                      <span className="text-[#c7ccd6]">메시지 수신 알림</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={settings.notifyMessage}
                        onChange={(event) => updateSetting("notifyMessage", event.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-[#c7ccd6]">매칭/요청 알림</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={settings.notifyRequest}
                        onChange={(event) => updateSetting("notifyRequest", event.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-[#c7ccd6]">마케팅 정보 수신</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={settings.notifyMarketing}
                        onChange={(event) => updateSetting("notifyMarketing", event.target.checked)}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6">
              <h2 className="text-lg font-semibold">계정 관리</h2>
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => {
                    if (isKakao) {
                      setPasswordError("카카오 로그인 계정은 비밀번호를 변경할 수 없습니다.");
                      setPasswordOpen(true);
                      return;
                    }
                    setPasswordOpen(true);
                  }}
                >
                  비밀번호 변경
                </Button>
              </div>

              <div className="mt-6 border-t border-[#232936] pt-4">
                <Button
                  className="w-full rounded-full bg-[#0B0B0C] text-white"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  로그아웃
                </Button>
              </div>

              <div className="mt-6 border-t border-[#232936] pt-4">
                <h3 className="text-sm font-semibold text-[#c7ccd6]">정책</h3>
                <div className="mt-3 space-y-2 text-sm text-[#9aa3b2]">
                  <button className="text-left hover:text-[#23D3FF]">이용약관</button>
                  <button className="text-left hover:text-[#23D3FF]">개인정보처리방침</button>
                  <button className="text-left hover:text-[#23D3FF]">고객센터</button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {passwordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#151a22] p-6 shadow-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">비밀번호 변경</h3>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="text-sm text-gray-400"
              >
                닫기
              </button>
            </div>
            {isKakao ? (
              <p className="mt-4 text-sm text-[#9aa3b2]">
                카카오 로그인 계정은 비밀번호를 변경할 수 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {hasPassword && (
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="현재 비밀번호"
                    className="h-12"
                  />
                )}
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  className="h-12"
                />
              </div>
            )}
            {passwordError && <p className="mt-3 text-sm text-red-500">{passwordError}</p>}
            {passwordSuccess && (
              <p className="mt-3 text-sm text-green-600">{passwordSuccess}</p>
            )}
            {!isKakao && (
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPasswordOpen(false)}
                >
                  취소
                </Button>
                <Button type="button" onClick={submitPassword}>
                  변경하기
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#151a22] p-6 shadow-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">프로필 삭제</h3>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="text-sm text-[#9aa3b2]"
              >
                닫기
              </button>
            </div>
            <p className="mt-3 text-sm text-[#c1c7d3]">
              삭제를 진행하려면 아래 입력칸에 <strong>삭제하기</strong>를 입력해주세요.
            </p>
            <Input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              placeholder="삭제하기"
              className="mt-4 h-12"
            />
            {deleteError && <p className="mt-2 text-sm text-red-500">{deleteError}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                className="bg-[#ff4d4d] text-white hover:bg-[#e24343]"
                onClick={async () => {
                  if (deleteText.trim() !== "삭제하기") {
                    setDeleteError("정확히 '삭제하기'를 입력해주세요.");
                    return;
                  }
                  const res = await fetch("/api/me/artist", { method: "DELETE" });
                  if (res.ok) {
                    setArtistSlug(null);
                    setDeleteOpen(false);
                  } else {
                    setDeleteError("삭제에 실패했습니다. 다시 시도해주세요.");
                  }
                }}
              >
                삭제하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
