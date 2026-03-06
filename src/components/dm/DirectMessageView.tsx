"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { MessageComposer } from "../MessageComposer";
import { motion, AnimatePresence } from "framer-motion";

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateDivider(ts: number): string {
  return new Date(ts).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function groupMessagesByDate<T extends { _id: string; _creationTime: number }>(
  messages: T[]
): { dateLabel: string; messages: T[] }[] {
  const groups: { dateLabel: string; messages: T[] }[] = [];
  let currentDate = "";
  let currentGroup: T[] = [];
  for (const msg of messages) {
    const dateLabel = formatDateDivider(msg._creationTime);
    if (dateLabel !== currentDate) {
      if (currentGroup.length) groups.push({ dateLabel: currentDate, messages: currentGroup });
      currentDate = dateLabel;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length) groups.push({ dateLabel: currentDate, messages: currentGroup });
  return groups;
}

export function DirectMessageView({
  workspaceId,
  threadId,
}: {
  workspaceId: Id<"workspaces">;
  threadId: Id<"directMessageThreads">;
}) {
  const { userId } = useCurrentUser();
  const thread = useQuery(api.directMessages.listThreadsForUser, { workspaceId, userId: userId! });
  const currentThread = thread?.find((t) => t._id === threadId);
  const messages = useQuery(api.directMessages.listByThread, { threadId }) ?? [];
  const users = useQuery(api.users.list, {}) ?? [];
  const otherParticipantIds = currentThread?.participantIds.filter((id: Id<"users">) => id !== userId) ?? [];
  const otherNames = otherParticipantIds.map((id) => users.find((u) => u._id === id)?.name ?? "Unknown").join(", ");
  const displayName = otherNames || "Direct message";
  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <h1 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{displayName}</h1>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white overscroll-contain">
        <div className="px-3 sm:px-4 py-2 space-y-1">
          <AnimatePresence initial={false}>
            {grouped.map(({ dateLabel, messages: groupMsgs }) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] font-medium text-gray-400 px-2 whitespace-nowrap">{dateLabel}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-0.5">
                  {groupMsgs.map((msg, i) => (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.1) }}
                      className="flex gap-2.5 py-1.5 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
                        {(msg.userName ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{msg.userName ?? "Unknown"}</span>
                          <span className="text-[11px] text-gray-400">{formatMessageTime(msg._creationTime)}</span>
                        </div>
                        <p className="text-gray-700 text-sm mt-0.5 break-words">
                          {(msg.body ?? "").split(/(@\w+)/g).map((part, j) =>
                            part.startsWith("@") ? (
                              <span key={j} className="text-blue-600 font-medium">{part}</span>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Composer */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
        <MessageComposer placeholder={`Message ${displayName}`} threadId={threadId} />
      </div>
    </div>
  );
}
