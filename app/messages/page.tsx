"use client";

import { useState } from "react";
import { messageThreads } from "@/lib/mockData";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(messageThreads[0].id);
  const [message, setMessage] = useState("");

  const active = messageThreads.find((thread) => thread.id === activeId) ?? messageThreads[0];

  const onSend = () => {
    if (!message.trim()) return;
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader showSearch={false} />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-[70vh] overflow-hidden p-4">
            <Input placeholder="대화 검색" className="mb-4" />
            <div className="space-y-2 overflow-y-auto">
              {messageThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border border-border px-3 py-3 text-left",
                    activeId === thread.id ? "border-accent" : ""
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{thread.name}</p>
                    <p className="mt-1 text-xs text-muted">{thread.lastMessage}</p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{thread.timestamp}</p>
                    {thread.unread > 0 && (
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-accent text-[10px] text-accent">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex h-[70vh] flex-col">
            <div className="border-b border-border p-4">
              <p className="text-sm font-semibold">{active.name}</p>
              <p className="text-xs text-muted">최근 활동 5분 전</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {active.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                    msg.fromMe
                      ? "ml-auto bg-foreground text-white"
                      : "border border-border bg-white"
                  )}
                >
                  <p>{msg.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{msg.time}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="메시지 입력"
                />
                <Button type="button" onClick={onSend}>
                  전송
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
