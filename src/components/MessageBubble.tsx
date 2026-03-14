"use client";

import { useState, useRef, useCallback } from "react";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ProfilePopup } from "./ProfilePopup";

type MessageLike = {
  _id: string;
  userId: string;
  body?: string;
  userName?: string;
  userImageUrl?: string;
  text?: string;
  _creationTime?: number;
  fileUrl?: string | null;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileStorageId?: string;
};

type ReactionData = {
  emoji: string;
  count: number;
  userIds: string[];
  userNames: string[];
};

type UserStatus = { emoji: string; text: string } | null;

type Props = {
  message: MessageLike;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  variant: "channel" | "dm";
  reactions?: ReactionData[];
  currentUserId?: string;
  currentUserName?: string;
  onForward?: () => void;
  onReply?: (userName: string, body: string) => void;
  isOnline?: boolean;
  userStatus?: UserStatus;
  currentUserImageUrl?: string;
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "😮"];
const QUICK_LIKE = "👍";

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isImageType(type?: string): boolean {
  return !!type && type.startsWith("image/");
}
function isVideoType(type?: string): boolean {
  return !!type && type.startsWith("video/");
}
function isAudioType(type?: string): boolean {
  return !!type && type.startsWith("audio/");
}

function FilePreview({ message }: { message: MessageLike }) {
  if (!message.fileUrl) return null;

  if (isImageType(message.fileType)) {
    return (
      <div className="mt-2 max-w-xs">
        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={message.fileUrl}
            alt={message.fileName ?? "image"}
            className="rounded-xl border border-gray-200/80 max-h-56 object-cover cursor-pointer hover:opacity-90 transition shadow-sm"
          />
        </a>
        {message.fileName && (
          <p className="text-[11px] text-gray-400 mt-1.5 truncate">{message.fileName}</p>
        )}
      </div>
    );
  }

  if (isVideoType(message.fileType)) {
    return (
      <div className="mt-2 max-w-xs">
        <video
          src={message.fileUrl}
          controls
          className="rounded-xl border border-gray-200/80 max-h-56 shadow-sm"
        />
        {message.fileName && (
          <p className="text-[11px] text-gray-400 mt-1.5 truncate">{message.fileName}</p>
        )}
      </div>
    );
  }

  if (isAudioType(message.fileType)) {
    return (
      <div className="mt-2">
        <audio src={message.fileUrl} controls className="max-w-full" />
        {message.fileName && (
          <p className="text-[11px] text-gray-400 mt-1.5 truncate">{message.fileName}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 hover:bg-gray-100 hover:border-gray-300 transition text-sm group/file"
      >
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <Icon name="File" className="w-4 h-4 text-gray-400" />
        </div>
        <div className="min-w-0">
          <span className="text-gray-700 font-medium truncate block max-w-[180px]">
            {message.fileName ?? "Download file"}
          </span>
          {message.fileSize != null && message.fileSize > 0 && (
            <span className="text-[11px] text-gray-400">{formatFileSize(message.fileSize)}</span>
          )}
        </div>
        <Icon name="Download" className="w-3.5 h-3.5 text-gray-300 group-hover/file:text-gray-500 transition shrink-0" />
      </a>
    </div>
  );
}

export function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
  canEdit,
  variant,
  reactions = [],
  currentUserId,
  currentUserName,
  onForward,
  onReply,
  isOnline,
  userStatus,
  currentUserImageUrl,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const deleteChannelMsg = useMutation(api.messages.remove);
  const deleteDmMsg = useMutation(api.directMessages.remove);
  const toggleReaction = useMutation(api.reactions.toggle);
  const body = message.body ?? (message as { text?: string }).text ?? "";
  const time =
    "_creationTime" in message && typeof (message as { _creationTime?: number })._creationTime === "number"
      ? formatMessageTime((message as { _creationTime: number })._creationTime)
      : null;

  const isForwarded = body.startsWith("↪ Forwarded from ");

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      if (variant === "channel") {
        await deleteChannelMsg({ messageId: message._id as Id<"messages"> });
      } else {
        await deleteDmMsg({ messageId: message._id as Id<"directMessages"> });
      }
      onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    setShowReactionPicker(false);
    await toggleReaction({
      messageId: variant === "channel" ? (message._id as Id<"messages">) : undefined,
      directMessageId: variant === "dm" ? (message._id as Id<"directMessages">) : undefined,
      userId: currentUserId as Id<"users">,
      emoji,
      userName: currentUserName,
    });
  };

  const handleQuickLike = () => handleReaction(QUICK_LIKE);

  const handleReply = () => {
    onReply?.(message.userName ?? "Unknown", body);
  };

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusModalOpenRef = useRef(false);

  const handleAvatarMouseEnter = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTimeoutRef.current = setTimeout(() => setShowProfile(true), 200);
  }, []);

  const handleAvatarMouseLeave = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => setShowProfile(false), 300);
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    if (statusModalOpenRef.current) return;
    hideTimeoutRef.current = setTimeout(() => setShowProfile(false), 300);
  }, []);

  const lines = (body || "").split("\n");
  const quotedLines = lines.filter((l) => l.startsWith("> "));
  const restLines = lines.filter((l) => !l.startsWith("> "));
  const quotedText = quotedLines.map((l) => l.slice(2)).join("\n");
  const restBody = restLines.join("\n");
  const restParts = restBody.split(/(@\w+)/g);
  const toolbarVisible = hovered || showActions || showReactionPicker;

  const likeReaction = reactions.find((r) => r.emoji === QUICK_LIKE);
  const hasLiked = likeReaction && currentUserId ? likeReaction.userIds.includes(currentUserId) : false;

  const statusDot = userStatus ? userStatus.emoji : null;
  const avatarImageUrl = message.userId === currentUserId
    ? (currentUserImageUrl ?? message.userImageUrl)
    : message.userImageUrl;

  return (
    <div
      className="group relative flex gap-2.5 py-2 px-3 -mx-3 rounded-xl hover:bg-gray-50/80 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowActions(false); setShowReactionPicker(false); }}
      onTouchEnd={() => setShowActions((s) => !s)}
    >
      {/* Avatar with presence/status dot */}
      <div
        className="relative shrink-0 mt-0.5"
        ref={avatarRef}
        onMouseEnter={handleAvatarMouseEnter}
        onMouseLeave={handleAvatarMouseLeave}
      >
        {avatarImageUrl ? (
          <img
            src={avatarImageUrl}
            alt={message.userName ?? "?"}
            className="w-9 h-9 rounded-full object-cover shadow-sm hover:opacity-90 transition cursor-pointer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:opacity-90 transition cursor-pointer">
            {(message.userName ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        {statusDot ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[9px] leading-none shadow-sm"
            title={userStatus?.text}
          >
            {statusDot}
          </span>
        ) : (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              isOnline ? "bg-green-500" : "bg-red-500"
            }`}
            title={isOnline ? "Online" : "Offline"}
          />
        )}
      </div>

      {/* Profile popup */}
      {showProfile && (
        <ProfilePopup
          userName={message.userName ?? "Unknown"}
          imageUrl={message.userId === currentUserId ? (currentUserImageUrl ?? message.userImageUrl) : message.userImageUrl}
          isOnline={!!isOnline}
          status={userStatus ?? null}
          isSelf={message.userId === currentUserId}
          userId={message.userId as Id<"users">}
          onCloseAction={() => setShowProfile(false)}
          anchorRect={avatarRef.current?.getBoundingClientRect() ?? null}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          onStatusModalOpenChange={(open) => { statusModalOpenRef.current = open; }}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + time + status row */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-[13px]">{message.userName ?? "Unknown"}</span>
          {userStatus && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]" title={userStatus.text}>
              {userStatus.emoji} {userStatus.text}
            </span>
          )}
          {time != null && <span className="text-[11px] text-gray-400">{time}</span>}
          {isForwarded && (
            <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md font-semibold">Forwarded</span>
          )}
        </div>

        {/* Quoted reply context */}
        {quotedText && (
          <div className="flex items-stretch gap-0 mb-1 mt-0.5">
            <div className="w-[3px] rounded-full bg-gray-300 shrink-0" />
            <p className="text-xs text-gray-400 italic pl-2 py-0.5 break-words line-clamp-2">{quotedText}</p>
          </div>
        )}

        {/* Message body */}
        <p className="text-gray-700 break-words text-[13.5px] leading-relaxed">
          {restParts.map((part, i) =>
            part.startsWith("@") ? (
              <span key={i} className="text-blue-600 font-semibold bg-blue-50 px-0.5 rounded">{part}</span>
            ) : (
              part
            )
          )}
        </p>

        <FilePreview message={message} />

        {/* Reactions row */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {reactions.map((r) => {
              const isMine = currentUserId ? r.userIds.includes(currentUserId) : false;
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReaction(r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isMine
                      ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm shadow-blue-100"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  title={r.userNames.filter(Boolean).join(", ")}
                >
                  <span className="text-sm">{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowReactionPicker(true)}
              className="w-7 h-7 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:border-gray-400 transition"
              title="Add reaction"
            >
              <Icon name="Plus" className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Reaction picker */}
        {showReactionPicker && (
          <div className="absolute z-30 mt-1 flex items-center gap-0.5 bg-white rounded-xl shadow-xl border border-gray-200 p-1 animate-in fade-in zoom-in-95">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 active:scale-90 text-lg transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating hover toolbar */}
      {toolbarVisible && (
        <div className="absolute -top-3.5 right-2 flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
          <button
            onClick={handleQuickLike}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-r border-gray-100 ${
              hasLiked
                ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
            title={hasLiked ? "Remove like" : "Like"}
          >
            <span className="text-sm">👍</span>
            {likeReaction && likeReaction.count > 0 && <span>{likeReaction.count}</span>}
          </button>

          <button
            onClick={() => setShowReactionPicker((s) => !s)}
            className="px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
            title="Add reaction"
          >
            <Icon name="Smile" className="w-3.5 h-3.5" />
          </button>

          {onReply && (
            <button
              onClick={handleReply}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              title="Reply"
            >
              <Icon name="Reply" className="w-3.5 h-3.5" />
            </button>
          )}

          {onForward && (
            <button
              onClick={onForward}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              title="Forward"
            >
              <Icon name="Share" className="w-3.5 h-3.5" />
            </button>
          )}

          {canEdit && variant === "channel" && (
            <button
              onClick={onEdit}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              title="Edit"
            >
              <Icon name="Pencil" className="w-3.5 h-3.5" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Icon name="Trash2" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Icon name="Trash2" className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Delete message</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              {message.fileName && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                  <Icon name="File" className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{message.fileName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
