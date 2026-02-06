"use client";

import { users } from "@/lib/mockData";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const user = users.find((item) => item.username === params.username) ?? users[0];

  return (
    <div className="min-h-screen bg-[#151a22]">
      <AppHeader showSearch={false} />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <Card className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="h-24 w-24 rounded-full border border-border bg-slate-100" />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">{user.name}</h1>
              <p className="text-sm text-muted">{user.intro}</p>
              <div className="flex flex-wrap gap-2">
                {user.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted">
                {user.location} · {user.genre}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "응답률", value: `${user.responseRate}%` },
              { label: "응답 시간", value: user.responseTime },
              { label: "완료 건수", value: `${user.completed}건` }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8">
          <Tabs defaultValue="portfolio" className="space-y-6">
            <TabsList className="gap-3">
              <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
              <TabsTrigger value="reviews">리뷰</TabsTrigger>
              <TabsTrigger value="gear">장비</TabsTrigger>
              <TabsTrigger value="about">소개</TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio">
              <div className="grid gap-4 md:grid-cols-3">
                {user.portfolios.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="h-36 bg-slate-100" />
                    <div className="p-4">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-accent">링크 보기</p>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {user.reviews.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <span className="text-xs text-muted">{item.date}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted">평점 {item.rating}</p>
                    <p className="mt-2 text-sm">{item.comment}</p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gear">
              <div className="grid gap-4 md:grid-cols-2">
                {["Neumann TLM103", "UA Apollo Twin", "Logic Pro", "Manley VoxBox"].map(
                  (gear) => (
                    <Card key={gear} className="p-4">
                      <p className="text-sm font-semibold">{gear}</p>
                      <p className="mt-1 text-xs text-muted">보유 장비</p>
                    </Card>
                  )
                )}
              </div>
            </TabsContent>

            <TabsContent value="about">
              <Card className="p-6">
                <p className="text-sm text-muted">
                  다양한 장르의 세션과 공연 경험이 있습니다. 디렉션과 커뮤니케이션을
                  빠르게 이해하고, 톤에 맞춘 녹음 퀄리티를 제공합니다.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
