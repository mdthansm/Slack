"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { MessageComposer } from "../MessageComposer";
import { MessageBubble } from "../MessageBubble";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";

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
  const { userId, user } = useCurrentUser();
  const thread = useQuery(api.directMessages.listThreadsForUser, { workspaceId, userId: userId! });
  const currentThread = thread?.find((t) => t._id === threadId);
  const messages = useQuery(api.directMessages.listByThread, { threadId }) ?? [];
  const users = useQuery(api.users.list, {}) ?? [];
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];
  const forwardMessage = useMutation(api.reactions.forwardMessage);
  const otherParticipantIds = currentThread?.participantIds.filter((id: Id<"users">) => id !== userId) ?? [];
  const otherNames = otherParticipantIds.map((id) => users.find((u) => u._id === id)?.name ?? "Unknown").join(", ");
  const displayName = otherNames || "Direct message";
  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);
  const [forwardingMessageId, setForwardingMessageId] = useState<Id<"directMessages"> | null>(null);
  const [replyTo, setReplyTo] = useState<{ userName: string; body: string } | null>(null);

  const dmIds = useMemo(() => messages.map((m) => m._id), [messages]);
  const reactionsMap = useQuery(
    api.reactions.listForDirectMessages,
    dmIds.length > 0 ? { directMessageIds: dmIds } : "skip"
  );

  const handleForward = async (targetChannelId: Id<"channels">) => {
    if (!forwardingMessageId || !userId || !user) return;
    await forwardMessage({
      sourceDirectMessageId: forwardingMessageId,
      forwardedByUserId: userId,
      forwardedByName: user.name,
      targetChannelId,
    });
    setForwardingMessageId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      <header className="shrink-0 border-b border-gray-200 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <h1 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{displayName}</h1>
        </div>
      </header>

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
                    >
                      <MessageBubble
                        message={msg}
                        isOwn={msg.userId === userId}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        canEdit={msg.userId === userId}
                        variant="dm"
                        reactions={reactionsMap?.[msg._id] ?? []}
                        currentUserId={userId ?? undefined}
                        currentUserName={user?.name}
                        onForward={() => setForwardingMessageId(msg._id as Id<"directMessages">)}
                        onReply={(userName, body) => setReplyTo({ userName, body })}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
        <MessageComposer
          placeholder={`Message ${displayName}`}
          threadId={threadId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingMessageId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setForwardingMessageId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Forward message to channel</h3>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {channels.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => handleForward(c._id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-2 transition"
                  >
                    <Icon name={c.isPrivate ? "Lock" : "Hash"} className="w-4 h-4 text-gray-400" />
                    {c.name}
                  </button>
                ))}
                {channels.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No channels available</p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => setForwardingMessageId(null)}
                  className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
