"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

export function CreateChannelModal({
  open,
  onClose,
  workspaceId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces"> | null;
  onCreated: (channelId: Id<"channels">) => void;
}) {
  const { userId } = useCurrentUser();
  const create = useMutation(api.channels.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !workspaceId) return;
    setError("");
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) {
      setError("Channel name is required.");
      return;
    }
    setLoading(true);
    try {
      const id = await create({
        workspaceId,
        name: trimmed,
        description: description.trim(),
        createdBy: userId,
      });
      setName("");
      setDescription("");
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
          className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create channel</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. general"
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-gray-200 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowercase, no spaces (e.g. general, random).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-gray-200 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 sm:py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !workspaceId}
                className="px-4 py-2.5 sm:py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
