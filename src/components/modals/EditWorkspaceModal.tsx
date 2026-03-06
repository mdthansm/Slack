"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

export function EditWorkspaceModal({
  open,
  onClose,
  workspaceId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces"> | null;
  onSaved: () => void;
}) {
  const { userId } = useCurrentUser();
  const workspace = useQuery(
    api.workspaces.get,
    workspaceId ? { workspaceId } : "skip"
  );
  const workspaceMembers =
    useQuery(
      api.workspaces.listMembers,
      workspaceId ? { workspaceId } : "skip"
    ) ?? [];
  const allUsers = useQuery(api.users.list, {}) ?? [];

  const update = useMutation(api.workspaces.update);
  const addMember = useMutation(api.workspaces.addMember);
  const removeWorkspaceMember = useMutation(api.workspaces.removeMember);
  const changeRole = useMutation(api.workspaces.changeRole);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [addError, setAddError] = useState("");
  const [addingId, setAddingId] = useState<Id<"users"> | null>(null);
  const [removingUserId, setRemovingUserId] = useState<Id<"users"> | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [changingRoleId, setChangingRoleId] = useState<Id<"users"> | null>(null);

  const memberNames = useMemo(() => {
    const map = new Map(allUsers.map((u) => [u._id, u.name]));
    return workspaceMembers.map((m) => ({
      userId: m.userId,
      name: map.get(m.userId) ?? "Unknown",
      role: m.role,
      isCreator: m.userId === workspace?.createdBy,
      isSelf: m.userId === userId,
    }));
  }, [workspaceMembers, allUsers, workspace?.createdBy, userId]);

  const isWorkspaceAdmin = useMemo(() => {
    if (!userId) return false;
    if (workspace?.createdBy === userId) return true;
    return workspaceMembers.some((m) => m.userId === userId && m.role === "admin");
  }, [userId, workspace?.createdBy, workspaceMembers]);

  const memberIdSet = useMemo(
    () => new Set(workspaceMembers.map((m) => m.userId)),
    [workspaceMembers]
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return allUsers
      .filter(
        (u) =>
          !memberIdSet.has(u._id) &&
          (u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [search, allUsers, memberIdSet]);

  useEffect(() => {
    if (open && workspace) {
      setName(workspace.name);
      setDescription(workspace.description ?? "");
      setError("");
      setAddError("");
      setSearch("");
    }
  }, [open, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    try {
      await update({
        workspaceId,
        name: name.trim(),
        description: description.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (targetUserId: Id<"users">) => {
    if (!workspaceId || !userId) return;
    setAddError("");
    setAddingId(targetUserId);
    try {
      const role = selectedRoles[targetUserId] || "member";
      await addMember({
        workspaceId,
        userId: targetUserId,
        role,
        addedByUserId: userId,
      });
      setSearch("");
      setSelectedRoles((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add user.");
    } finally {
      setAddingId(null);
    }
  };

  const handleChangeRole = async (targetUserId: Id<"users">, newRole: string) => {
    if (!workspaceId || !userId) return;
    setAddError("");
    setChangingRoleId(targetUserId);
    try {
      await changeRole({
        workspaceId,
        userId: targetUserId,
        newRole,
        changedByUserId: userId,
      });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not change role.");
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleRemoveFromWorkspace = async (targetUserId: Id<"users">) => {
    if (!workspaceId || !userId) return;
    setAddError("");
    setRemovingUserId(targetUserId);
    try {
      await removeWorkspaceMember({
        workspaceId,
        userId: targetUserId,
        removedByUserId: userId,
      });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not remove user.");
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Workspace settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Edit name/description */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="ew-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="ew-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="ew-desc"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (optional)
                </label>
                <input
                  id="ew-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>

            {/* Add members (admin only, search existing Slack users) */}
            {isWorkspaceAdmin && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Add members
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Search for existing Slack users to add to this workspace.
                </p>
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                  <Icon
                    name="Search"
                    className="w-4 h-4 text-gray-400 shrink-0"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setAddError("");
                    }}
                    placeholder="Search by name or email..."
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                {addError && (
                  <p className="text-sm text-red-600 mt-2">{addError}</p>
                )}

                {/* Search results */}
                {filteredUsers.length > 0 && (
                  <ul className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <li
                        key={u._id}
                        className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.name[0]?.toUpperCase() ?? "?"}
                          </span>
                          <span className="min-w-0">
                            <span className="text-sm text-gray-900 truncate block">
                              {u.name}
                            </span>
                            <span className="text-xs text-gray-400 truncate block">
                              {u.email}
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={selectedRoles[u._id] || "member"}
                            onChange={(e) =>
                              setSelectedRoles((prev) => ({
                                ...prev,
                                [u._id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddUser(u._id)}
                            disabled={addingId === u._id}
                            className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                          >
                            {addingId === u._id ? "\u2026" : "Add"}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim() && filteredUsers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 px-1">
                    No users found. Invite them to Slack first using the sidebar
                    button.
                  </p>
                )}
              </div>
            )}

            {/* Current members */}
            {memberNames.length > 0 && (
              <div
                className={
                  isWorkspaceAdmin ? "" : "pt-4 border-t border-gray-200"
                }
              >
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Members ({memberNames.length})
                </h4>
                <ul className="space-y-0.5">
                  {memberNames.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {m.name[0]?.toUpperCase() ?? "?"}
                        </span>
                        <span className="min-w-0">
                          <span className="text-sm text-gray-900 truncate block">
                            {m.name}
                          </span>
                          {m.isCreator ? (
                            <span className="text-xs text-purple-600 font-medium">Creator</span>
                          ) : isWorkspaceAdmin && !m.isSelf ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.userId, e.target.value)}
                              disabled={changingRoleId === m.userId}
                              className="text-xs text-gray-500 bg-transparent border-none p-0 cursor-pointer hover:text-gray-800 focus:ring-0 disabled:opacity-50"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {m.role === "admin" ? "Admin" : "Member"}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {isWorkspaceAdmin && !m.isCreator && !m.isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFromWorkspace(m.userId)}
                            disabled={removingUserId === m.userId}
                            className="px-2.5 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                          >
                            {removingUserId === m.userId ? "\u2026" : "Remove"}
                          </button>
                        )}
                        {m.isSelf && !m.isCreator && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFromWorkspace(m.userId)}
                            disabled={removingUserId === m.userId}
                            className="px-2.5 py-1 rounded text-xs font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition"
                          >
                            {removingUserId === m.userId ? "\u2026" : "Leave"}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
