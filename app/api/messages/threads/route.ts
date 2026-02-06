import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const threads = await prisma.messageThread.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }]
    },
    include: {
      userA: { select: { id: true, name: true, image: true, artistProfile: { select: { avatarUrl: true } } } },
      userB: { select: { id: true, name: true, image: true, artistProfile: { select: { avatarUrl: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const result = await Promise.all(
    threads.map(async (thread) => {
      const other = thread.userAId === userId ? thread.userB : thread.userA;
      const lastMessage = thread.messages[0];
      const unreadCount = await prisma.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          readAt: null
        }
      });

      return {
        id: thread.id,
        otherUser: {
          id: other.id,
          name: other.name ?? "이름 없음",
          avatarUrl: other.artistProfile?.avatarUrl ?? other.image ?? null
        },
        lastMessage: lastMessage
          ? lastMessage.body || (lastMessage.attachmentUrl ? "파일을 보냈습니다." : "")
          : "",
        lastMessageAt: lastMessage?.createdAt.toISOString() ?? thread.updatedAt.toISOString(),
        unreadCount
      };
    })
  );

  return NextResponse.json({ ok: true, threads: result });
}
