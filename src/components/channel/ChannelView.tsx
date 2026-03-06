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

const CHANNEL_TABS = [
  "Messages",
  "Project tracker",
  "Database",
  "Links",
  "Assets",
  "Files",
  "Pins",
  "Reports",
  "Credentials",
] as const;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDateDivider(ts: number): string {
  const d = new Date(ts);
  const month = d.toLocaleDateString([], { month: "long" });
  const day = ordinal(d.getDate());
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
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
  const { userId } = useCurrentUser();
  const channel = useQuery(api.channels.get, { channelId });
  const membership = useQuery(
    api.channels.getMembership,
    channelId && userId ? { channelId, userId } : "skip"
  );
  const channelMembers = useQuery(api.channels.listMembers, { channelId }) ?? [];
  const messages = useQuery(api.messages.listByChannel, { channelId }) ?? [];
  const [editChannelOpen, setEditChannelOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const isChannelAdmin =
    membership?.role === "admin" || userId === channel?.createdBy;
  const [editMessageId, setEditMessageId] = useState<Id<"messages"> | null>(null);
  const [editMessageBody, setEditMessageBody] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof CHANNEL_TABS)[number]>("Messages");
  const [newMessagesBannerDismissed, setNewMessagesBannerDismissed] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
  const showNewMessagesBanner =
    !newMessagesBannerDismissed && messages.length > 10;

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading channel...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Channel header — left: star, lock, name; center: tabs; right: icons */}
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 sm:px-4 py-2 min-h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0" title="Star">
              <Icon name="Star" className="w-5 h-5" />
            </button>
            {channel.isPrivate === true && (
              <Icon name="Lock" className="w-5 h-5 text-gray-500 shrink-0" title="Private channel" />
            )}
            <span className="font-semibold text-gray-900 truncate">{channel.name}</span>
          </div>

          <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-x-auto overflow-y-hidden border-b border-transparent">
            {CHANNEL_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab
                    ? "border-purple-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
            <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 shrink-0 ml-0.5" title="Add tab">
              <Icon name="Plus" className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm font-medium"
              title={isChannelAdmin ? "Manage channel members" : "View channel members"}
            >
              <span className="flex items-center gap-1">
                <Icon name="UserGroup" className="w-4 h-4" />
                <span className="hidden sm:inline">{channelMembers.length}</span>
              </span>
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Huddles">
              <Icon name="Headphones" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Icon name="ChevronDown" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 relative" title="Notifications">
              <Icon name="Bell" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Search">
              <Icon name="Search" className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="More">
              <Icon name="Ellipsis" className="w-4 h-4" />
            </button>
            {userId === channel.createdBy && (
              <>
                <button
                  onClick={() => setEditChannelOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition hidden sm:block"
                  title="Edit channel"
                >
                  <Icon name="Pencil" className="w-4 h-4 text-gray-500" />
                </button>
                <DeleteChannelButton channelId={channelId} workspaceId={workspaceId} />
              </>
            )}
          </div>
        </div>
      </header>

      {activeTab === "Messages" && (
        <>
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f8f8] min-h-0 relative"
          >
            <div className="p-4 space-y-4">
              {showNewMessagesBanner && (
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-[#1164a3] text-white text-sm">
                  <span>↑ 50+ new messages</span>
                  <button
                    type="button"
                    onClick={() => setNewMessagesBannerDismissed(true)}
                    className="p-1 rounded hover:bg-white/20"
                    aria-label="Dismiss"
                  >
                    <Icon name="X" className="w-4 h-4" />
                  </button>
                </div>
              )}

              <AnimatePresence initial={false}>
                {grouped.map(({ dateLabel, messages: groupMsgs }) => (
                  <div key={dateLabel}>
                    <div className="flex items-center justify-center gap-2 py-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-medium text-gray-500 px-2">{dateLabel}</span>
                      <Icon name="ChevronDown" className="w-3 h-3 text-gray-400 shrink-0" />
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="space-y-2">
                      {groupMsgs.map((msg, i) => (
                        <motion.div
                          key={msg._id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.15) }}
                        >
                          <MessageBubble
                            message={msg}
                            isOwn={msg.userId === userId}
                            onEdit={() => {
                              setEditMessageId(msg._id as Id<"messages">);
                              setEditMessageBody(msg.body ?? msg.text ?? "");
                            }}
                            onDelete={() => {}}
                            canEdit={msg.userId === userId}
                            variant="channel"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            </div>
            <div ref={messagesEndRef} />
            {/* Floating "Latest messages" button — fixed at bottom of message area when scrolled up */}
            {showScrollToBottom && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <Icon name="ChevronDown" className="w-4 h-4" />
                  Latest messages
                </button>
              </div>
            )}
          </div>

          {/* Composer — formatting toolbar, input, action row (exact image format) */}
          <div className="p-3 sm:p-4 bg-white border-t border-gray-200 shrink-0">
            <div className="flex flex-wrap gap-0.5 mb-2">
              <button type="button" className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 font-bold text-sm" title="Bold">B</button>
              <button type="button" className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 italic text-sm" title="Italic">I</button>
              <button type="button" className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 underline text-sm" title="Underline">U</button>
              <button type="button" className="w-8 h-8 rounded hover:bg-gray-100 text-gray-600 line-through text-sm" title="Strikethrough">S</button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Link"><Icon name="List" className="w-4 h-4" /></button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Bullet list"><Icon name="List" className="w-4 h-4" /></button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 font-mono text-xs" title="Code block">&lt;/&gt;</button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 text-sm" title="Quote">&quot;</button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Align left"><Icon name="ArrowLeft" className="w-4 h-4" /></button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Align right"><Icon name="ArrowRight" className="w-4 h-4" /></button>
              <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 font-mono text-xs" title="Code">&lt;&gt;</button>
            </div>
            <MessageComposer
              placeholder={`Message #${channel.name}`}
              channelId={channelId}
            />
            <div className="flex items-center justify-between gap-1 mt-2">
              <div className="flex items-center gap-0.5">
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Add"><Icon name="Plus" className="w-4 h-4" /></button>
                <span className="text-sm font-medium text-gray-500 px-1">Aa</span>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500 text-sm" title="Emoji">😊</button>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Mention">@</button>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Attachment"><Icon name="Paperclip" className="w-4 h-4" /></button>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Voice"><Icon name="Headphones" className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Send"><Icon name="Send" className="w-4 h-4" /></button>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Up"><Icon name="ChevronUp" className="w-4 h-4" /></button>
                <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Down"><Icon name="ChevronDown" className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab !== "Messages" && (
        <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f8f8f8]">
          <p>{activeTab} — coming soon</p>
        </div>
      )}

      <EditChannelModal
        open={editChannelOpen}
        onClose={() => setEditChannelOpen(false)}
        channel={channel}
        onSaved={() => setEditChannelOpen(false)}
      />
      {userId && (
        <InviteToChannelModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          workspaceId={workspaceId}
          channelId={channelId}
          channelName={channel.name}
          addedByUserId={userId ?? undefined}
          currentUserId={userId ?? undefined}
          channelCreatedBy={channel.createdBy}
          isChannelAdmin={isChannelAdmin}
        />
      )}
      <EditMessageModal
        open={!!editMessageId}
        onClose={() => setEditMessageId(null)}
        messageId={editMessageId}
        initialBody={editMessageBody}
        onSaved={() => setEditMessageId(null)}
        variant="channel"
      />
    </div>
  );
}

function DeleteChannelButton({
  channelId,
  workspaceId,
}: {
  channelId: Id<"channels">;
  workspaceId: Id<"workspaces">;
}) {
  const remove = useMutation(api.channels.remove);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    await remove({ channelId });
    setConfirming(false);
    window.location.reload();
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Delete?</span>
        <button
          onClick={handleDelete}
          className="px-2 py-1 text-sm bg-red-600 text-white rounded"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-sm bg-gray-200 rounded"
        >
          No
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-2 rounded-lg hover:bg-red-50 transition"
      title="Delete channel"
    >
      <Icon name="Trash2" className="w-4 h-4 text-red-500" />
    </button>
  );
}
