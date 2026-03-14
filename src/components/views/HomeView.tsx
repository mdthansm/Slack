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

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

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
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30 overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10">

          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <Icon name="Home" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Home</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {channels.length} channel{channels.length !== 1 ? "s" : ""} &middot; {dmPreviews.length} conversation{dmPreviews.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Two-column grid on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

            {/* Channels section */}
            <section className="min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                  <Icon name="Hash" className="w-3 h-3 text-indigo-500" />
                </div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channels</h2>
                <span className="ml-auto text-xs text-gray-300 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">{channels.length}</span>
              </div>
              {channels.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 backdrop-blur-sm px-6 py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Icon name="Hash" className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No channels yet</p>
                  <p className="text-gray-400 text-xs mt-1">Create a channel to start collaborating</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map((ch) => (
                    <button
                      key={ch._id}
                      onClick={() => onSelectChannel(ch._id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100/80 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/40 active:bg-gray-50 transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-indigo-50 group-hover:to-indigo-100 flex items-center justify-center transition-all shrink-0 border border-gray-100 group-hover:border-indigo-200">
                        {ch.isPrivate ? (
                          <Icon name="Lock" className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        ) : (
                          <Icon name="Hash" className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-gray-800 text-sm block">{ch.name}</span>
                        {ch.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{ch.description}</p>
                        )}
                      </div>
                      <Icon name="ArrowRight" className="w-4 h-4 text-gray-200 group-hover:text-indigo-400 group-hover:translate-x-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Direct Messages section */}
            <section className="min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Icon name="MessageCircle" className="w-3 h-3 text-emerald-600" />
                </div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direct messages</h2>
                <span className="ml-auto text-xs text-gray-300 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">{dmPreviews.length}</span>
              </div>
              {dmPreviews.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 backdrop-blur-sm px-6 py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Icon name="MessageCircle" className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No conversations yet</p>
                  <p className="text-gray-400 text-xs mt-1">Start a direct message with someone</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dmPreviews.map((preview) => {
                    const names = getDmNames(preview.participantIds);
                    const snippet = preview.lastBody
                      ? preview.lastUserName === currentUserName ? `You: ${preview.lastBody}` : preview.lastBody
                      : null;
                    const ago = timeAgo(preview.lastTime);
                    return (
                      <button
                        key={preview.threadId}
                        onClick={() => onSelectDm(preview.threadId)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100/80 text-left hover:border-emerald-200 hover:bg-white hover:shadow-md hover:shadow-emerald-100/40 active:bg-gray-50 transition-all duration-200 group"
                      >
                        <div className={`w-10 h-10 rounded-full ${avatarColor(names)} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm ring-2 ring-white`}>
                          {names[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800 text-sm truncate">{names}</p>
                            {ago && <span className="text-[10px] text-gray-300 shrink-0 font-medium">{ago}</span>}
                          </div>
                          {snippet && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{snippet}</p>
                          )}
                        </div>
                        <Icon name="ArrowRight" className="w-4 h-4 text-gray-200 group-hover:text-emerald-400 group-hover:translate-x-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
