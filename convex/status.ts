import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setStatus = mutation({
  args: {
    userId: v.id("users"),
    statusEmoji: v.string(),
    statusText: v.string(),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expiry = args.durationMinutes
      ? Date.now() + args.durationMinutes * 60_000
      : undefined;
    await ctx.db.patch(args.userId, {
      statusEmoji: args.statusEmoji,
      statusText: args.statusText,
      statusExpiry: expiry,
    });
  },
});

export const clearStatus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      statusEmoji: "",
      statusText: "",
      statusExpiry: undefined,
    });
  },
});

export const getStatusForUsers = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const result: Record<string, { emoji: string; text: string } | null> = {};
    for (const uid of args.userIds) {
      const user = await ctx.db.get(uid);
      if (user?.statusEmoji && user.statusText) {
        if (user.statusExpiry && user.statusExpiry < now) {
          result[uid] = null;
        } else {
          result[uid] = { emoji: user.statusEmoji, text: user.statusText };
        }
      } else {
        result[uid] = null;
      }
    }
    return result;
  },
});
