"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function InviteToChannelModal({
  open,
  onClose,
  workspaceId,
  channelId,
  channelName,
  addedByUserId,
  currentUserId,
  channelCreatedBy,
  isChannelAdmin,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  channelId: Id<"channels">;
  channelName: string;
  addedByUserId?: Id<"users"> | null;
  currentUserId?: Id<"users"> | null;
  channelCreatedBy?: Id<"users"> | null;
  isChannelAdmin?: boolean;
  onAdded?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<Id<"users"> | null>(null);
  const [removingId, setRemovingId] = useState<Id<"users"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [invitedSet, setInvitedSet] = useState<Set<string>>(new Set());

  const allUsers = useQuery(api.users.list, {}) ?? [];
  const searchResults = useQuery(
    api.users.search,
    search.trim() ? { query: search.trim() } : "skip"
  ) ?? [];
  const workspaceMembers = useQuery(api.workspaces.listMembers, { workspaceId }) ?? [];
  const channelMembers = useQuery(api.channels.listMembers, { channelId }) ?? [];
  const pendingInvites = useQuery(api.channels.listPendingInvitesForChannel, { channelId }) ?? [];
  const inviteMember = useMutation(api.channels.inviteMember);
  const removeMember = useMutation(api.channels.removeMember);

  const workspaceMemberIds = useMemo(
    () => new Set(workspaceMembers.map((m) => m.userId)),
    [workspaceMembers]
  );
  const channelMemberIds = useMemo(
    () => new Set(channelMembers.map((m) => m.userId)),
    [channelMembers]
  );

  const pendingUserIds = useMemo(
    () => new Set(pendingInvites.map((inv) => inv.userId)),
    [pendingInvites]
  );
  const selectableUsers = useMemo(() => {
    return searchResults.filter(
      (u) =>
        workspaceMemberIds.has(u._id) &&
        !channelMemberIds.has(u._id) &&
        !invitedSet.has(u._id) &&
        !pendingUserIds.has(u._id)
    );
  }, [searchResults, workspaceMemberIds, channelMemberIds, invitedSet, pendingUserIds]);

  const memberNames = useMemo(() => {
    const map = new Map(allUsers.map((u) => [u._id, u.name]));
    return channelMembers.map((m) => ({
      userId: m.userId,
      name: map.get(m.userId) ?? "Unknown",
      isCreator: m.userId === channelCreatedBy,
      isSelf: m.userId === currentUserId,
    }));
  }, [channelMembers, allUsers, channelCreatedBy, currentUserId]);

  const effectiveAdmin = Boolean(
    isChannelAdmin || (currentUserId && currentUserId === channelCreatedBy)
  );
  const canRemove = (memberUserId: Id<"users">) => {
    if (memberUserId === channelCreatedBy) return false;
    if (memberUserId === currentUserId) return true;
    return Boolean(effectiveAdmin && currentUserId);
  };
  const removeLabel = (memberUserId: Id<"users">) =>
    memberUserId === currentUserId ? "Leave" : "Remove";

  const handleRemove = async (memberUserId: Id<"users">) => {
    if (!currentUserId) return;
    setError(null);
    setRemovingId(memberUserId);
    try {
      await removeMember({
        channelId,
        userId: memberUserId,
        removedByUserId: currentUserId,
      });
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleInvite = async (targetUserId: Id<"users">) => {
    if (!addedByUserId) return;
    setError(null);
    setAddingId(targetUserId);
    try {
      await inviteMember({
        channelId,
        userId: targetUserId,
        invitedByUserId: addedByUserId,
      });
      setInvitedSet((prev) => new Set(prev).add(targetUserId));
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invite");
    } finally {
      setAddingId(null);
    }
  };
  const showAddSection = Boolean(effectiveAdmin && addedByUserId);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {showAddSection ? `Invite people to #${channelName}` : `#${channelName} members`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {showAddSection
                ? "Search and invite workspace members. They'll get a notification to accept."
                : "View current channel members."}
            </p>
          </div>
          {showAddSection && (
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
              <Icon name="Search" className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-base sm:text-sm"
              />
            </div>
          </div>
          )}
          {memberNames.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                In this channel
              </p>
              <ul className="space-y-1">
                {memberNames.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {m.name[0]?.toUpperCase() ?? "?"}
                      </span>
                      <span className="text-sm text-gray-900 truncate">
                        {m.name}
                        {m.isCreator && (
                          <span className="text-gray-400 font-normal"> (creator)</span>
                        )}
                      </span>
                    </span>
                    {canRemove(m.userId) && (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.userId)}
                        disabled={removingId === m.userId}
                        className={`shrink-0 px-2.5 py-1 rounded text-sm font-medium transition ${
                          m.isSelf
                            ? "text-amber-600 hover:bg-amber-50"
                            : "text-red-600 hover:bg-red-50"
                        } disabled:opacity-50`}
                      >
                        {removingId === m.userId ? "…" : removeLabel(m.userId)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showAddSection && pendingInvites.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                Invited (pending)
              </p>
              <ul className="space-y-1">
                {pendingInvites.map((inv) => (
                  <li
                    key={inv._id}
                    className="flex items-center justify-between gap-2 py-1.5"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                        {inv.userName[0]?.toUpperCase() ?? "?"}
                      </span>
                      <span className="text-sm text-gray-900 truncate">
                        {inv.userName}
                      </span>
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
                      Pending
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="overflow-y-auto flex-1 p-2">
            {showAddSection && !search.trim() ? (
              <p className="px-2 py-6 text-gray-500 text-sm text-center">
                Type a name or email to search for users to invite.
              </p>
            ) : showAddSection && selectableUsers.length === 0 ? (
              <div className="px-2 py-6 text-gray-500 text-sm text-center space-y-2">
                {searchResults.length === 0 ? (
                  <p>No users match your search.</p>
                ) : (
                  <>
                    <p>No one to invite from your search.</p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      Users must be in this workspace first. Add them from your workspace settings, then try again.
                    </p>
                  </>
                )}
              </div>
            ) : showAddSection ? (
              <ul className="space-y-0.5">
                {selectableUsers.map((user) => (
                  <li key={user._id}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInvite(user._id)}
                        disabled={addingId === user._id}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                      >
                        {addingId === user._id ? "Sending…" : "Invite"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="p-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 sm:py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
