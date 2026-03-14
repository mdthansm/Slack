import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const toggle = mutation({
  args: {
    messageId: v.optional(v.id("messages")),
    directMessageId: v.optional(v.id("directMessages")),
    userId: v.id("users"),
    emoji: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.messageId) {
      const existing = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
        .collect();
      const mine = existing.find(
        (r) => r.userId === args.userId && r.emoji === args.emoji
      );
      if (mine) {
        await ctx.db.delete(mine._id);
        return { action: "removed" as const };
      }
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: args.userId,
        emoji: args.emoji,
        userName: args.userName,
      });
      return { action: "added" as const };
    }

    if (args.directMessageId) {
      const existing = await ctx.db
        .query("reactions")
        .withIndex("by_direct_message", (q) =>
          q.eq("directMessageId", args.directMessageId)
        )
        .collect();
      const mine = existing.find(
        (r) => r.userId === args.userId && r.emoji === args.emoji
      );
      if (mine) {
        await ctx.db.delete(mine._id);
        return { action: "removed" as const };
      }
      await ctx.db.insert("reactions", {
        directMessageId: args.directMessageId,
        userId: args.userId,
        emoji: args.emoji,
        userName: args.userName,
      });
      return { action: "added" as const };
    }

    throw new Error("Either messageId or directMessageId must be provided");
  },
});

export const listForMessages = query({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    const result: Record<string, { emoji: string; count: number; userIds: string[]; userNames: string[] }[]> = {};
    for (const msgId of args.messageIds) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", msgId))
        .collect();
      const grouped: Record<string, { count: number; userIds: string[]; userNames: string[] }> = {};
      for (const r of reactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userIds: [], userNames: [] };
        grouped[r.emoji].count++;
        grouped[r.emoji].userIds.push(r.userId);
        grouped[r.emoji].userNames.push(r.userName ?? "");
      }
      result[msgId] = Object.entries(grouped).map(([emoji, data]) => ({
        emoji,
        ...data,
      }));
    }
    return result;
  },
});

export const listForDirectMessages = query({
  args: { directMessageIds: v.array(v.id("directMessages")) },
  handler: async (ctx, args) => {
    const result: Record<string, { emoji: string; count: number; userIds: string[]; userNames: string[] }[]> = {};
    for (const dmId of args.directMessageIds) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_direct_message", (q) => q.eq("directMessageId", dmId))
        .collect();
      const grouped: Record<string, { count: number; userIds: string[]; userNames: string[] }> = {};
      for (const r of reactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userIds: [], userNames: [] };
        grouped[r.emoji].count++;
        grouped[r.emoji].userIds.push(r.userId);
        grouped[r.emoji].userNames.push(r.userName ?? "");
      }
      result[dmId] = Object.entries(grouped).map(([emoji, data]) => ({
        emoji,
        ...data,
      }));
    }
    return result;
  },
});

export const forwardMessage = mutation({
  args: {
    sourceMessageId: v.optional(v.id("messages")),
    sourceDirectMessageId: v.optional(v.id("directMessages")),
    forwardedByUserId: v.id("users"),
    forwardedByName: v.string(),
    targetChannelId: v.optional(v.id("channels")),
    targetThreadId: v.optional(v.id("directMessageThreads")),
  },
  handler: async (ctx, args) => {
    let originalBody = "";
    let originalUserName = "";
    let originalFileName: string | undefined;
    let originalFileStorageId: typeof args.sourceMessageId extends undefined ? undefined : any = undefined;
    let originalFileType: string | undefined;

    if (args.sourceMessageId) {
      const msg = await ctx.db.get(args.sourceMessageId);
      if (!msg) throw new Error("Source message not found");
      originalBody = msg.body ?? msg.text ?? "";
      originalUserName = msg.userName ?? "Unknown";
      originalFileName = msg.fileName;
      originalFileStorageId = msg.fileStorageId;
      originalFileType = msg.fileType;
    } else if (args.sourceDirectMessageId) {
      const dm = await ctx.db.get(args.sourceDirectMessageId);
      if (!dm) throw new Error("Source message not found");
      originalBody = dm.body;
      originalUserName = dm.userName;
      originalFileName = dm.fileName;
      originalFileStorageId = dm.fileStorageId;
      originalFileType = dm.fileType;
    } else {
      throw new Error("Source message required");
    }

    await ctx.db.insert("messageForwards", {
      sourceMessageId: args.sourceMessageId,
      sourceDirectMessageId: args.sourceDirectMessageId,
      forwardedByUserId: args.forwardedByUserId,
      forwardedByName: args.forwardedByName,
      targetChannelId: args.targetChannelId,
      targetThreadId: args.targetThreadId,
      originalBody,
      originalUserName,
      originalFileName,
      originalFileStorageId,
      originalFileType,
    });

    const forwardText = `↪ Forwarded from ${originalUserName}: ${originalBody}`;

    if (args.targetChannelId) {
      await ctx.db.insert("messages", {
        channelId: args.targetChannelId,
        userId: args.forwardedByUserId,
        body: forwardText,
        userName: args.forwardedByName,
        userImageUrl: "",
        fileStorageId: originalFileStorageId,
        fileName: originalFileName,
        fileType: originalFileType,
      });
    } else if (args.targetThreadId) {
      await ctx.db.insert("directMessages", {
        threadId: args.targetThreadId,
        userId: args.forwardedByUserId,
        body: forwardText,
        userName: args.forwardedByName,
        userImageUrl: "",
        fileStorageId: originalFileStorageId,
        fileName: originalFileName,
        fileType: originalFileType,
      });
    }

    return { success: true };
  },
});
