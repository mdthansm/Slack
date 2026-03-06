"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function BrowseChannelsModal({
  open,
  onClose,
  workspaceId,
  onSelectChannel,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces"> | null;
  onSelectChannel: (channelId: Id<"channels">) => void;
}) {
  const [search, setSearch] = useState("");
  const channels = useQuery(
    api.channels.listByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  ) ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.trim().toLowerCase();
    return channels.filter((ch) => ch.name.toLowerCase().includes(q));
  }, [channels, search]);

  const handleSelect = (channelId: Id<"channels">) => {
    onSelectChannel(channelId);
    onClose();
    setSearch("");
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
          className="relative w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Icon name="Search" className="w-5 h-5 text-gray-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels"
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Channels
            </p>
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-gray-500 text-sm">
                {channels.length === 0 ? "No channels yet." : "No channels match your search."}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((ch) => (
                  <li key={ch._id}>
                    <button
                      onClick={() => handleSelect(ch._id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-gray-100 transition"
                    >
                      {ch.isPrivate === true ? (
                        <Icon name="Lock" className="w-4 h-4 text-gray-500 shrink-0" />
                      ) : (
                        <Icon name="Hash" className="w-4 h-4 text-gray-500 shrink-0" />
                      )}
                      <span className="font-medium text-gray-900">{ch.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
