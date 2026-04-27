import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { sendPushToAudience, type Audience, type PushType } from "@/lib/push/send";

const VALID_TYPES: PushType[] = ["stage_start", "new_story", "feed_highlights", "my_results"];
const VALID_AUDIENCES: Audience[] = ["all", "riders", "spectators"];

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: {
    type?: string;
    title?: string;
    body?: string;
    url?: string;
    audience?: string;
    userIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (!body.type || !VALID_TYPES.includes(body.type as PushType)) {
    return new NextResponse("Invalid type", { status: 400 });
  }
  if (!body.title || !body.body || !body.url) {
    return new NextResponse("Missing title/body/url", { status: 400 });
  }
  const audience = (body.audience ?? "all") as Audience;
  if (!VALID_AUDIENCES.includes(audience)) {
    return new NextResponse("Invalid audience", { status: 400 });
  }

  const result = await sendPushToAudience({
    type: body.type as PushType,
    title: body.title,
    body: body.body,
    url: body.url,
    audience,
    userIds: body.userIds,
  });

  return NextResponse.json(result);
}
