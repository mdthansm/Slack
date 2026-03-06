"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

type Props = {
  workspaceId: Id<"workspaces">;
  onSelectChannel: (id: Id<"channels">) => void;
};

export function ActivityView({ workspaceId, onSelectChannel }: Props) {
  const { userId } = useCurrentUser();
  const recentMessages = useQuery(
    api.messages.listRecentForUser,
    userId ? { workspaceId, userId } : "skip"
  ) ?? [];
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];

  const getChannelName = (channelId: Id<"channels">) =>
    channels.find((c) => c._id === channelId)?.name ?? "Channel";

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      <div className="p-6 max-w-2xl w-full mx-auto overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Activity</h1>
        <p className="text-sm text-gray-400 mb-6">Recent messages from your channels</p>

        {recentMessages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No recent activity.</p>
            <p className="text-sm mt-1">Join a channel and start chatting.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {recentMessages.map((msg) => (
              <li key={msg._id}>
                <button
                  onClick={() => onSelectChannel(msg.channelId)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <span className="font-medium text-gray-600">#{getChannelName(msg.channelId)}</span>
                    <span>&middot;</span>
                    <span>{msg.userName ?? "Someone"}</span>
                    <span>&middot;</span>
                    <span>{formatTime(msg._creationTime)}</span>
                  </div>
                  <p className="text-sm text-gray-800 break-words">{msg.body ?? msg.text ?? ""}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
