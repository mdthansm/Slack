import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

export const send = mutation({
  args: {
    threadId: v.id("directMessageThreads"),
    userId: v.id("users"),
    body: v.string(),
    userName: v.string(),
    userImageUrl: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.body.trim() && !args.fileStorageId) {
      throw new Error("Message body or file is required");
    }
    const thread = await ctx.db.get(args.threadId);
    const messageId = await ctx.db.insert("directMessages", {
      threadId: args.threadId,
      userId: args.userId,
      body: args.body.trim() || (args.fileName ? `📎 ${args.fileName}` : ""),
      userName: args.userName,
      userImageUrl: args.userImageUrl,
      fileStorageId: args.fileStorageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
    });

    if (thread) {
      const recipientUserIds = thread.participantIds.filter((id) => id !== args.userId);
      if (recipientUserIds.length > 0) {
        const bodyText =
          args.body.trim() || (args.fileName ? `📎 ${args.fileName}` : "New message");
        await ctx.scheduler.runAfter(0, internal.sendPush.sendPushToUsers, {
          recipientUserIds,
          title: args.userName,
          body: bodyText,
          url: "/",
        });
      }
    }

    return messageId;
  },
});

export const listByThread = query({
  args: { threadId: v.id("directMessageThreads") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    const withUrls = await Promise.all(
      messages.map(async (msg) => {
        let fileUrl: string | null = null;
        if (msg.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(msg.fileStorageId);
        }
        return { ...msg, fileUrl };
      })
    );
    return withUrls;
  },
});

export const remove = mutation({
  args: { messageId: v.id("directMessages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (msg?.fileStorageId) {
      await ctx.storage.delete(msg.fileStorageId);
    }
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_direct_message", (q) => q.eq("directMessageId", args.messageId))
      .collect();
    for (const r of reactions) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(args.messageId);
    return args.messageId;
  },
});
