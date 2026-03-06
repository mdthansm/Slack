"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { Icon } from "@/components/icons/FontAwesomeIcons";

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

  const body = (msg: { body?: string; text?: string }) => msg.body ?? msg.text ?? "";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f8f8] overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="Bell" className="w-5 h-5 text-purple-500" />
          Activity
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Recent messages from your channels</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {recentMessages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icon name="Bell" className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity.</p>
            <p className="text-sm mt-1">Join a channel and start chatting to see messages here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentMessages.map((msg) => (
              <li key={msg._id}>
                <button
                  onClick={() => onSelectChannel(msg.channelId)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">#{getChannelName(msg.channelId)}</span>
                    <span>·</span>
                    <span>{msg.userName ?? "Someone"}</span>
                    <span>·</span>
                    <span>{formatTime(msg._creationTime)}</span>
                  </div>
                  <p className="text-gray-900 break-words">{body(msg)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
