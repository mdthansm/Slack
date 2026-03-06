"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChannelView } from "@/components/channel/ChannelView";
import { DirectMessageView } from "@/components/dm/DirectMessageView";
import { HomeView } from "@/components/views/HomeView";
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
      <Sidebar
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={(id) => { setSelectedWorkspaceId(id); setSelected(null); }}
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
    </div>
  );
}
