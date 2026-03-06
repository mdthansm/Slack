"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

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

/** Render body with @mentions styled (e.g. @Manoj in purple). */
function MessageBody({ text }: { text: string }) {
  const parts = (text || "").split(/(@\w+)/g);
  return (
    <p className="text-gray-800 break-words text-sm sm:text-base">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="text-purple-600 font-medium">{part}</span>
        ) : (
          part
        )
      )}
    </p>
  );
}

export function MessageBubble({ message, isOwn, onEdit, onDelete, canEdit, variant }: Props) {
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

  return (
    <div
      className="group flex gap-3 items-start"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5">
        {(message.userName ?? "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{message.userName ?? "Unknown"}</span>
          {time != null && (
            <span className="text-xs text-gray-500 font-normal">
              ({time})
            </span>
          )}
          {showActions && canEdit && (
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-1">
              {variant === "channel" && (
                <button
                  onClick={onEdit}
                  className="p-1 rounded hover:bg-gray-200"
                  title="Edit"
                >
                  <Icon name="Pencil" className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-1 rounded hover:bg-red-100"
                title="Delete"
              >
                <Icon name="Trash2" className="w-3.5 h-3.5 text-red-500" />
              </button>
            </span>
          )}
        </div>
        <MessageBody text={body} />
      </div>
    </div>
  );
}
