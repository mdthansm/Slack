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
  const dmPreviewText = (preview: { lastBody: string | null; lastUserName: string | null }) => {
    if (!preview.lastBody) return null;
    return preview.lastUserName === currentUserName ? `You: ${preview.lastBody}` : preview.lastBody;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      <div className="p-6 sm:p-8 max-w-2xl w-full mx-auto overflow-y-auto">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Home</h1>
        <p className="text-sm text-gray-500 mb-8">
          {channels.length} channel{channels.length !== 1 ? "s" : ""}, {dmPreviews.length} direct message{dmPreviews.length !== 1 ? "s" : ""}
        </p>

        {/* # CHANNELS */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name="Hash" className="w-4 h-4 text-gray-600" />
            Channels
          </h2>
          <ul className="space-y-1">
            {channels.length === 0 ? (
              <li className="text-gray-500 text-sm py-2 pl-0">No channels yet. Create one from the sidebar.</li>
            ) : (
              channels.map((ch) => (
                <li key={ch._id}>
                  <button
                    onClick={() => onSelectChannel(ch._id)}
                    className="w-full flex items-center gap-2 px-0 py-2.5 text-left text-gray-900 hover:text-gray-700 transition rounded-md hover:bg-gray-50 -ml-0.5 pl-0.5"
                  >
                    {ch.isPrivate === true ? (
                      <Icon name="Lock" className="w-4 h-4 text-gray-500 shrink-0" />
                    ) : (
                      <Icon name="Hash" className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <span className="font-medium">{ch.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* DIRECT MESSAGES — card-style entries */}
        <section>
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name="UserGroup" className="w-4 h-4 text-gray-600" />
            Direct messages
          </h2>
          <ul className="space-y-3">
            {dmPreviews.length === 0 ? (
              <li className="text-gray-500 text-sm py-3 pl-0">No direct messages yet. Start one from the sidebar.</li>
            ) : (
              dmPreviews.map((preview) => {
                const names = getDmNames(preview.participantIds);
                const previewText = dmPreviewText(preview);
                return (
                  <li key={preview.threadId}>
                    <button
                      onClick={() => onSelectDm(preview.threadId)}
                      className="w-full flex items-start gap-4 p-4 rounded-xl text-left bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 transition shadow-sm hover:shadow"
                    >
                      <div className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center text-white text-base font-bold shrink-0">
                        {names[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-semibold text-gray-900 truncate">{names}</p>
                        {previewText ? (
                          <p className="text-sm text-gray-500 truncate mt-0.5">{previewText}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic mt-0.5">No messages yet</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
