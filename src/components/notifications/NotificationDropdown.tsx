"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Props = {
  userId: Id<"users"> | null;
  workspaceId: Id<"workspaces"> | null;
  onAcceptedChannel?: (channelId: Id<"channels">) => void;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function NotificationBell({ userId, workspaceId, onAcceptedChannel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const channelInvites = useQuery(
    api.channels.listPendingInvites,
    userId && workspaceId ? { userId, workspaceId } : "skip"
  ) ?? [];

  const hasPushSub = useQuery(
    api.notifications.hasSubscription,
    userId ? { userId } : "skip"
  );

  const savePushSubscription = useMutation(api.notifications.saveSubscription);
  const removePushSubscription = useMutation(api.notifications.removeSubscription);

  const acceptChannelInvite = useMutation(api.channels.acceptInvite);
  const declineChannelInvite = useMutation(api.channels.declineInvite);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (hasPushSub !== undefined) setPushEnabled(hasPushSub);
  }, [hasPushSub]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleTogglePush = useCallback(async () => {
    if (!userId) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription({ endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Please enable notifications in your browser settings.");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray.buffer as ArrayBuffer,
        });
        const sub = subscription.toJSON();
        if (sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
          await savePushSubscription({
            userId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          });
          setPushEnabled(true);
        }
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setPushLoading(false);
    }
  }, [userId, pushEnabled, savePushSubscription, removePushSubscription]);

  const handleAcceptChannel = useCallback(
    async (inviteId: Id<"channelInvites">) => {
      setProcessingId(inviteId);
      try {
        const channelId = await acceptChannelInvite({ inviteId });
        onAcceptedChannel?.(channelId);
      } catch { /* */ } finally { setProcessingId(null); }
    },
    [acceptChannelInvite, onAcceptedChannel]
  );

  const handleDeclineChannel = useCallback(
    async (inviteId: Id<"channelInvites">) => {
      setProcessingId(inviteId);
      try { await declineChannelInvite({ inviteId }); } catch { /* */ } finally { setProcessingId(null); }
    },
    [declineChannelInvite]
  );

  const totalCount = channelInvites.length;

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition relative"
        title="Notifications"
      >
        <Icon name="Bell" className="w-5 h-5 sm:w-4 sm:h-4" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-sm">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
            style={{ right: "max(-0.5rem, calc(-50vw + 50%))" }}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    pushEnabled
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  } disabled:opacity-50`}
                  title={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
                >
                  <Icon name={pushEnabled ? "Bell" : "BellSlash"} className="w-3 h-3" />
                  {pushLoading ? "..." : pushEnabled ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <Icon name="X" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto overscroll-contain">
              {totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Icon name="Bell" className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No pending invites right now.</p>
                </div>
              ) : (
                <ul>
                  {channelInvites.map((inv) => {
                    if (!inv) return null;
                    const isProcessing = processingId === inv._id;
                    return (
                      <li key={inv._id} className="px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                            <Icon name="Envelope" className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold">{inv.invitedByName}</span>{" "}
                              invited you to{" "}
                              <span className="font-semibold text-purple-700">#{inv.channelName}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(inv.createdAt)}</p>
                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                type="button"
                                onClick={() => handleAcceptChannel(inv._id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 transition"
                              >
                                <Icon name="Check" className="w-3 h-3" />
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineChannel(inv._id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition"
                              >
                                <Icon name="X" className="w-3 h-3" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
