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

function formatDmDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

/** Render snippet with "You: " prefix when from self; style @mentions in light blue. */
function SnippetText({
  body,
  lastUserName,
  currentUserName,
}: {
  body: string;
  lastUserName: string | null;
  currentUserName: string;
}) {
  const prefix = lastUserName === currentUserName ? "You: " : "";
  const text = prefix + body;
  const parts = text.split(/(@\w+|https?:\/\/[^\s]+)/g);
  return (
    <span className="text-sm text-white/70 truncate block">
      {parts.map((part, i) => {
        if (part.startsWith("@"))
          return <span key={i} className="text-[#7ec8e3]">{part}</span>;
        if (part.startsWith("http"))
          return <span key={i} className="text-[#7ec8e3] truncate">{part}</span>;
        return part;
      })}
    </span>
  );
}

export function DmListPanel({ workspaceId, onSelectDm, onComposeClick, selectedThreadId = null }: Props) {
  const { userId } = useCurrentUser();
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [hoverThreadId, setHoverThreadId] = useState<Id<"directMessageThreads"> | null>(null);

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
    let list = dmPreviews;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => {
        const names = getDmNames(p.participantIds).toLowerCase();
        const snippet = (p.lastBody ?? "").toLowerCase();
        return names.includes(q) || snippet.includes(q);
      });
    }
    if (unreadsOnly) {
      list = list.filter(() => true);
    }
    return list;
  }, [dmPreviews, search, unreadsOnly, userId, users]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#4a154b] overflow-hidden">
      {/* Header: "Direct messages" + chevron | Unreads toggle + pencil */}
      <div className="shrink-0 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">Direct messages</h1>
            <button type="button" className="p-1 rounded hover:bg-white/10 text-white/80">
              <Icon name="ChevronDown" className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-white/80">Unreads</span>
            <button
              type="button"
              role="switch"
              aria-checked={unreadsOnly}
              onClick={() => setUnreadsOnly((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition ${
                unreadsOnly ? "bg-purple-400" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition ${
                  unreadsOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onComposeClick}
              className="p-2 rounded hover:bg-white/10 text-white/90 transition"
              title="New message"
            >
              <Icon name="Pencil" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Find a DM search */}
      <div className="shrink-0 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-white/10 border border-transparent focus-within:bg-white/15 focus-within:border-white/20">
          <Icon name="Search" className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="search"
            placeholder="Find a DM"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder-white/50 text-sm"
          />
        </div>
      </div>

      {/* DM thread list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-white/60 text-center">
            <Icon name="MessageCircle" className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No direct messages yet</p>
            <p className="text-sm mt-1">
              {search.trim()
                ? "No conversations match your search."
                : "Start a conversation from the sidebar (+ next to Direct messages) or click the pencil above."}
            </p>
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((preview) => {
              const names = getDmNames(preview.participantIds);
              const isHovered = hoverThreadId === preview.threadId;
              const isSelected = selectedThreadId === preview.threadId;
              return (
                <li key={preview.threadId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectDm(preview.threadId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectDm(preview.threadId);
                      }
                    }}
                    onMouseEnter={() => setHoverThreadId(preview.threadId)}
                    onMouseLeave={() => setHoverThreadId(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition cursor-pointer ${
                      isSelected ? "bg-white/20" : isHovered ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {/* Avatar with green online dot */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#1164a3] flex items-center justify-center text-white font-bold text-sm">
                        {names[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#4a154b]"
                        aria-hidden
                      />
                    </div>

                    {/* Name + snippet */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{names}</p>
                      {preview.lastBody != null && (
                        <SnippetText
                          body={preview.lastBody}
                          lastUserName={preview.lastUserName}
                          currentUserName={currentUserName}
                        />
                      )}
                    </div>

                    {/* Date + hover actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {preview.lastTime != null && (
                        <span className="text-xs text-white/50">
                          {formatDmDate(preview.lastTime)}
                        </span>
                      )}
                      {isHovered && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="p-1.5 rounded hover:bg-white/10 text-white/70"
                            title="Bookmark"
                          >
                            <Icon name="Bookmark" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded hover:bg-white/10 text-white/70"
                            title="More"
                          >
                            <Icon name="Ellipsis" className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
