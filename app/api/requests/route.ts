import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const requestSchema = z.object({
  artistId: z.string().min(1),
  shortHelp: z.string().min(1),
  description: z.string().min(1),
  referenceLinks: z.array(z.string().url()).optional()
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const artist = await prisma.artistProfile.findUnique({
    where: { id: data.artistId },
    select: { id: true, userId: true }
  });

  if (!artist) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let threadId: string | null = null;
    if (artist.userId) {
      const existing = await tx.messageThread.findFirst({
        where: {
          jobId: null,
          OR: [
            { userAId: userId, userBId: artist.userId },
            { userAId: artist.userId, userBId: userId }
          ]
        },
        select: { id: true }
      });

      if (existing) {
        threadId = existing.id;
      } else {
        const createdThread = await tx.messageThread.create({
          data: {
            userAId: userId,
            userBId: artist.userId
          }
        });
        threadId = createdThread.id;
      }

      const linkText = (data.referenceLinks ?? []).join("\n");
      const body = [
        `무엇을 도와드릴까요?: ${data.shortHelp}`,
        `프로젝트 설명: ${data.description}`,
        linkText ? `참고 링크:\n${linkText}` : null
      ]
        .filter(Boolean)
        .join("\n\n");

      await tx.message.create({
        data: {
          threadId,
          senderId: userId,
          body
        }
      });
    }

    const request = await tx.artistRequest.create({
      data: {
        artistId: artist.id,
        requesterId: userId,
        shortHelp: data.shortHelp,
        description: data.description,
        referenceLinks: data.referenceLinks ?? [],
        threadId
      }
    });

    return { request };
  });

  return NextResponse.json({ ok: true, request: { id: result.request.id } });
}
