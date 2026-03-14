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

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-emerald-600", "bg-rose-500", "bg-amber-500",
  "bg-cyan-600", "bg-purple-600", "bg-pink-500", "bg-teal-600",
  "bg-blue-600", "bg-orange-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24 && d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function groupByDate<T extends { _creationTime: number }>(items: T[]): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  let currentLabel = "";
  let currentItems: T[] = [];
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const item of items) {
    const d = new Date(item._creationTime);
    const ds = d.toDateString();
    let label: string;
    if (ds === today) label = "Today";
    else if (ds === yesterday) label = "Yesterday";
    else label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

    if (label !== currentLabel) {
      if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
      currentLabel = label;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }
  if (currentItems.length) groups.push({ label: currentLabel, items: currentItems });
  return groups;
}

export function ActivityView({ workspaceId, onSelectChannel }: Props) {
  const { userId } = useCurrentUser();
  const recentMessages = useQuery(
    api.messages.listRecentForUser,
    userId ? { workspaceId, userId } : "skip"
  ) ?? [];
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];

  const getChannelName = (channelId: Id<"channels">) =>
    channels.find((c) => c._id === channelId)?.name ?? "channel";

  const grouped = groupByDate(recentMessages);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/20 overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10">

          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
                <Icon name="Bell" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Activity</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {recentMessages.length} recent message{recentMessages.length !== 1 ? "s" : ""} from your channels
                </p>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {recentMessages.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 backdrop-blur-sm px-6 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="Bell" className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 text-base font-medium">No recent activity</p>
              <p className="text-gray-400 text-sm mt-1.5">Join a channel and start chatting to see messages here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.label}>
                  {/* Date divider */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-200/60" />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 bg-transparent">{group.label}</span>
                    <div className="flex-1 h-px bg-gray-200/60" />
                  </div>

                  {/* Message cards */}
                  <div className="space-y-2">
                    {group.items.map((msg) => {
                      const userName = msg.userName ?? "Someone";
                      const channelName = getChannelName(msg.channelId);
                      const body = msg.body ?? (msg as { text?: string }).text ?? "";
                      return (
                        <button
                          key={msg._id}
                          onClick={() => onSelectChannel(msg.channelId)}
                          className="w-full flex items-start gap-3 px-4 py-3.5 text-left bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100/80 hover:border-orange-200 hover:bg-white hover:shadow-md hover:shadow-orange-100/30 active:bg-gray-50 transition-all duration-200 group"
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full ${avatarColor(userName)} flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5 ring-2 ring-white shadow-sm`}>
                            {userName[0]?.toUpperCase() ?? "?"}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-semibold text-gray-800 text-sm">{userName}</span>
                              <span className="text-[10px] text-gray-300">&middot;</span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                <Icon name="Hash" className="w-2.5 h-2.5" />
                                {channelName}
                              </span>
                              <span className="ml-auto text-[11px] text-gray-300 font-medium shrink-0">{formatTime(msg._creationTime)}</span>
                            </div>
                            <p className="text-sm text-gray-600 break-words line-clamp-2 leading-relaxed">{body}</p>
                          </div>

                          {/* Arrow */}
                          <Icon name="ArrowRight" className="w-4 h-4 text-gray-200 group-hover:text-orange-400 group-hover:translate-x-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-2.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
