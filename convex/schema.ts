import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    imageUrl: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
  }).index("by_created_by", ["createdBy"]),

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
    status: v.union(
      v.literal("pending"),
      v.literal("accepted")
    ),
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
  }).index("by_thread", ["threadId"]),
});
