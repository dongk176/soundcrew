import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const messageSchema = z
  .object({
    body: z.string().min(1),
    attachmentUrl: z.string().url().optional(),
    attachmentKey: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentType: z.string().optional(),
    attachmentSize: z.number().int().optional()
  })
  .refine(
    (data) => !data.attachmentSize || data.attachmentSize <= 10 * 1024 * 1024,
    {
      message: "첨부 파일은 10MB 이하만 가능합니다.",
      path: ["attachmentSize"]
    }
  );

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const thread = await prisma.messageThread.findUnique({
    where: { id: params.id },
    include: {
      userA: { select: { id: true, name: true, image: true, artistProfile: { select: { avatarUrl: true } } } },
      userB: { select: { id: true, name: true, image: true, artistProfile: { select: { avatarUrl: true } } } },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!thread || (thread.userAId !== userId && thread.userBId !== userId)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.message.updateMany({
    where: { threadId: thread.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() }
  });

  const other = thread.userAId === userId ? thread.userB : thread.userA;

  return NextResponse.json({
    ok: true,
    thread: {
      id: thread.id,
      otherUser: {
        id: other.id,
        name: other.name ?? "이름 없음",
        avatarUrl: other.artistProfile?.avatarUrl ?? other.image ?? null
      }
    },
    messages: thread.messages.map((msg) => ({
      id: msg.id,
      body: msg.body,
      senderId: msg.senderId,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt ? msg.readAt.toISOString() : undefined,
      attachmentUrl: msg.attachmentUrl ?? undefined,
      attachmentName: msg.attachmentName ?? undefined,
      attachmentType: msg.attachmentType ?? undefined,
      attachmentSize: msg.attachmentSize ?? undefined
    }))
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const thread = await prisma.messageThread.findUnique({
    where: { id: params.id }
  });

  if (!thread || (thread.userAId !== userId && thread.userBId !== userId)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: userId,
      body: data.body,
      attachmentUrl: data.attachmentUrl,
      attachmentKey: data.attachmentKey,
      attachmentName: data.attachmentName,
      attachmentType: data.attachmentType,
      attachmentSize: data.attachmentSize
    }
  });

  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() }
  });

  return NextResponse.json({
    ok: true,
    message: {
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : undefined,
      attachmentUrl: message.attachmentUrl ?? undefined,
      attachmentName: message.attachmentName ?? undefined,
      attachmentType: message.attachmentType ?? undefined,
      attachmentSize: message.attachmentSize ?? undefined
    }
  });
}
