import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return new NextResponse("Missing endpoint or keys", { status: 400 });
  }

  const userId = session.user.id;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
    },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
      lastUsedAt: new Date(),
    },
  });

  // Ensure notification preferences exist (defaults to all true)
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
