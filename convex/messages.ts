import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Send a message to a channel. Sender must be a channel member. */
export const send = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
    body: v.string(),
    userName: v.string(),
    userImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.body.trim()) throw new Error("Message body cannot be empty");

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (!membership) {
      throw new Error("You must be a channel member to send messages.");
    }

    return await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: args.userId,
      body: args.body.trim(),
      userName: args.userName,
      userImageUrl: args.userImageUrl,
    });
  },
});

/** List messages in a channel (newest last; add ordering if needed). */
export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .collect();
  },
});

/** Recent activity: latest messages from channels the user is in (for this workspace). */
export const listRecentForUser = query({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const channelsInWorkspace = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const channelIds: import("./_generated/dataModel").Id<"channels">[] = [];
    for (const ch of channelsInWorkspace) {
      const member = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", ch._id).eq("userId", args.userId)
        )
        .first();
      if (member) channelIds.push(ch._id);
    }
    const allMessages: import("./_generated/dataModel").Doc<"messages">[] = [];
    for (const cid of channelIds) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", cid))
        .order("desc")
        .take(10);
      allMessages.push(...msgs);
    }
    allMessages.sort((a, b) => b._creationTime - a._creationTime);
    return allMessages.slice(0, 25);
  },
});

/** Update a message (e.g. edit). */
export const update = mutation({
  args: {
    messageId: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.body.trim()) throw new Error("Message body cannot be empty");
    await ctx.db.patch(args.messageId, { body: args.body.trim() });
    return args.messageId;
  },
});

/** Delete a message. */
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
    return args.messageId;
  },
});
