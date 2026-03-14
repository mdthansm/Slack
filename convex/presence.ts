import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ONLINE_THRESHOLD_MS = 90_000; // 90 seconds

export const heartbeat = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", {
        userId: args.userId,
        lastSeen: Date.now(),
      });
    }
  },
});

export const getOnlineUserIds = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const onlineSet: Record<string, boolean> = {};
    for (const uid of args.userIds) {
      const p = await ctx.db
        .query("presence")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .first();
      onlineSet[uid] = !!p && now - p.lastSeen < ONLINE_THRESHOLD_MS;
    }
    return onlineSet;
  },
});
