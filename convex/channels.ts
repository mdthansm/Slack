import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Create a channel in a workspace and add creator as member. */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("channels")
      .filter((q) =>
        q.and(
          q.eq(q.field("workspaceId"), args.workspaceId),
          q.eq(q.field("name"), args.name)
        )
      )
      .first();
    if (existing) throw new Error("Channel with this name already exists");
    const channelId = await ctx.db.insert("channels", {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      isPrivate: args.isPrivate ?? false,
    });
    await ctx.db.insert("channelMembers", {
      channelId,
      userId: args.createdBy,
      role: "admin",
    });
    return channelId;
  },
});

/** Get channel by Id. */
export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.channelId);
  },
});

/** List channels in a workspace. */
export const listByWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

/** Update channel. */
export const update = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { channelId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    if (Object.keys(filtered).length === 0) return channelId;
    await ctx.db.patch(channelId, filtered);
    return channelId;
  },
});

/** Delete channel, its messages, and members. */
export const remove = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const msg of msgs) await ctx.db.delete(msg._id);
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
    await ctx.db.delete(args.channelId);
    return args.channelId;
  },
});

/** Get a user's membership in a channel (role or null if not a member). */
export const getMembership = query({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    const m = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (!m) return null;
    const role = m.role ?? (channel?.createdBy === args.userId ? "admin" : "member");
    return { role: role as "admin" | "member" };
  },
});

/** List channel members (user ids and optional role). */
export const listMembers = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
  },
});

/** Remove a member from a channel. Requester must be a channel admin (to remove others) or the member themselves (to leave). Cannot remove the channel creator. */
export const removeMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
    removedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const membershipToRemove = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (!membershipToRemove) {
      throw new Error("User is not a member of this channel.");
    }

    if (args.userId === channel.createdBy) {
      throw new Error("The channel creator cannot be removed.");
    }

    const isSelf = args.removedByUserId === args.userId;
    if (isSelf) {
      await ctx.db.delete(membershipToRemove._id);
      return membershipToRemove._id;
    }

    const requesterMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.removedByUserId)
      )
      .first();
    const isAdmin =
      requesterMembership?.role === "admin" ||
      channel.createdBy === args.removedByUserId;
    if (!requesterMembership || !isAdmin) {
      throw new Error("Only channel admins can remove other members.");
    }

    await ctx.db.delete(membershipToRemove._id);
    return membershipToRemove._id;
  },
});

/** Send a channel invite to a user. Admin-only. Prevents duplicate pending invites. */
export const inviteMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
    invitedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const requesterMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.invitedByUserId)
      )
      .first();
    const isAdmin =
      requesterMembership?.role === "admin" ||
      channel.createdBy === args.invitedByUserId;
    if (!requesterMembership || !isAdmin) {
      throw new Error("Only channel admins can invite members.");
    }

    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .first();
    if (existing) throw new Error("User is already a member of this channel.");

    const workspaceMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", args.userId)
      )
      .first();
    if (!workspaceMember) {
      throw new Error("User is not in this workspace. Add them to the workspace first.");
    }

    const pendingInvite = await ctx.db
      .query("channelInvites")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("invitedUserId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (pendingInvite) throw new Error("An invite is already pending for this user.");

    return await ctx.db.insert("channelInvites", {
      channelId: args.channelId,
      invitedUserId: args.userId,
      invitedByUserId: args.invitedByUserId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** List pending channel invites for a user (across all channels in a workspace). */
export const listPendingInvites = query({
  args: { userId: v.id("users"), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("channelInvites")
      .withIndex("by_invited_user", (q) => q.eq("invitedUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const enriched = await Promise.all(
      invites.map(async (inv) => {
        const channel = await ctx.db.get(inv.channelId);
        if (!channel || channel.workspaceId !== args.workspaceId) return null;
        const inviter = await ctx.db.get(inv.invitedByUserId);
        return {
          _id: inv._id,
          channelId: inv.channelId,
          channelName: channel.name,
          invitedByName: inviter?.name ?? "Unknown",
          createdAt: inv.createdAt,
        };
      })
    );
    return enriched.filter(Boolean);
  },
});

/** List pending invites for a specific channel (for admin to see who's been invited). */
export const listPendingInvitesForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("channelInvites")
      .withIndex("by_channel_and_user", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const enriched = await Promise.all(
      invites.map(async (inv) => {
        const user = await ctx.db.get(inv.invitedUserId);
        return {
          _id: inv._id,
          userId: inv.invitedUserId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          createdAt: inv.createdAt,
        };
      })
    );
    return enriched;
  },
});

/** Accept a channel invite — adds the user to the channel and marks invite accepted. */
export const acceptInvite = mutation({
  args: { inviteId: v.id("channelInvites") },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Invite is no longer pending.");

    await ctx.db.patch(args.inviteId, { status: "accepted" });

    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", invite.channelId).eq("userId", invite.invitedUserId)
      )
      .first();
    if (!existing) {
      await ctx.db.insert("channelMembers", {
        channelId: invite.channelId,
        userId: invite.invitedUserId,
        role: "member",
      });
    }
    return invite.channelId;
  },
});

/** Decline a channel invite. */
export const declineInvite = mutation({
  args: { inviteId: v.id("channelInvites") },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "pending") throw new Error("Invite is no longer pending.");
    await ctx.db.patch(args.inviteId, { status: "declined" });
    return invite.channelId;
  },
});

