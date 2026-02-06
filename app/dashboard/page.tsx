"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [views, setViews] = useState<number | null>(null);
  const [saves, setSaves] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/me/artist/metrics", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) {
          setViews(data.views ?? 0);
          setSaves(data.saves ?? 0);
        }
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <h1 className="mb-8 text-3xl font-bold">대시보드</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "매칭 현황", value: "0건" },
            { label: "내 공고", value: "0건" },
            { label: "프로필 조회수", value: views === null ? "-" : String(views) },
            { label: "나를 저장한 사람", value: saves === null ? "-" : String(saves) }
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-[#232936] bg-[#151a22] p-6">
              <p className="text-sm text-[#9aa3b2]">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-[#e7e9ee]">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-4 border-b border-[#232936]">
              <nav className="-mb-px flex gap-8 overflow-x-auto">
                <button className="border-b-2 border-[#23D3FF] px-1 py-4 text-sm font-medium text-[#23D3FF]">
                  매칭 현황
                </button>
                <button className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-[#9aa3b2]">
                  내 공고
                </button>
              </nav>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-[#232936] bg-[#151a22] p-5">
                <p className="text-sm text-[#9aa3b2]">현재 매칭 내역이 없습니다.</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="rounded-lg border border-[#232936] bg-[#151a22] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">프로필 완성도</h3>
                <span className="rounded-full bg-[#23D3FF]/10 px-2 py-1 text-xs font-bold text-[#23D3FF]">
                  0%
                </span>
              </div>
              <p className="mt-2 text-sm text-[#9aa3b2]">
                정보를 채우면 더 많은 매칭이 도착합니다.
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-[#10141b]">
                <div className="h-2 w-0 rounded-full bg-[#23D3FF]" />
              </div>
              <Button className="mt-4 w-full border border-[#232936] bg-[#151a22] text-[#e7e9ee]">
                프로필 업데이트
              </Button>
            </div>
            <div className="mt-6 rounded-lg border border-[#232936] bg-[#151a22]">
              <div className="flex items-center justify-between border-b border-[#232936] px-5 py-4">
                <h3 className="font-bold">최근 활동</h3>
                <button className="text-xs font-medium text-[#23D3FF]">전체 보기</button>
              </div>
              <div className="p-4 text-sm text-[#9aa3b2]">최근 활동이 없습니다.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
