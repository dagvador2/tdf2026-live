import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT) {
    throw new Error("VAPID keys missing — check NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

export type PushType = "stage_start" | "new_story" | "feed_highlights" | "my_results";
export type Audience = "all" | "riders" | "spectators";

export interface SendArgs {
  type: PushType;
  title: string;
  body: string;
  url: string;
  audience?: Audience;
  userIds?: string[];
}

interface SendResult {
  sent: number;
  failed: number;
  removed: number;
}

const PREFERENCE_FIELD: Record<PushType, "stageStart" | "newStory" | "feedHighlights" | "myResults"> = {
  stage_start: "stageStart",
  new_story: "newStory",
  feed_highlights: "feedHighlights",
  my_results: "myResults",
};

/**
 * Sends a Web Push notification to all users matching the given audience whose
 * NotificationPreference for the given type is true. Cleans up subscriptions
 * that the push service rejects with 404/410.
 *
 * Currently called from /api/admin/histoires/[id]/publish (PUSH.06).
 * Reusable for the other triggers in the spec (stage_start when admin clicks
 * "Demarrer", feed_highlights for important posts, my_results when validating
 * stage results) once those flows are wired.
 */
export async function sendPushToAudience(args: SendArgs): Promise<SendResult> {
  ensureConfigured();

  const userWhere: Record<string, unknown> = {};
  if (args.audience === "riders") userWhere.role = "rider";
  else if (args.audience === "spectators") userWhere.role = { not: "rider" };
  if (args.userIds && args.userIds.length) userWhere.id = { in: args.userIds };

  // Eligible users: matching audience AND opted-in to this notification type
  // (NotificationPreference defaults to true on subscribe, so missing prefs
  // are treated as opted-in too).
  const prefField = PREFERENCE_FIELD[args.type];
  const users = await prisma.user.findMany({
    where: {
      ...userWhere,
      OR: [
        { notificationPreference: { is: null } },
        { notificationPreference: { is: { [prefField]: true } } },
      ],
    },
    select: { id: true, pushSubscriptions: true },
  });

  const payload = JSON.stringify({
    title: args.title,
    body: args.body,
    url: args.url,
    type: args.type,
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const user of users) {
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          removed++;
        }
      }
    }
  }

  return { sent, failed, removed };
}
