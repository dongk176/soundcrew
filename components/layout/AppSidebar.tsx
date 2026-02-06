"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoginModal from "@/components/auth/LoginModal";
import {
  Bookmark,
  Home,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarKey =
  | "home"
  | "dashboard"
  | "direct"
  | "messages"
  | "saved"
  | "artists"
  | "profile";

type AppSidebarProps = {
  active: SidebarKey;
};

export default function AppSidebar({ active }: AppSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);

  const go = (path: string, requiresAuth?: boolean) => {
    if (requiresAuth && !session?.user?.id) {
      setLoginOpen(true);
      return;
    }
    router.push(path);
  };

  return (
    <>
      <div className="hidden h-screen w-[240px] shrink-0 md:block" />
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-[#232936] bg-[#151a22] md:flex">
        <div className="flex-1 p-5 pb-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative">
              <div
                className="aspect-square size-10 rounded-full bg-cover bg-center bg-no-repeat ring-2 ring-gray-100"
                style={{
                  backgroundImage: session?.user?.image ? `url(\"${session.user.image}\")` : "none"
                }}
              />
              <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium leading-tight text-[#e7e9ee]">SoundCrew</h1>
              <p className="text-xs font-medium uppercase tracking-wide text-[#23D3FF]">
                {active === "home" ? "홈" : "내 공간"}
              </p>
            </div>
          </div>
          <nav className="mb-6 flex flex-col gap-2">
            <button
              onClick={() => go("/")}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "home"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <Home className="h-6 w-6" />
              <span className="text-base font-medium">홈</span>
            </button>
            <button
              onClick={() => go("/dashboard")}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "dashboard"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <LayoutDashboard className="h-6 w-6" />
              <span className="text-base font-medium">대시보드</span>
            </button>
            <button
              onClick={() => go("/direct-matching")}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "direct"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <Search className="h-6 w-6" />
              <span className="text-base font-medium">다이렉트 매칭</span>
            </button>
            <button
              onClick={() => go("/messages", true)}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "messages"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-base font-medium">메시지함</span>
            </button>
            <button
              onClick={() => go("/saved")}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "saved"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <Bookmark className="h-6 w-6" />
              <span className="text-base font-medium">저장된</span>
            </button>
            <button
              onClick={() => go("/artists/new", true)}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 transition-colors",
                active === "artists"
                  ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                  : "text-[#9aa3b2] hover:bg-[#10141b]"
              )}
            >
              <Plus className={cn("h-6 w-6", active === "artists" ? "text-[#23D3FF]" : "text-[#23D3FF]")} />
              <span className="text-base font-semibold">아티스트 등록</span>
            </button>
          </nav>
        </div>
        <div className="p-5 pt-0">
          <button
            onClick={() => go("/profile", true)}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-colors",
              active === "profile"
                ? "bg-[#23D3FF]/10 text-[#23D3FF]"
                : "text-[#9aa3b2] hover:bg-[#10141b]"
            )}
          >
            <UserCircle className="h-6 w-6" />
            <span className="text-base font-medium">프로필</span>
          </button>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#232936] bg-[#151a22]/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3">
          {[
            { key: "home", icon: Home, href: "/" },
            { key: "dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { key: "direct", icon: Search, href: "/direct-matching" },
            { key: "messages", icon: MessageSquare, href: "/messages" },
            { key: "saved", icon: Bookmark, href: "/saved" }
          ].map((item) => {
            const activeClass =
              active === item.key ? "text-[#23D3FF]" : "text-gray-400";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.href)}
                className={cn("flex flex-col items-center justify-center gap-1 text-xs", activeClass)}
                aria-label={item.key}
              >
                <item.icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
