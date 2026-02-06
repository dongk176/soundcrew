"use client";

import AppSidebar from "@/components/layout/AppSidebar";

export default function DirectMatchingPage() {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="direct" />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="mb-6 text-3xl font-bold">다이렉트 매칭</h1>
        <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6 text-sm text-[#9aa3b2]">
          다이렉트 매칭 기능은 준비 중입니다.
        </div>
      </main>
    </div>
  );
}
