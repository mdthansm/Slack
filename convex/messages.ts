import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const send = mutation({
  args: {
    channelId: v.id("channels"),
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

    let membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      const channel = await ctx.db.get(args.channelId);
      if (!channel) throw new Error("Channel not found");
      const workspace = await ctx.db.get(channel.workspaceId);
      const wsMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", channel.workspaceId).eq("userId", args.userId)
        )
        .first();
      const isWsAdmin =
        wsMembership?.role === "admin" || workspace?.createdBy === args.userId;
      if (isWsAdmin) {
        await ctx.db.insert("channelMembers", {
          channelId: args.channelId,
          userId: args.userId,
          role: "admin",
        });
      } else {
        throw new Error("You must be a channel member to send messages.");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: args.userId,
      body: args.body.trim(),
      userName: args.userName,
      userImageUrl: args.userImageUrl,
      fileStorageId: args.fileStorageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
    });

    const channel = await ctx.db.get(args.channelId);
    if (channel) {
      const members = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
        .collect();
      const recipientUserIds = members
        .map((m) => m.userId)
        .filter((id) => id !== args.userId);
      if (recipientUserIds.length > 0) {
        const bodyText =
          args.body.trim() || (args.fileName ? `📎 ${args.fileName}` : "New message");
        await ctx.scheduler.runAfter(0, internal.sendPush.sendPushToUsers, {
          recipientUserIds,
          title: `#${channel.name}`,
          body: `${args.userName}: ${bodyText}`,
          url: "/",
        });
      }
    }

    return messageId;
  },
});

export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
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

export const listRecentForUser = query({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    const wsMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();
    const isWsAdmin =
      wsMembership?.role === "admin" || workspace?.createdBy === args.userId;

    const channelsInWorkspace = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const channelIds: import("./_generated/dataModel").Id<"channels">[] = [];
    for (const ch of channelsInWorkspace) {
      if (isWsAdmin) {
        channelIds.push(ch._id);
      } else {
        const member = await ctx.db
          .query("channelMembers")
          .withIndex("by_channel_and_user", (q) =>
            q.eq("channelId", ch._id).eq("userId", args.userId)
          )
          .first();
        if (member) channelIds.push(ch._id);
      }
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

export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (msg?.fileStorageId) {
      await ctx.storage.delete(msg.fileStorageId);
    }
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const r of reactions) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(args.messageId);
    return args.messageId;
  },
});
