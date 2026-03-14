"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChannelView } from "@/components/channel/ChannelView";
import { DirectMessageView } from "@/components/dm/DirectMessageView";
import { HomeView } from "@/components/views/HomeView";
import { ActivityView } from "@/components/views/ActivityView";
import { FilesView } from "@/components/views/FilesView";
import { AppHeader } from "@/components/AppHeader";
import { BrowserNotifier } from "@/components/notifications/BrowserNotifier";
import { ProfilePanel } from "@/components/ProfilePanel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Selected = { type: "channel"; channelId: Id<"channels"> } | { type: "dm"; threadId: Id<"directMessageThreads"> };
type LeftNav = "home" | "dms" | "activity" | "files";

export function SlackLayout() {
  const { userId } = useCurrentUser();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [leftNavActive, setLeftNavActive] = useState<LeftNav>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  const presenceHeartbeat = useMutation(api.presence.heartbeat);
  const heartbeatRef = useRef(false);
  const workspaces = useQuery(
    api.workspaces.listForUser,
    userId ? { userId } : "skip"
  ) ?? [];
  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const onlineMap = useQuery(
    api.presence.getOnlineUserIds,
    userId ? { userIds: [userId] } : "skip"
  );
  const statusMap = useQuery(
    api.status.getStatusForUsers,
    userId ? { userIds: [userId] } : "skip"
  );
  const isOnline = userId ? onlineMap?.[userId] : false;
  const userStatus = userId ? statusMap?.[userId] ?? null : null;

  useEffect(() => {
    if (!userId || heartbeatRef.current) return;
    heartbeatRef.current = true;
    presenceHeartbeat({ userId });
    const interval = setInterval(() => {
      presenceHeartbeat({ userId });
    }, 30_000);
    return () => { clearInterval(interval); heartbeatRef.current = false; };
  }, [userId, presenceHeartbeat]);

  // When logged in and workspaces load: show user's own workspace first, or any workspace they're in
  useEffect(() => {
    if (!userId || workspaces.length === 0 || selectedWorkspaceId !== null) return;
    const own = workspaces.find((w) => w?.createdBy === userId);
    const first = workspaces[0];
    const toSelect = own ?? first;
    if (toSelect?._id) setSelectedWorkspaceId(toSelect._id);
  }, [userId, workspaces, selectedWorkspaceId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleSelectChannel = useCallback((channelId: Id<"channels">) => {
    setSelected({ type: "channel", channelId });
    setSidebarOpen(false);
  }, []);
  const handleSelectDm = useCallback((threadId: Id<"directMessageThreads">) => {
    setSelected({ type: "dm", threadId });
    setSidebarOpen(false);
  }, []);
  const handleSelectHome = useCallback(() => {
    setSelected(null);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <BrowserNotifier workspaceId={selectedWorkspaceId} userId={userId} />
      <Sidebar
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspaceAction={(id) => { setSelectedWorkspaceId(id); setSelected(null); }}
        selected={selected}
        onSelectChannelAction={handleSelectChannel}
        onSelectDmAction={handleSelectDm}
        onSelectHomeAction={handleSelectHome}
        leftNavActive={leftNavActive}
        onLeftNavChangeAction={setLeftNavActive}
        mobileOpen={sidebarOpen}
        onMobileClose={closeSidebar}
        startDmOpen={startDmOpen}
        onStartDmOpen={() => setStartDmOpen(true)}
        onStartDmClose={() => setStartDmOpen(false)}
        onProfileClick={() => setProfilePanelOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white min-h-0">
        <AppHeader
          workspaceId={selectedWorkspaceId}
          onMenuClick={() => setSidebarOpen((o) => !o)}
          onSelectChannel={handleSelectChannel}
          onProfileClick={() => setProfilePanelOpen(true)}
        />
        <AnimatePresence mode="wait">
          {selected?.type === "channel" && selectedWorkspaceId && (
            <motion.div key={`channel-${selected.channelId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
              <ChannelView workspaceId={selectedWorkspaceId} channelId={selected.channelId} />
            </motion.div>
          )}
          {selected?.type === "dm" && selectedWorkspaceId && (
            <motion.div key={`dm-${selected.threadId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
              <DirectMessageView workspaceId={selectedWorkspaceId} threadId={selected.threadId} />
            </motion.div>
          )}
          {!selected && selectedWorkspaceId && (
            <motion.div key="views" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
              {leftNavActive === "home" && <HomeView workspaceId={selectedWorkspaceId} onSelectChannel={handleSelectChannel} onSelectDm={handleSelectDm} />}
              {leftNavActive === "dms" && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-4">
                  <p className="font-medium text-gray-600">Select a conversation</p>
                  <p className="text-sm mt-1 text-center">Choose a conversation from the sidebar.</p>
                </div>
              )}
              {leftNavActive === "activity" && <ActivityView workspaceId={selectedWorkspaceId} onSelectChannel={handleSelectChannel} />}
              {leftNavActive === "files" && <FilesView workspaceId={selectedWorkspaceId} />}
            </motion.div>
          )}
          {!selected && !selectedWorkspaceId && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-6 py-8">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 text-center">Welcome to Slack Clone</h1>
              <p className="text-gray-500 text-sm text-center max-w-sm">Select or create a workspace from the sidebar to get started.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {profilePanelOpen && userId && user && (
        <div className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto flex md:block">
          {/* Mobile: backdrop */}
          <div
            className="absolute inset-0 bg-black/40 md:hidden"
            aria-hidden
            onClick={() => setProfilePanelOpen(false)}
          />
          {/* Panel: full-width slide on mobile, side panel on desktop */}
          <div className="relative ml-auto w-full max-w-[360px] h-full md:ml-0 md:w-[360px] md:shrink-0 bg-white shadow-xl md:shadow-none">
            <ProfilePanel
              userName={user.name}
              imageUrl={user.imageUrl}
              email={user.email}
              isOnline={!!isOnline}
              status={userStatus}
              userId={userId}
              onClose={() => setProfilePanelOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
