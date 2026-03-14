/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appInvites from "../appInvites.js";
import type * as auth from "../auth.js";
import type * as channels from "../channels.js";
import type * as directMessages from "../directMessages.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as reactions from "../reactions.js";
import type * as sendPush from "../sendPush.js";
import type * as status from "../status.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appInvites: typeof appInvites;
  auth: typeof auth;
  channels: typeof channels;
  directMessages: typeof directMessages;
  email: typeof email;
  files: typeof files;
  messages: typeof messages;
  notifications: typeof notifications;
  presence: typeof presence;
  reactions: typeof reactions;
  sendPush: typeof sendPush;
  status: typeof status;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
