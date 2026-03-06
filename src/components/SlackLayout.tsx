"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChannelView } from "@/components/channel/ChannelView";
import { DirectMessageView } from "@/components/dm/DirectMessageView";
import { HomeView } from "@/components/views/HomeView";
import { DmListPanel } from "@/components/views/DmListPanel";
import { ActivityView } from "@/components/views/ActivityView";
import { FilesView } from "@/components/views/FilesView";
import { AppHeader } from "@/components/AppHeader";
import type { Id } from "../../convex/_generated/dataModel";

type Selected = { type: "channel"; channelId: Id<"channels"> } | { type: "dm"; threadId: Id<"directMessageThreads"> };
type LeftNav = "home" | "dms" | "activity" | "files";

export function SlackLayout() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<Id<"workspaces"> | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [leftNavActive, setLeftNavActive] = useState<LeftNav>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDmOpen, setStartDmOpen] = useState(false);

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
    <div className="flex h-screen bg-[#f8f8f8] overflow-hidden">
      <Sidebar
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={(id) => {
          setSelectedWorkspaceId(id);
          setSelected(null);
        }}
        selected={selected}
        onSelectChannel={handleSelectChannel}
        onSelectDm={handleSelectDm}
        onSelectHome={handleSelectHome}
        leftNavActive={leftNavActive}
        onLeftNavChange={setLeftNavActive}
        mobileOpen={sidebarOpen}
        onMobileClose={closeSidebar}
        startDmOpen={startDmOpen}
        onStartDmOpen={() => setStartDmOpen(true)}
        onStartDmClose={() => setStartDmOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0 bg-white min-h-0">
        <AppHeader
          workspaceId={selectedWorkspaceId}
          onMenuClick={() => setSidebarOpen((o) => !o)}
          onSelectChannel={handleSelectChannel}
        />
        <AnimatePresence mode="wait">
          {selected?.type === "channel" && selectedWorkspaceId && (
            <motion.div
              key={`channel-${selected.channelId}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <ChannelView
                workspaceId={selectedWorkspaceId}
                channelId={selected.channelId}
              />
            </motion.div>
          )}
          {/* DMs view: main area = only thread or empty (DM list is inside Sidebar) */}
          {leftNavActive === "dms" && selectedWorkspaceId && (
            <motion.div
              key="dms-main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-w-0 min-h-0"
            >
              {selected?.type === "dm" ? (
                <DirectMessageView
                  workspaceId={selectedWorkspaceId}
                  threadId={selected.threadId}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white text-gray-500 min-w-0">
                  <p className="text-lg font-medium text-gray-700">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the list in the sidebar.</p>
                </div>
              )}
            </motion.div>
          )}
          {/* DM selected but not on DMs tab (e.g. from Home): full-width thread */}
          {selected?.type === "dm" && selectedWorkspaceId && leftNavActive !== "dms" && (
            <motion.div
              key={`dm-full-${selected.threadId}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <DirectMessageView
                workspaceId={selectedWorkspaceId}
                threadId={selected.threadId}
              />
            </motion.div>
          )}
          {!selected && selectedWorkspaceId && leftNavActive !== "dms" && (
            <motion.div
              key="nav-views"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {leftNavActive === "home" && (
                <HomeView
                  workspaceId={selectedWorkspaceId}
                  onSelectChannel={handleSelectChannel}
                  onSelectDm={handleSelectDm}
                />
              )}
              {leftNavActive === "activity" && (
                <ActivityView
                  workspaceId={selectedWorkspaceId}
                  onSelectChannel={handleSelectChannel}
                />
              )}
              {leftNavActive === "files" && <FilesView workspaceId={selectedWorkspaceId} />}
            </motion.div>
          )}
          {!selected && !selectedWorkspaceId && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center bg-[#f8f8f8] px-4 sm:px-6 py-8"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Welcome to Slack Clone</h1>
              <p className="text-gray-600 text-center text-sm sm:text-base max-w-md">
                Select or create a workspace from the sidebar to get started.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
