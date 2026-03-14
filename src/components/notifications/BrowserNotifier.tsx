"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Props = {
  workspaceId: Id<"workspaces"> | null;
  userId: Id<"users"> | null;
};

export function BrowserNotifier({ workspaceId, userId }: Props) {
  const prevCountRef = useRef<number | null>(null);

  const recentMessages = useQuery(
    api.messages.listRecentForUser,
    workspaceId && userId ? { workspaceId, userId } : "skip"
  );

  useEffect(() => {
    if (!recentMessages || !userId) return;

    const currentCount = recentMessages.length;
    if (prevCountRef.current === null) {
      prevCountRef.current = currentCount;
      return;
    }

    if (currentCount > prevCountRef.current) {
      const newMessages = recentMessages.slice(0, currentCount - prevCountRef.current);
      for (const msg of newMessages) {
        if (msg.userId === userId) continue;
        if (document.hasFocus()) continue;

        if (Notification.permission === "granted") {
          const notif = new Notification(`${msg.userName ?? "Someone"} sent a message`, {
            body: msg.body ?? msg.text ?? "New message",
            icon: "/icon-192.png",
            tag: `msg-${msg._id}`,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        }
      }
    }

    prevCountRef.current = currentCount;
  }, [recentMessages, userId]);

  return null;
}
