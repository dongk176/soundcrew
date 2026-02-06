"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import LoginModal from "@/components/auth/LoginModal";
import { cn } from "@/lib/utils";
import AppSidebar from "@/components/layout/AppSidebar";
import { Textarea } from "@/components/ui/textarea";

type ThreadItem = {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type MessageItem = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

type ThreadInfo = {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const label = hours >= 12 ? "오후" : "오전";
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return `${label} ${h}:${minutes}`;
};

export default function MessagesListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") setLoginOpen(true);
  }, [status]);

  const loadThreads = async () => {
    const res = await fetch("/api/messages/threads", { cache: "no-store" });
    if (!res.ok) {
      setThreads([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setThreads(data.threads ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadThreads();
  }, [status]);

  useEffect(() => {
    const threadId = searchParams.get("thread");
    if (threadId) setSelectedThreadId(threadId);
  }, [searchParams]);

  const loadMessages = async (threadId: string) => {
    const res = await fetch(`/api/messages/threads/${threadId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setThread(data.thread ?? null);
  };

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      setThread(null);
      return;
    }
    void loadMessages(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const resizeTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  };

  const sendMessage = async () => {
    if (sendingRef.current) return;
    if (!selectedThreadId) return;
    if (!message.trim()) {
      setError("메시지를 입력해주세요.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/threads/${selectedThreadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message.trim() })
      });
      if (!res.ok) throw new Error("SEND_FAIL");
      setMessage("");
      resizeTextarea();
      await loadMessages(selectedThreadId);
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    return threads.filter((thread) =>
      thread.otherUser.name.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [threads, search]);

  if (status === "loading") return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="messages" />

      <main className="flex h-full flex-1 overflow-hidden">
        <section className="flex h-full w-full flex-col border-r border-[#232936] bg-[#151a22] lg:w-[360px]">
          <div className="px-6 pb-4 pt-6">
            <h1 className="text-2xl font-semibold">메시지함</h1>
            <p className="mt-2 text-sm text-[#9aa3b2]">대화를 선택해 메시지를 확인하세요.</p>
          </div>
          <div className="px-6 pb-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#232936] bg-[#10141b] px-3 text-sm"
              placeholder="대화 검색..."
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="px-6 text-sm text-gray-400">불러오는 중...</p>}
            {!loading && filteredThreads.length === 0 && (
              <p className="px-6 text-sm text-gray-400">대화가 없습니다.</p>
            )}
            {filteredThreads.map((threadItem) => (
              <button
                key={threadItem.id}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    router.push(`/messages/${threadItem.id}`);
                  } else {
                    setSelectedThreadId(threadItem.id);
                    router.replace(`/messages?thread=${threadItem.id}`);
                  }
                }}
                className={cn(
                  "group flex w-full items-start gap-3 border-b border-[#232936] px-6 py-4 text-left transition-colors hover:bg-[#10141b]",
                  selectedThreadId === threadItem.id && "bg-[#10141b]"
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className="aspect-square size-12 rounded-full bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: threadItem.otherUser.avatarUrl
                        ? `url(\"${threadItem.otherUser.avatarUrl}\")`
                        : "none"
                    }}
                  />
                  <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-0.5 flex items-baseline justify-between">
                    <span className="truncate text-sm font-semibold text-[#e7e9ee]">
                      {threadItem.otherUser.name}
                    </span>
                    <span className="text-xs font-medium text-[#23D3FF]">
                      {formatRelativeTime(threadItem.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-[#9aa3b2]">
                    {threadItem.lastMessage || "메시지가 없습니다."}
                  </p>
                </div>
                {threadItem.unreadCount > 0 && (
                  <span className="ml-1 mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#23D3FF] px-1 text-[10px] font-bold text-white">
                    {threadItem.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="hidden h-full flex-1 flex-col lg:flex">
          {!selectedThreadId ? (
            <div className="flex h-full flex-1 items-center justify-center text-sm text-[#9aa3b2]">
              왼쪽에서 대화를 선택하세요.
            </div>
          ) : (
            <>
              <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-between border-b border-[#232936] bg-[#151a22]/80 px-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div
                      className="aspect-square size-10 rounded-full bg-cover bg-center bg-no-repeat ring-2 ring-gray-100"
                      style={{
                        backgroundImage: thread?.otherUser.avatarUrl
                          ? `url(\"${thread.otherUser.avatarUrl}\")`
                          : "none"
                      }}
                    />
                    <div className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="mb-1 text-base font-semibold leading-none text-[#e7e9ee]">
                      {thread?.otherUser.name ?? "대화"}
                    </h2>
                    <p className="text-xs font-medium text-[#23D3FF]">접속 중</p>
                  </div>
                </div>
              </header>

              <div ref={listRef} className="flex-1 space-y-6 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400">메시지가 없습니다.</p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex max-w-[70%] flex-col gap-1",
                          isMine ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm",
                            isMine
                              ? "rounded-br-none bg-[#23D3FF] text-white shadow-[0_10px_20px_-8px_rgba(61,90,254,0.45)]"
                              : "rounded-bl-none bg-[#151a22] text-gray-800"
                          )}
                        >
                          {msg.body}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9aa3b2]">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMine && <span>{msg.readAt ? "읽음" : "전송됨"}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-[#232936] p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-[#232936] bg-[#10141b] p-2">
                  <div className="flex-1 py-2">
                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        resizeTextarea();
                      }}
                      rows={1}
                      className="min-h-[24px] w-full resize-none border-none bg-transparent p-0 text-base text-[#e7e9ee] placeholder:text-[#9aa3b2] focus-visible:ring-0"
                      placeholder="메시지를 입력하세요..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sending}
                    className="self-center rounded-xl bg-[#23D3FF] px-4 py-2 text-sm font-semibold text-[#151a22] transition hover:bg-[#0FB8E3]"
                  >
                    보내기
                  </button>
                </div>
                {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
              </div>
            </>
          )}
        </section>
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
