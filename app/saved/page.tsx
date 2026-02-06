"use client";

import AppSidebar from "@/components/layout/AppSidebar";

export default function SavedPage() {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="saved" />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="mb-6 text-3xl font-bold">저장된</h1>
        <div className="rounded-2xl border border-[#232936] bg-[#151a22] p-6 text-sm text-[#9aa3b2]">
          저장된 항목이 없습니다.
        </div>
      </main>
    </div>
  );
}
