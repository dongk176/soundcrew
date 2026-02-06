"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import AppSidebar from "@/components/layout/AppSidebar";

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const label = hours >= 12 ? "오후" : "오전";
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return `${label} ${h}:${minutes}`;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

export default function MessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") setLoginOpen(true);
  }, [status]);

  const loadMessages = async () => {
    const res = await fetch(`/api/messages/threads/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setThread(data.thread ?? null);
  };

  useEffect(() => {
    if (!id) return;
    void loadMessages();
  }, [id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const presignUpload = async (uploadFile: File) => {
    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder: "messages",
        fileName: uploadFile.name,
        contentType: uploadFile.type || "application/octet-stream"
      })
    });
    if (!res.ok) throw new Error("PRESIGN_FAIL");
    return res.json();
  };

  const uploadFile = async (uploadFile: File) => {
    const data = await presignUpload(uploadFile);
    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
      body: uploadFile
    });
    if (!uploadRes.ok) throw new Error("UPLOAD_FAIL");
    return { url: data.publicUrl as string, key: data.key as string };
  };

  const resizeTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  };

  const sendMessage = async () => {
    if (sendingRef.current) return;
    if (!id) return;
    if (!message.trim() && !file) {
      setError("메시지 또는 파일을 입력해주세요.");
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError("첨부 파일은 10MB 이하만 가능합니다.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      let attachmentUrl: string | undefined;
      let attachmentKey: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file);
        attachmentUrl = uploaded.url;
        attachmentKey = uploaded.key;
      }

      const payload = {
        body: message.trim() || "파일을 보냈습니다.",
        attachmentUrl,
        attachmentKey,
        attachmentName: file?.name,
        attachmentType: file?.type,
        attachmentSize: file?.size
      };

      const res = await fetch(`/api/messages/threads/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("SEND_FAIL");
      setMessage("");
      setFile(null);
      resizeTextarea();
      await loadMessages();
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  if (status === "loading") return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="messages" />

      <main className="relative flex h-full flex-1 flex-col bg-[#151a22]">
        <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-between border-b border-[#232936] bg-[#151a22]/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/messages")}
              className="rounded-lg border border-[#232936] px-3 py-2 text-sm text-[#9aa3b2]"
            >
              목록
            </button>
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
                  {msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "w-fit rounded-xl border px-3 py-2 text-xs",
                        isMine
                          ? "border-[#23D3FF]/30 text-white/90"
                          : "border-[#232936] text-[#9aa3b2]"
                      )}
                    >
                      {msg.attachmentName ?? "첨부 파일"}{" "}
                      {msg.attachmentSize ? `(${formatFileSize(msg.attachmentSize)})` : ""}
                    </a>
                  )}
                  <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="z-20 border-t border-[#232936] bg-[#151a22] p-4 sm:p-6">
          <div className="flex items-end gap-3 rounded-2xl bg-[#10141b] p-2 shadow-inner">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 self-center rounded-xl p-2 text-[#9aa3b2] transition-colors hover:bg-[#151a22] hover:text-[#23D3FF]"
            >
              ＋
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex-1 py-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  resizeTextarea();
                }}
                placeholder="메시지를 입력하세요..."
                rows={1}
                className="max-h-40 min-h-[24px] w-full resize-none border-none bg-transparent p-0 text-base leading-6 text-[#e7e9ee] placeholder-gray-400 focus:ring-0"
              />
            </div>
            <Button
              type="button"
              onClick={sendMessage}
              disabled={sending}
              className="shrink-0 self-center rounded-xl bg-[#23D3FF] px-4 py-2 text-white shadow-lg shadow-[#23D3FF]/30"
            >
              보내기
            </Button>
          </div>
          {file && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#232936] px-3 py-2 text-xs text-[#9aa3b2]">
              <span className="truncate">
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-gray-400"
              >
                제거
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
