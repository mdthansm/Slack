import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type SafeUser = {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  imageUrl: string;
};

function toSafeUser(doc: { _id: SafeUser["_id"]; _creationTime: number; name: string; email: string; imageUrl?: string }): SafeUser {
  return { _id: doc._id, _creationTime: doc._creationTime, name: doc.name, email: doc.email, imageUrl: doc.imageUrl ?? "" };
}

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
  },
});

export const getByEmailForAuth = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.email.trim().toLowerCase();
    const byIndex = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (byIndex) return byIndex;
    const all = await ctx.db.query("users").collect();
    return all.find((u) => u.email.toLowerCase() === normalized) ?? null;
  },
});

export const createWithHash = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      passwordSalt: args.passwordSalt,
      passwordHash: args.passwordHash,
    });
  },
});

export const upsertFromAuth = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    stackAuthId: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailNormalized = args.email.trim().toLowerCase();

    const byStackAuth = await ctx.db
      .query("users")
      .withIndex("by_stack_auth_id", (q) => q.eq("stackAuthId", args.stackAuthId))
      .first();
    if (byStackAuth) return byStackAuth._id;

    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNormalized))
      .first();
    if (byEmail) {
      await ctx.db.patch(byEmail._id, { stackAuthId: args.stackAuthId });
      return byEmail._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: emailNormalized,
      imageUrl: args.imageUrl ?? "",
      stackAuthId: args.stackAuthId,
    });
  },
});

export const markInvitesAccepted = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailNormalized = args.email.trim().toLowerCase();
    const invites = await ctx.db
      .query("appInvites")
      .withIndex("by_email", (q) => q.eq("email", emailNormalized))
      .collect();
    for (const inv of invites) {
      if (inv.status === "pending") {
        await ctx.db.patch(inv._id, { status: "accepted" });
        if (inv.workspaceId) {
          const existing = await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace_and_user", (q) =>
              q.eq("workspaceId", inv.workspaceId!)
            )
            .collect();
          const userId = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", emailNormalized))
            .first();
          if (userId) {
            const alreadyMember = existing.some((m) => m.userId === userId._id);
            if (!alreadyMember) {
              await ctx.db.insert("workspaceMembers", {
                workspaceId: inv.workspaceId!,
                userId: userId._id,
                role: inv.role ?? "member",
              });
            }
          }
        }
      }
    }
  },
});

export const getInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.userId);
    return doc ? toSafeUser(doc) : null;
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.userId);
    return doc ? toSafeUser(doc) : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").collect();
    return docs.map(toSafeUser);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    if (!q) return [];
    const docs = await ctx.db.query("users").collect();
    return docs
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
      )
      .map(toSafeUser);
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as { name?: string; email?: string; imageUrl?: string };
    if (Object.keys(filtered).length === 0) return userId;
    await ctx.db.patch(userId, filtered);
    return userId;
  },
});
