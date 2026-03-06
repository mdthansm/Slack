import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/** Invite someone to join the Slack app by email (called internally by the email action). */
export const inviteInternal = internalMutation({
  args: {
    email: v.string(),
    invitedByUserId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existingUser) {
      throw new Error("This user already has an account.");
    }

    const pendingInvite = await ctx.db
      .query("appInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("workspaceId"), args.workspaceId)
        )
      )
      .first();
    if (pendingInvite) {
      throw new Error("An invite is already pending for this email in this workspace.");
    }

    return await ctx.db.insert("appInvites", {
      email: normalizedEmail,
      invitedByUserId: args.invitedByUserId,
      workspaceId: args.workspaceId,
      role: args.role,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** List invites sent by a user (to show in the invite modal). */
export const listSentByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("appInvites")
      .withIndex("by_invited_by", (q) => q.eq("invitedByUserId", args.userId))
      .collect();
    invites.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      invites.map(async (inv) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", inv.email))
          .first();
        return {
          ...inv,
          hasSignedUp: !!user,
          userName: user?.name ?? null,
        };
      })
    );
    return enriched;
  },
});

/**
 * Mark app invites as accepted AND auto-add user to workspace.
 * Called internally when user signs up.
 */
export const markAcceptedInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    const newUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    const pendingInvites = await ctx.db
      .query("appInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const inv of pendingInvites) {
      await ctx.db.patch(inv._id, { status: "accepted" });

      if (newUser && inv.workspaceId) {
        const existing = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", inv.workspaceId!).eq("userId", newUser._id)
          )
          .first();
        if (!existing) {
          await ctx.db.insert("workspaceMembers", {
            workspaceId: inv.workspaceId,
            userId: newUser._id,
            role: inv.role ?? "member",
          });
        }
      }
    }
  },
});

/** Check if an email was invited (used during sign-up to auto-accept). */
export const checkInvite = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const invite = await ctx.db
      .query("appInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    return !!invite;
  },
});
