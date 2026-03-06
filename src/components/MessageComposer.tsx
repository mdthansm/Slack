"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

type Props = {
  placeholder: string;
  channelId?: Id<"channels">;
  threadId?: Id<"directMessageThreads">;
};

export function MessageComposer({ placeholder, channelId, threadId }: Props) {
  const { userId, user } = useCurrentUser();
  const sendChannel = useMutation(api.messages.send);
  const sendDm = useMutation(api.directMessages.send);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !user || !body.trim()) return;
    const trimmed = body.trim();
    setBody("");
    setLoading(true);
    try {
      if (channelId) {
        await sendChannel({
          channelId,
          userId,
          body: trimmed,
          userName: user.name,
          userImageUrl: user.imageUrl ?? "",
        });
      } else if (threadId) {
        await sendDm({
          threadId,
          userId,
          body: trimmed,
          userName: user.name,
          userImageUrl: user.imageUrl ?? "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white outline-none transition"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !body.trim()}
        className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
      >
        <Icon name="Send" className="w-4 h-4" />
      </button>
    </form>
  );
}
