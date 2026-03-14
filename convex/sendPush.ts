"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const MAX_BODY_LENGTH = 100;

export const sendPushToUsers = internalAction({
  args: {
    recipientUserIds: v.array(v.id("users")),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    if (args.recipientUserIds.length === 0) return;

    const subs = await ctx.runQuery(
      internal.notifications.getSubscriptionsForUserIds,
      { userIds: args.recipientUserIds }
    );
    if (subs.length === 0) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublicKey || !vapidPrivateKey) return;

    const webpush = await import("web-push");
    webpush.setVapidDetails(
      "mailto:support@slack-clone.local",
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: args.title,
      body: args.body.length > MAX_BODY_LENGTH
        ? args.body.slice(0, MAX_BODY_LENGTH) + "…"
        : args.body,
      url: args.url ?? "/",
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 60 }
          );
        } catch {
          // Subscription may be invalid; skip
        }
      })
    );
  },
});
