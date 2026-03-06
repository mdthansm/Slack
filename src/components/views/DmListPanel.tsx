"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { Icon } from "@/components/icons/FontAwesomeIcons";

type Props = {
  workspaceId: Id<"workspaces">;
  onSelectDm: (id: Id<"directMessageThreads">) => void;
  onComposeClick?: () => void;
  selectedThreadId?: Id<"directMessageThreads"> | null;
};

export function DmListPanel({ workspaceId, onSelectDm, onComposeClick, selectedThreadId = null }: Props) {
  const { userId } = useCurrentUser();
  const [search, setSearch] = useState("");

  const dmPreviews = useQuery(
    api.directMessages.listThreadsWithPreview,
    userId ? { workspaceId, userId } : "skip"
  ) ?? [];
  const users = useQuery(api.users.list, {}) ?? [];
  const currentUserName = users.find((u) => u._id === userId)?.name ?? "You";

  const getDmNames = (participantIds: Id<"users">[]) => {
    if (!userId) return "DM";
    const other = participantIds.filter((id) => id !== userId);
    return other.map((id) => users.find((u) => u._id === id)?.name ?? "Unknown").join(", ") || "DM";
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return dmPreviews;
    const q = search.trim().toLowerCase();
    return dmPreviews.filter((p) => {
      const names = getDmNames(p.participantIds).toLowerCase();
      const snippet = (p.lastBody ?? "").toLowerCase();
      return names.includes(q) || snippet.includes(q);
    });
  }, [dmPreviews, search, userId, users]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-white/80">Direct messages</h2>
          <button
            type="button"
            onClick={onComposeClick}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white/80 transition"
            title="New message"
          >
            <Icon name="Pencil" className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white/10 focus-within:bg-white/15">
          <Icon name="Search" className="w-3.5 h-3.5 text-white/40 shrink-0" />
          <input
            type="search"
            placeholder="Find a conversation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder-white/40 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-white/40 text-center">
            <p className="text-sm">
              {search.trim() ? "No matches found." : "No conversations yet."}
            </p>
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((preview) => {
              const names = getDmNames(preview.participantIds);
              const isSelected = selectedThreadId === preview.threadId;
              const snippet = preview.lastBody
                ? preview.lastUserName === currentUserName
                  ? `You: ${preview.lastBody}`
                  : preview.lastBody
                : null;
              return (
                <li key={preview.threadId}>
                  <button
                    onClick={() => onSelectDm(preview.threadId)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition text-sm ${
                      isSelected
                        ? "bg-[#1164a3] text-white"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {names[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{names}</p>
                      {snippet && (
                        <p className={`text-xs truncate mt-0.5 ${isSelected ? "text-white/70" : "text-white/40"}`}>
                          {snippet}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
