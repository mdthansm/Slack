import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    stackAuthId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_stack_auth_id", ["stackAuthId"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    imageUrl: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
    parentWorkspaceId: v.optional(v.id("workspaces")),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_parent", ["parentWorkspaceId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  appInvites: defineTable({
    email: v.string(),
    invitedByUserId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    role: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_invited_by", ["invitedByUserId"]),

  channels: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    isPrivate: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_name", ["workspaceId", "name"]),

  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  channelInvites: defineTable({
    channelId: v.id("channels"),
    invitedUserId: v.id("users"),
    invitedByUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    createdAt: v.number(),
  })
    .index("by_invited_user", ["invitedUserId"])
    .index("by_channel_and_user", ["channelId", "invitedUserId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    body: v.optional(v.string()),
    userName: v.optional(v.string()),
    userImageUrl: v.optional(v.string()),
    text: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  }).index("by_channel", ["channelId"]),

  directMessageThreads: defineTable({
    workspaceId: v.id("workspaces"),
    participantIds: v.array(v.id("users")),
  }).index("by_workspace", ["workspaceId"]),

  directMessages: defineTable({
    threadId: v.id("directMessageThreads"),
    userId: v.id("users"),
    body: v.string(),
    userName: v.string(),
    userImageUrl: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  }).index("by_thread", ["threadId"]),

  reactions: defineTable({
    messageId: v.optional(v.id("messages")),
    directMessageId: v.optional(v.id("directMessages")),
    userId: v.id("users"),
    emoji: v.string(),
    userName: v.optional(v.string()),
  })
    .index("by_message", ["messageId"])
    .index("by_direct_message", ["directMessageId"])
    .index("by_message_and_user", ["messageId", "userId"]),

  messageForwards: defineTable({
    sourceMessageId: v.optional(v.id("messages")),
    sourceDirectMessageId: v.optional(v.id("directMessages")),
    forwardedByUserId: v.id("users"),
    forwardedByName: v.string(),
    targetChannelId: v.optional(v.id("channels")),
    targetThreadId: v.optional(v.id("directMessageThreads")),
    originalBody: v.string(),
    originalUserName: v.string(),
    originalFileName: v.optional(v.string()),
    originalFileStorageId: v.optional(v.id("_storage")),
    originalFileType: v.optional(v.string()),
  })
    .index("by_target_channel", ["targetChannelId"])
    .index("by_target_thread", ["targetThreadId"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
