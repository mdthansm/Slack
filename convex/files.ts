import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const listFilesForWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const channelIds = new Set(channels.map((c) => c._id));

    const allMessages = await ctx.db.query("messages").collect();
    const fileMessages = allMessages.filter(
      (m) => m.fileStorageId && channelIds.has(m.channelId)
    );

    const dmThreads = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const threadIds = new Set(dmThreads.map((t) => t._id));

    const allDms = await ctx.db.query("directMessages").collect();
    const fileDms = allDms.filter(
      (m) => m.fileStorageId && threadIds.has(m.threadId)
    );

    const files: {
      id: string;
      storageId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      sharedBy: string;
      sharedAt: number;
      context: string;
      fileUrl: string | null;
    }[] = [];

    for (const msg of fileMessages) {
      const ch = channels.find((c) => c._id === msg.channelId);
      const fileUrl = await ctx.storage.getUrl(msg.fileStorageId!);
      files.push({
        id: msg._id,
        storageId: msg.fileStorageId as unknown as string,
        fileName: msg.fileName ?? "file",
        fileType: msg.fileType ?? "",
        fileSize: msg.fileSize ?? 0,
        sharedBy: msg.userName ?? "Unknown",
        sharedAt: msg._creationTime,
        context: `#${ch?.name ?? "channel"}`,
        fileUrl,
      });
    }

    for (const dm of fileDms) {
      const fileUrl = await ctx.storage.getUrl(dm.fileStorageId!);
      files.push({
        id: dm._id,
        storageId: dm.fileStorageId as unknown as string,
        fileName: dm.fileName ?? "file",
        fileType: dm.fileType ?? "",
        fileSize: dm.fileSize ?? 0,
        sharedBy: dm.userName ?? "Unknown",
        sharedAt: dm._creationTime,
        context: "Direct message",
        fileUrl,
      });
    }

    files.sort((a, b) => b.sharedAt - a.sharedAt);
    return files;
  },
});
