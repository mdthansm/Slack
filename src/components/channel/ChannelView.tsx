"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { MessageComposer } from "../MessageComposer";
import { MessageBubble } from "../MessageBubble";
import { EditChannelModal } from "../modals/EditChannelModal";
import { EditMessageModal } from "../modals/EditMessageModal";
import { InviteToChannelModal } from "../modals/InviteToChannelModal";

function formatDateDivider(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
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

export function ChannelView({
  workspaceId,
  channelId,
}: {
  workspaceId: Id<"workspaces">;
  channelId: Id<"channels">;
}) {
  const { userId, user } = useCurrentUser();
  const channel = useQuery(api.channels.get, { channelId });
  const membership = useQuery(
    api.channels.getMembership,
    channelId && userId ? { channelId, userId } : "skip"
  );
  const channelMembers = useQuery(api.channels.listMembers, { channelId }) ?? [];
  const messages = useQuery(api.messages.listByChannel, { channelId }) ?? [];
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];
  const [editChannelOpen, setEditChannelOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const joinAsAdmin = useMutation(api.channels.joinAsWorkspaceAdmin);
  const forwardMessage = useMutation(api.reactions.forwardMessage);
  const isChannelAdmin = membership?.role === "admin" || userId === channel?.createdBy;
  const [editMessageId, setEditMessageId] = useState<Id<"messages"> | null>(null);
  const [editMessageBody, setEditMessageBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [forwardingMessageId, setForwardingMessageId] = useState<Id<"messages"> | null>(null);
  const [replyTo, setReplyTo] = useState<{ userName: string; body: string } | null>(null);

  const messageIds = useMemo(() => messages.map((m) => m._id), [messages]);
  const reactionsMap = useQuery(
    api.reactions.listForMessages,
    messageIds.length > 0 ? { messageIds } : "skip"
  );

  useEffect(() => {
    if (membership && "autoJoinNeeded" in membership && membership.autoJoinNeeded && userId) {
      joinAsAdmin({ channelId, userId }).catch(() => {});
    }
  }, [membership, channelId, userId, joinAsAdmin]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > 80);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);

  const handleForward = async (targetChannelId: Id<"channels">) => {
    if (!forwardingMessageId || !userId || !user) return;
    await forwardMessage({
      sourceMessageId: forwardingMessageId,
      forwardedByUserId: userId,
      forwardedByName: user.name,
      targetChannelId,
    });
    setForwardingMessageId(null);
  };

  if (!channel) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading channel...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <header className="shrink-0 border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {channel.isPrivate ? (
              <Icon name="Lock" className="w-4 h-4 text-gray-400 shrink-0" />
            ) : (
              <Icon name="Hash" className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <h1 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{channel.name}</h1>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 text-sm transition"
              title={isChannelAdmin ? "Manage members" : "View members"}
            >
              <Icon name="UserGroup" className="w-4 h-4" />
              <span className="text-xs">{channelMembers.length}</span>
            </button>
            {isChannelAdmin && (
              <button
                onClick={() => setEditChannelOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition hidden sm:block"
                title="Edit channel"
              >
                <Icon name="Pencil" className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {userId === channel.createdBy && (
              <DeleteChannelButton channelId={channelId} workspaceId={workspaceId} />
            )}
          </div>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 relative bg-white overscroll-contain">
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
                        onEdit={() => { setEditMessageId(msg._id as Id<"messages">); setEditMessageBody(msg.body ?? msg.text ?? ""); }}
                        onDelete={() => {}}
                        canEdit={msg.userId === userId}
                        variant="channel"
                        reactions={reactionsMap?.[msg._id] ?? []}
                        currentUserId={userId ?? undefined}
                        currentUserName={user?.name}
                        onForward={() => setForwardingMessageId(msg._id as Id<"messages">)}
                        onReply={(userName, body) => setReplyTo({ userName, body })}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
        {showScrollToBottom && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:bg-gray-100 text-xs font-medium text-gray-600 transition"
            >
              <Icon name="ChevronDown" className="w-3 h-3" />
              New messages
            </button>
          </div>
        )}
      </div>

      <div className="px-3 sm:px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
        <MessageComposer
          placeholder={`Message #${channel.name}`}
          channelId={channelId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      <EditChannelModal open={editChannelOpen} onClose={() => setEditChannelOpen(false)} channel={channel} onSaved={() => setEditChannelOpen(false)} />
      {userId && (
        <InviteToChannelModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} workspaceId={workspaceId} channelId={channelId} channelName={channel.name} addedByUserId={userId} currentUserId={userId} channelCreatedBy={channel.createdBy} isChannelAdmin={isChannelAdmin} />
      )}
      <EditMessageModal open={!!editMessageId} onClose={() => setEditMessageId(null)} messageId={editMessageId} initialBody={editMessageBody} onSaved={() => setEditMessageId(null)} variant="channel" />

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
                {channels.filter((c) => c._id !== channelId).map((c) => (
                  <button
                    key={c._id}
                    onClick={() => handleForward(c._id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-2 transition"
                  >
                    <Icon name={c.isPrivate ? "Lock" : "Hash"} className="w-4 h-4 text-gray-400" />
                    {c.name}
                  </button>
                ))}
                {channels.filter((c) => c._id !== channelId).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No other channels available</p>
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

function DeleteChannelButton({ channelId }: { channelId: Id<"channels">; workspaceId: Id<"workspaces"> }) {
  const remove = useMutation(api.channels.remove);
  const [confirming, setConfirming] = useState(false);
  const handleDelete = async () => { await remove({ channelId }); setConfirming(false); window.location.reload(); };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600">Delete?</span>
        <button onClick={handleDelete} className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg">Yes</button>
        <button onClick={() => setConfirming(false)} className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg">No</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="p-2 rounded-lg hover:bg-red-50 active:bg-red-100 transition" title="Delete channel">
      <Icon name="Trash2" className="w-4 h-4 text-red-400" />
    </button>
  );
}
