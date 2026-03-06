"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type MessageLike = {
  _id: string;
  userId: string;
  body?: string;
  userName?: string;
  userImageUrl?: string;
  text?: string;
  _creationTime?: number;
};

type Props = {
  message: MessageLike;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  variant: "channel" | "dm";
};

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn, onEdit, onDelete, canEdit, variant }: Props) {
  const [hovered, setHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const deleteChannelMsg = useMutation(api.messages.remove);
  const deleteDmMsg = useMutation(api.directMessages.remove);
  const body = message.body ?? (message as { text?: string }).text ?? "";
  const time =
    "_creationTime" in message && typeof (message as { _creationTime?: number })._creationTime === "number"
      ? formatMessageTime((message as { _creationTime: number })._creationTime)
      : null;

  const handleDelete = async () => {
    if (variant === "channel") {
      await deleteChannelMsg({ messageId: message._id as any });
    } else {
      await deleteDmMsg({ messageId: message._id as any });
    }
    onDelete();
  };

  const parts = (body || "").split(/(@\w+)/g);
  const actionsVisible = hovered || showActions;

  return (
    <div
      className="group flex gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowActions(false); }}
      onTouchEnd={() => { if (canEdit) setShowActions((s) => !s); }}
    >
      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
        {(message.userName ?? "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{message.userName ?? "Unknown"}</span>
          {time != null && <span className="text-[11px] text-gray-400">{time}</span>}
          {actionsVisible && canEdit && (
            <span className="flex items-center gap-1 ml-auto">
              {variant === "channel" && (
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition" title="Edit">
                  <Icon name="Pencil" className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
              <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-100 active:bg-red-200 transition" title="Delete">
                <Icon name="Trash2" className="w-3.5 h-3.5 text-red-400" />
              </button>
            </span>
          )}
        </div>
        <p className="text-gray-700 break-words text-sm mt-0.5">
          {parts.map((part, i) =>
            part.startsWith("@") ? (
              <span key={i} className="text-blue-600 font-medium">{part}</span>
            ) : (
              part
            )
          )}
        </p>
      </div>
    </div>
  );
}
