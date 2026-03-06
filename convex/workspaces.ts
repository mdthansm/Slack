import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

/** Internal: get workspace by ID (for server-side actions). */
export const getInternal = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

/** Create a workspace and add creator as admin member. */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      imageUrl: args.imageUrl ?? "",
    });
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: args.createdBy,
      role: "admin",
    });
    return workspaceId;
  },
});

/** Get workspace by Id. */
export const get = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

/** List workspaces the user is a member of. */
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const workspaces = await Promise.all(
      memberships.map((m) => ctx.db.get(m.workspaceId))
    );
    return workspaces.filter(Boolean);
  },
});

/** Update workspace. */
export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    if (Object.keys(filtered).length === 0) return workspaceId;
    await ctx.db.patch(workspaceId, filtered);
    return workspaceId;
  },
});

/** Delete workspace and its members. Channels/messages can be cleaned up or left for cascade (Convex doesn't cascade by default). */
export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const ch of channels) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", ch._id))
        .collect();
      for (const msg of msgs) await ctx.db.delete(msg._id);
      const chMembers = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", ch._id))
        .collect();
      for (const cm of chMembers) await ctx.db.delete(cm._id);
      await ctx.db.delete(ch._id);
    }
    await ctx.db.delete(args.workspaceId);
    return args.workspaceId;
  },
});

/** List workspace members (user ids and roles). */
export const listMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/** Add member to workspace. Only workspace admins (or workspace creator) can add. */
export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.string(),
    addedByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (args.addedByUserId) {
      const requester = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", args.addedByUserId!)
        )
        .first();
      const isAdmin =
        requester?.role === "admin" || workspace.createdBy === args.addedByUserId;
      if (!requester || !isAdmin) {
        throw new Error("Only workspace admins can add members.");
      }
    }

    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      role: args.role,
    });
  },
});

/** Change a workspace member's role. Admin-only. Cannot change creator's role. */
export const changeRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    newRole: v.string(),
    changedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (args.userId === workspace.createdBy) {
      throw new Error("Cannot change the creator's role.");
    }

    const requester = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.changedByUserId)
      )
      .first();
    const isAdmin =
      requester?.role === "admin" || workspace.createdBy === args.changedByUserId;
    if (!requester || !isAdmin) {
      throw new Error("Only workspace admins can change roles.");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();
    if (!membership) throw new Error("User is not a workspace member.");

    await ctx.db.patch(membership._id, { role: args.newRole });
    return membership._id;
  },
});

/** Remove member from workspace. Admin-only. Cannot remove workspace creator. Also removes from all channels in workspace. */
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    removedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (args.userId === workspace.createdBy) {
      throw new Error("The workspace creator cannot be removed.");
    }

    const isSelf = args.removedByUserId === args.userId;
    if (!isSelf) {
      const requester = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", args.removedByUserId)
        )
        .first();
      const isAdmin =
        requester?.role === "admin" || workspace.createdBy === args.removedByUserId;
      if (!requester || !isAdmin) {
        throw new Error("Only workspace admins can remove members.");
      }
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();
    if (!membership) throw new Error("User is not a workspace member.");

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const ch of channels) {
      const chMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", ch._id).eq("userId", args.userId)
        )
        .first();
      if (chMembership) await ctx.db.delete(chMembership._id);
    }

    await ctx.db.delete(membership._id);
    return membership._id;
  },
});
