import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Get or create a DM thread between two users in a workspace. */
export const getOrCreateThread = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const sorted = [...args.participantIds].sort();
    const existing = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const match = existing.find(
      (t) =>
        t.participantIds.length === sorted.length &&
        t.participantIds.slice().sort().every((id: Id<"users">, i: number) => id === sorted[i])
    );
    if (match) return match._id;
    return await ctx.db.insert("directMessageThreads", {
      workspaceId: args.workspaceId,
      participantIds: sorted,
    });
  },
});

/** List DM threads for a workspace (where user is participant). */
export const listThreadsForUser = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    return threads.filter((t) => t.participantIds.includes(args.userId));
  },
});

/** List DM threads with last message preview for activity/Home. */
export const listThreadsWithPreview = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const userThreads = threads.filter((t) => t.participantIds.includes(args.userId));
    const result: { threadId: Id<"directMessageThreads">; participantIds: Id<"users">[]; lastBody: string | null; lastUserName: string | null; lastTime: number | null }[] = [];
    for (const t of userThreads) {
      const last = await ctx.db
        .query("directMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", t._id))
        .order("desc")
        .first();
      result.push({
        threadId: t._id,
        participantIds: t.participantIds,
        lastBody: last?.body ?? null,
        lastUserName: last?.userName ?? null,
        lastTime: last?._creationTime ?? null,
      });
    }
    result.sort((a, b) => (b.lastTime ?? 0) - (a.lastTime ?? 0));
    return result;
  },
});

/** Send a direct message. */
export const send = mutation({
  args: {
    threadId: v.id("directMessageThreads"),
    userId: v.id("users"),
    body: v.string(),
    userName: v.string(),
    userImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.body.trim()) throw new Error("Message body cannot be empty");
    return await ctx.db.insert("directMessages", {
      threadId: args.threadId,
      userId: args.userId,
      body: args.body.trim(),
      userName: args.userName,
      userImageUrl: args.userImageUrl,
    });
  },
});

/** List messages in a DM thread. */
export const listByThread = query({
  args: { threadId: v.id("directMessageThreads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("directMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

/** Delete a direct message. */
export const remove = mutation({
  args: { messageId: v.id("directMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
    return args.messageId;
  },
});
