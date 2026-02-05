"use client";

import Link from "next/link";
import { Bookmark, Home, MessageSquare, Plus, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LoginModal from "@/components/auth/LoginModal";

type AppHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
};

export const AppHeader = ({
  searchValue,
  onSearchChange,
  showSearch = true
}: AppHeaderProps) => {
  const { data: session } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleProfileClick = () => {
    if (session?.user?.id) {
      router.push("/me");
      return;
    }
    setLoginOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          SoundCrew
        </Link>
        <div className="flex-1">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="포지션/악기/장르/지역 검색"
                className="pl-10"
                aria-label="검색"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-lg"
            onClick={() => {
              if (session?.user?.id) {
                router.push("/artists/new");
                return;
              }
              setLoginOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            아티스트 등록
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            {[{
              href: "/messages",
              icon: MessageSquare,
              label: "메시지"
            },
            {
              href: "/me",
              icon: Bookmark,
              label: "저장"
            }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
            <button
              type="button"
              onClick={handleProfileClick}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              )}
              aria-label="프로필"
            >
              <UserCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} callbackUrl="/me" />
      </header>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3">
          {[
            { href: "/", icon: Home, label: "홈", key: "home" },
            { href: "/messages", icon: MessageSquare, label: "메시지", key: "messages" },
            { href: "/me?tab=saved", icon: Bookmark, label: "저장", key: "saved" },
            { href: "/me?tab=profile", icon: UserCircle, label: "마이페이지", key: "profile" }
          ].map((item) => {
            const tab = searchParams?.get("tab");
            const active =
              item.key === "home"
                ? pathname === "/"
                : item.key === "messages"
                ? pathname?.startsWith("/messages")
                : pathname?.startsWith("/me") && tab === item.key;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-accent" : "text-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};
