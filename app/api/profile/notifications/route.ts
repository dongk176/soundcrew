import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  notifyMessage: z.boolean().optional(),
  notifyRequest: z.boolean().optional(),
  notifyMarketing: z.boolean().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyMessage: true,
      notifyRequest: true,
      notifyMarketing: true
    }
  });

  return NextResponse.json({ ok: true, settings: user });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      notifyMessage: parsed.data.notifyMessage,
      notifyRequest: parsed.data.notifyRequest,
      notifyMarketing: parsed.data.notifyMarketing
    },
    select: {
      notifyMessage: true,
      notifyRequest: true,
      notifyMarketing: true
    }
  });

  return NextResponse.json({ ok: true, settings: updated });
}
