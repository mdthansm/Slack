"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { MessageComposer } from "../MessageComposer";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateDivider(ts: number): string {
  return new Date(ts).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

function groupMessagesByDate(
  messages: { _id: string; _creationTime: number; [k: string]: unknown }[]
): { dateLabel: string; messages: typeof messages }[] {
  const groups: { dateLabel: string; messages: typeof messages }[] = [];
  let currentDate = "";
  let currentGroup: typeof messages = [];
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
  const [activeTab, setActiveTab] = useState<"messages" | "canvas" | "files">("messages");
  const thread = useQuery(api.directMessages.listThreadsForUser, {
    workspaceId,
    userId: userId!,
  });
  const currentThread = thread?.find((t) => t._id === threadId);
  const messages = useQuery(api.directMessages.listByThread, { threadId }) ?? [];
  const users = useQuery(api.users.list, {}) ?? [];
  const otherParticipantIds = currentThread?.participantIds.filter((id: Id<"users">) => id !== userId) ?? [];
  const otherNames = otherParticipantIds
    .map((id) => users.find((u) => u._id === id)?.name ?? "Unknown")
    .join(", ");
  const displayName = otherNames || "Direct message";

  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      {/* Conversation header - responsive */}
      <header className="shrink-0 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 min-h-14">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button type="button" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0" title="Star">
              <Icon name="Star" className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {displayName[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="font-semibold text-gray-900 truncate">{displayName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 order-3 sm:order-2 w-full sm:w-auto">
            <div className="flex rounded-lg border border-gray-200 overflow-x-auto overflow-y-hidden min-w-0">
              {(["messages", "canvas", "files"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-gray-100 text-gray-900 border-b-2 border-purple-500"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab === "messages" ? "Messages" : tab === "canvas" ? "Canvas" : "Files"}
                </button>
              ))}
            </div>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0 hidden sm:block">
              <Icon name="Plus" className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 order-2 sm:order-3">
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hidden sm:block" title="Call">
              <Icon name="Headphones" className="w-4 h-4" />
            </button>
            <button type="button" className="hidden md:block p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Icon name="ChevronDown" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative" title="Notifications">
              <Icon name="Bell" className="w-4 h-4" />
            </button>
            <button type="button" className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Icon name="Search" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Icon name="Ellipsis" className="w-4 h-4" />
            </button>
            <button type="button" className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Icon name="X" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {activeTab === "messages" && (
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f8f8] min-h-0">
            <div className="p-3 sm:p-4 space-y-4">
              <AnimatePresence initial={false}>
                {grouped.map(({ dateLabel, messages: groupMsgs }) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-2 py-2">
                      <span className="text-xs font-medium text-gray-500">{dateLabel}</span>
                      <Icon name="ChevronDown" className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      {groupMsgs.map((msg, i) => (
                        <motion.div
                          key={msg._id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.15) }}
                          className="flex gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
                            {(msg.userName ?? "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-gray-900">{msg.userName ?? "Unknown"}</span>
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(msg._creationTime)}
                              </span>
                            </div>
                            <p className="text-gray-800 break-words text-sm mt-0.5">
                              {(msg.body ?? "").split(/(@\w+)/g).map((part, i) =>
                                part.startsWith("@") ? (
                                  <span key={i} className="text-purple-600 font-medium">{part}</span>
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

          <div className="p-3 sm:p-4 bg-white border-t border-gray-200 shrink-0">
            <div className="flex gap-1 mb-2 overflow-x-auto">
              {["B", "I", "U", "S"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 font-semibold text-sm"
                >
                  {c}
                </button>
              ))}
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500">
                <Icon name="List" className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 text-xs font-mono">
                {"</>"}
              </button>
            </div>
            <MessageComposer
              placeholder={`Message ${displayName}`}
              threadId={threadId}
            />
            <div className="flex items-center gap-1 mt-2">
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500">
                <Icon name="Plus" className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 text-sm font-medium">
                Aa
              </button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500">
                @
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "canvas" && (
        <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f8f8f8]">
          <p>Add canvas — coming soon</p>
        </div>
      )}

      {activeTab === "files" && (
        <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f8f8f8]">
          <p>No files in this conversation yet.</p>
        </div>
      )}
    </div>
  );
}
