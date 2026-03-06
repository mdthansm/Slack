"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import * as crypto from "node:crypto";

const PBKDF2_ITERATIONS = 25000;
const SALT_BYTES = 16;
const HASH_BYTES = 64;

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    HASH_BYTES,
    "sha256"
  );
  return {
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  };
}

function verifyPassword(
  password: string,
  saltBase64: string,
  hashBase64: string
): boolean {
  const salt = Buffer.from(saltBase64, "base64");
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    HASH_BYTES,
    "sha256"
  );
  return hash.toString("base64") === hashBase64;
}

type SafeUser = {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  imageUrl: string;
};

function toSafeUser(doc: {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  imageUrl?: string;
}): SafeUser {
  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    name: doc.name,
    email: doc.email,
    imageUrl: doc.imageUrl ?? "",
  };
}

/** Sign up: hash password in Node, then insert user. Does not sign in. */
export const signUp = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNormalized = args.email.trim().toLowerCase();
    const nameTrimmed = args.name.trim();
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const { salt, hash } = hashPassword(args.password);
    await ctx.runMutation(internal.users.createWithHash, {
      name: nameTrimmed,
      email: emailNormalized,
      imageUrl: "",
      passwordSalt: salt,
      passwordHash: hash,
    });
    await ctx.runMutation(internal.appInvites.markAcceptedInternal, {
      email: emailNormalized,
    });
  },
});

/** Sign in: verify password in Node, return safe user or throw. */
export const signIn = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<SafeUser | null> => {
    const emailNormalized = args.email.trim().toLowerCase();
    const user = await ctx.runQuery(internal.users.getByEmailForAuth, {
      email: emailNormalized,
    });
    if (!user) return null;
    if (user.passwordHash !== undefined && user.passwordSalt !== undefined) {
      const ok = verifyPassword(args.password, user.passwordSalt, user.passwordHash);
      if (!ok) return null;
    } else if (args.password !== "") {
      return null;
    }
    return toSafeUser(user);
  },
});
