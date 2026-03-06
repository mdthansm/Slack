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

/** Get user by email (for sign in). Returns full user doc or null. */
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

/** Internal: get user by email including password fields (server-only). */
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

/** Internal: create user with pre-hashed password (called from action). */
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

/** Internal: get user by ID (for server-side actions). */
export const getInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.userId);
    return doc ? toSafeUser(doc) : null;
  },
});

/** Get a user by Id (safe fields only, no password). */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.userId);
    return doc ? toSafeUser(doc) : null;
  },
});

/** List all users (safe fields only). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").collect();
    return docs.map(toSafeUser);
  },
});

/** Search users by email or name (username). Case-insensitive partial match. Returns safe user fields only. */
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

/** Update user profile. */
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
