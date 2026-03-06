"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

export function StartDmModal({
  open,
  onClose,
  workspaceId,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces"> | null;
  onStarted: (threadId: Id<"directMessageThreads">) => void;
}) {
  const { userId } = useCurrentUser();
  const users = useQuery(api.users.list, open ? {} : "skip") ?? [];
  const getOrCreateThread = useMutation(api.directMessages.getOrCreateThread);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otherUsers = users.filter((u) => u._id !== userId);

  const handleStart = async (otherUserId: Id<"users">) => {
    if (!userId || !workspaceId) return;
    setError("");
    setLoading(true);
    try {
      const threadId = await getOrCreateThread({
        workspaceId,
        participantIds: [userId, otherUserId],
      });
      onStarted(threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start DM.");
    } finally {
      setLoading(false);
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
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Direct messages</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select a user to start a conversation.
          </p>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <ul className="space-y-1 overflow-y-auto custom-scrollbar flex-1">
            {otherUsers.map((u) => (
              <li key={u._id}>
                <button
                  onClick={() => handleStart(u._id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                  <Icon name="MessageCircle" className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              </li>
            ))}
          </ul>
          {otherUsers.length === 0 && (
            <p className="text-gray-500 text-sm py-4">No other users yet. Invite someone!</p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
