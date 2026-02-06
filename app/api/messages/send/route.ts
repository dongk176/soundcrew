import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const sendSchema = z
  .object({
    artistId: z.string().min(1),
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const artist = await prisma.artistProfile.findUnique({
    where: { id: data.artistId },
    select: { id: true, userId: true }
  });

  if (!artist?.userId) {
    return NextResponse.json({ ok: false, error: "ARTIST_USER_REQUIRED" }, { status: 400 });
  }
  const artistUserId = artist.userId;

  const result = await prisma.$transaction(async (tx) => {
    let thread = await tx.messageThread.findFirst({
      where: {
        jobId: null,
        OR: [
          { userAId: userId, userBId: artistUserId },
          { userAId: artistUserId, userBId: userId }
        ]
      }
    });

    if (!thread) {
      thread = await tx.messageThread.create({
        data: { userAId: userId, userBId: artistUserId }
      });
    }

    const message = await tx.message.create({
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

    await tx.messageThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() }
    });

    return { threadId: thread.id, messageId: message.id };
  });

  return NextResponse.json({ ok: true, threadId: result.threadId, messageId: result.messageId });
}
