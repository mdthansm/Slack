"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { Icon } from "@/components/icons/FontAwesomeIcons";

type Props = {
  workspaceId: Id<"workspaces">;
  onSelectChannel: (id: Id<"channels">) => void;
  onSelectDm: (id: Id<"directMessageThreads">) => void;
};

export function HomeView({ workspaceId, onSelectChannel, onSelectDm }: Props) {
  const { userId } = useCurrentUser();
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];
  const dmPreviews = useQuery(
    api.directMessages.listThreadsWithPreview,
    userId ? { workspaceId, userId } : "skip"
  ) ?? [];
  const users = useQuery(api.users.list, {}) ?? [];

  const getDmNames = (participantIds: Id<"users">[]) => {
    if (!userId) return "DM";
    const other = participantIds.filter((id) => id !== userId);
    return other.map((id) => users.find((u) => u._id === id)?.name ?? "Unknown").join(", ") || "DM";
  };

  const currentUserName = users.find((u) => u._id === userId)?.name ?? "You";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-2xl w-full mx-auto overflow-y-auto overscroll-contain">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Home</h1>
        <p className="text-sm text-gray-400 mb-5 sm:mb-6">
          {channels.length} channel{channels.length !== 1 ? "s" : ""} &middot; {dmPreviews.length} conversation{dmPreviews.length !== 1 ? "s" : ""}
        </p>

        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Channels</h2>
          {channels.length === 0 ? (
            <p className="text-gray-400 text-sm py-2">No channels yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {channels.map((ch) => (
                <li key={ch._id}>
                  <button
                    onClick={() => onSelectChannel(ch._id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition text-sm"
                  >
                    {ch.isPrivate ? (
                      <Icon name="Lock" className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <Icon name="Hash" className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="font-medium">{ch.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Direct messages</h2>
          {dmPreviews.length === 0 ? (
            <p className="text-gray-400 text-sm py-2">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {dmPreviews.map((preview) => {
                const names = getDmNames(preview.participantIds);
                const snippet = preview.lastBody
                  ? preview.lastUserName === currentUserName ? `You: ${preview.lastBody}` : preview.lastBody
                  : null;
                return (
                  <li key={preview.threadId}>
                    <button
                      onClick={() => onSelectDm(preview.threadId)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 active:bg-gray-100 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {names[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{names}</p>
                        {snippet && <p className="text-xs text-gray-400 truncate mt-0.5">{snippet}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
