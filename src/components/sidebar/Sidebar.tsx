"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { CreateWorkspaceModal } from "../modals/CreateWorkspaceModal";
import { CreateChannelModal } from "../modals/CreateChannelModal";
import { StartDmModal } from "../modals/StartDmModal";
import { BrowseChannelsModal } from "../modals/BrowseChannelsModal";
import { EditWorkspaceModal } from "../modals/EditWorkspaceModal";
import { InviteToSlackModal } from "../modals/InviteToSlackModal";
import { DmListPanel } from "../views/DmListPanel";

type Selected =
  | { type: "channel"; channelId: Id<"channels"> }
  | { type: "dm"; threadId: Id<"directMessageThreads"> }
  | null;

type LeftNav = "home" | "dms" | "activity" | "files";
type SidebarSection = "threads" | "huddles" | "drafts" | "directories" | null;

type Props = {
  selectedWorkspaceId: Id<"workspaces"> | null;
  onSelectWorkspace: (id: Id<"workspaces">) => void;
  selected: Selected;
  onSelectChannel: (id: Id<"channels">) => void;
  onSelectDm: (id: Id<"directMessageThreads">) => void;
  onSelectHome: () => void;
  leftNavActive: LeftNav;
  onLeftNavChange: (nav: LeftNav) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  startDmOpen?: boolean;
  onStartDmOpen?: () => void;
  onStartDmClose?: () => void;
};

export function Sidebar({
  selectedWorkspaceId,
  onSelectWorkspace,
  selected,
  onSelectChannel,
  onSelectDm,
  onSelectHome,
  leftNavActive,
  onLeftNavChange,
  mobileOpen = false,
  onMobileClose,
  startDmOpen,
  onStartDmOpen,
  onStartDmClose,
}: Props) {
  const { userId, user, signOut } = useCurrentUser();
  const [workspaceModal, setWorkspaceModal] = useState(false);
  const [subWorkspaceModal, setSubWorkspaceModal] = useState(false);
  const [channelModal, setChannelModal] = useState(false);
  const [dmModal, setDmModal] = useState(false);
  const dmOpen = startDmOpen !== undefined ? startDmOpen : dmModal;
  const setDmOpen = (open: boolean) => {
    if (onStartDmOpen && onStartDmClose) (open ? onStartDmOpen() : onStartDmClose());
    else setDmModal(open);
  };
  const [browseChannelsOpen, setBrowseChannelsOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [inviteToSlackOpen, setInviteToSlackOpen] = useState(false);
  const [workspaceDropdown, setWorkspaceDropdown] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>(null);

  const workspaces = useQuery(
    api.workspaces.listForUser,
    userId ? { userId } : "skip"
  ) ?? [];
  const channels = useQuery(
    api.channels.listByWorkspace,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  ) ?? [];
  const dmThreads = useQuery(
    api.directMessages.listThreadsWithPreview,
    selectedWorkspaceId && userId
      ? { workspaceId: selectedWorkspaceId, userId }
      : "skip"
  ) ?? [];

  const workspaceMembers = useQuery(
    api.workspaces.listMembers,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  ) ?? [];
  const childWorkspaces = useQuery(
    api.workspaces.listChildren,
    selectedWorkspaceId ? { parentWorkspaceId: selectedWorkspaceId } : "skip"
  ) ?? [];

  const selectedWorkspaceDoc = useQuery(
    api.workspaces.get,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  );
  const currentWorkspace = selectedWorkspaceDoc ?? null;

  const parentWorkspace = useQuery(
    api.workspaces.get,
    currentWorkspace?.parentWorkspaceId
      ? { workspaceId: currentWorkspace.parentWorkspaceId }
      : "skip"
  );

  const isWorkspaceAdmin = useMemo(() => {
    if (!userId || !selectedWorkspaceId) return false;
    if (currentWorkspace?.createdBy === userId) return true;
    return workspaceMembers.some((m) => m.userId === userId && m.role === "admin");
  }, [userId, selectedWorkspaceId, currentWorkspace?.createdBy, workspaceMembers]);

  const setNav = (nav: LeftNav) => {
    onLeftNavChange(nav);
    if (nav === "home" || nav === "dms") onSelectHome();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            aria-hidden
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`flex w-80 max-w-[85vw] shrink-0 bg-[#3f0e40] text-white custom-scrollbar
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out
          md:relative md:z-auto md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navigation"
      >
        {/* Left narrow nav bar */}
        <div className="w-12 md:w-14 flex flex-col items-center py-3 border-r border-white/10 shrink-0">
          <div className="w-10 h-10 rounded-lg border-2 border-white/80 flex items-center justify-center text-white font-bold text-sm mb-4">
            {currentWorkspace?.name?.slice(0, 2).toUpperCase() ?? "My"}
          </div>
          <nav className="flex flex-col items-center gap-1 flex-1">
            <button onClick={() => setNav("home")} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${leftNavActive === "home" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`} title="Home">
              <Icon name="Home" className="w-5 h-5" />
            </button>
            <button onClick={() => setNav("dms")} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${leftNavActive === "dms" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`} title="DMs">
              <Icon name="MessageCircle" className="w-5 h-5" />
            </button>
            <button onClick={() => setNav("activity")} className={`w-10 h-10 rounded-lg flex items-center justify-center transition relative ${leftNavActive === "activity" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`} title="Activity">
              <Icon name="Bell" className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <button onClick={() => setNav("files")} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${leftNavActive === "files" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`} title="Files">
              <Icon name="Folder" className="w-5 h-5" />
            </button>
          </nav>
          <button
            onClick={() => setWorkspaceModal(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-white/40 text-white/90 hover:bg-white/10 transition mt-2"
            title="Add workspace"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </button>
          <div className="mt-3 w-10 h-10 rounded-full bg-[#1164a3] flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
        </div>

        {/* Main sidebar content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#3f0e40] overflow-hidden">
          {/* Back to parent workspace */}
          {currentWorkspace?.parentWorkspaceId && parentWorkspace && (
            <button
              onClick={() => onSelectWorkspace(currentWorkspace.parentWorkspaceId!)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-800/40 text-white/80 hover:bg-purple-800/60 text-xs transition shrink-0"
            >
              <Icon name="ArrowLeft" className="w-3 h-3" />
              <span className="truncate">Back to {parentWorkspace.name}</span>
            </button>
          )}

          {/* Header: workspace name + actions */}
          <div className="h-12 px-2 md:px-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onMobileClose?.()}
                className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/10 text-white shrink-0"
                aria-label="Close menu"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
              <button
                onClick={() => setWorkspaceDropdown(!workspaceDropdown)}
                className="flex items-center gap-1 min-w-0 hover:opacity-90 transition"
              >
                <span className="font-semibold truncate">
                  {currentWorkspace?.name ?? "Select workspace"}
                </span>
                <Icon name="ChevronDown" className="w-4 h-4 shrink-0 text-white/80" />
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0 relative">
              {isWorkspaceAdmin && (
                <button onClick={() => setEditWorkspaceOpen(true)} className="p-2 rounded hover:bg-white/10 transition" title="Edit workspace">
                  <Icon name="Pencil" className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {workspaceDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute left-14 top-12 mt-0 py-1 w-56 bg-[#350d36] rounded-lg shadow-xl border border-white/10 z-50"
              >
                {workspaces.filter(Boolean).map((w) => (
                  <button
                    key={w!._id}
                    onClick={() => {
                      onSelectWorkspace(w!._id);
                      setWorkspaceDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 truncate"
                  >
                    {w!.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setWorkspaceModal(true);
                    setWorkspaceDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2 text-white/80"
                >
                  <Icon name="Plus" className="w-4 h-4" /> Create workspace
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable content: when DMs tab active show full DM list; else show channels + DM list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedWorkspaceId ? (
              leftNavActive === "dms" ? (
                <DmListPanel
                  workspaceId={selectedWorkspaceId}
                  onSelectDm={onSelectDm}
                  onComposeClick={() => setDmOpen(true)}
                  selectedThreadId={selected?.type === "dm" ? selected.threadId : null}
                />
              ) : (
              <>
                <div className="flex-1 overflow-y-auto py-3">
                <div className="px-3 space-y-0.5 mb-4">
                  {(["threads", "huddles", "drafts", "directories"] as const).map((section) => (
                    <button
                      key={section}
                      onClick={() => setSidebarSection(sidebarSection === section ? null : section)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition ${
                        sidebarSection === section ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                      }`}
                    >
                      <Icon name={section === "threads" ? "List" : section === "huddles" ? "Headphones" : section === "drafts" ? "Send" : "UserGroup"} className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{section === "threads" ? "Threads" : section === "huddles" ? "Huddles" : section === "drafts" ? "Drafts & sent" : "Directories"}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-3 px-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 mb-2">
                    <Icon name="Star" className="w-4 h-4 text-white/70" />
                    <span className="text-sm font-medium">Starred</span>
                  </div>
                  <p className="text-xs text-white/50 px-3 py-1">Drag and drop important stuff here</p>
                </div>

                <div className="border-t border-white/10 pt-3 px-3">
                  <div className="flex items-center justify-between px-3 py-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="Hash" className="w-4 h-4 text-white/70" />
                      <span className="text-sm font-medium">Channels</span>
                    </div>
                    {isWorkspaceAdmin && (
                      <button
                        onClick={() => setChannelModal(true)}
                        className="p-1 rounded hover:bg-white/10 transition"
                        title="Create channel"
                      >
                        <Icon name="Plus" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {channels.map((ch) => (
                      <li key={ch._id}>
                        <button
                          onClick={() => onSelectChannel(ch._id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                            selected?.type === "channel" && selected.channelId === ch._id
                              ? "bg-white/20 text-white"
                              : "hover:bg-white/10 text-white/90"
                          }`}
                        >
                          {ch.isPrivate === true ? (
                            <Icon name="Lock" className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Icon name="Hash" className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate text-sm">{ch.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setBrowseChannelsOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded text-white/50 hover:bg-white/10 hover:text-white/70 text-left text-sm">
                    <Icon name="Search" className="w-4 h-4 shrink-0" />
                    Browse all channels
                  </button>
                </div>

                {/* Sub-workspaces */}
                {(childWorkspaces.length > 0 || isWorkspaceAdmin) && (
                  <div className="border-t border-white/10 pt-3 px-3 mt-3">
                    <div className="flex items-center justify-between px-3 py-1 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="Folder" className="w-4 h-4 text-white/70" />
                        <span className="text-sm font-medium">Sub-workspaces</span>
                      </div>
                      {isWorkspaceAdmin && (
                        <button
                          onClick={() => setSubWorkspaceModal(true)}
                          className="p-1 rounded hover:bg-white/10 transition"
                          title="Create sub-workspace"
                        >
                          <Icon name="Plus" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {childWorkspaces.length > 0 ? (
                      <ul className="space-y-0.5">
                        {childWorkspaces.map((sw) => (
                          <li key={sw._id}>
                            <button
                              onClick={() => onSelectWorkspace(sw._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition hover:bg-white/10 text-white/90"
                            >
                              <Icon name="Folder" className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate text-sm">{sw.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-white/50 px-3 py-1">No sub-workspaces yet</p>
                    )}
                  </div>
                )}

                {isWorkspaceAdmin && (
                  <div className="border-t border-white/10 pt-3 px-3 mt-3">
                    <button
                      onClick={() => setInviteToSlackOpen(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white text-left text-sm transition"
                    >
                      <Icon name="Envelope" className="w-4 h-4 shrink-0" />
                      Invite people to Slack
                    </button>
                  </div>
                )}

                <div className="border-t border-white/10 pt-3 px-3 mt-3">
                  <div className="flex items-center justify-between px-3 py-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="UserGroup" className="w-4 h-4 text-white/70" />
                      <span className="text-sm font-medium">Direct messages</span>
                    </div>
                    <button
                      onClick={() => setDmOpen(true)}
                      className="p-1 rounded hover:bg-white/10 transition"
                      title="Start DM"
                    >
                      <Icon name="Plus" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {dmThreads.map((thread) => (
                      <DmThreadItem
                        key={thread.threadId}
                        threadId={thread.threadId}
                        participantIds={thread.participantIds}
                        currentUserId={userId!}
                        isSelected={selected?.type === "dm" && selected.threadId === thread.threadId}
                        onSelect={() => onSelectDm(thread.threadId)}
                        lastBody={thread.lastBody}
                        lastUserName={thread.lastUserName}
                        lastTime={thread.lastTime}
                      />
                    ))}
                  </ul>
                </div>
                </div>
              </>
              )
            ) : (
              <div className="px-4 py-8 text-center text-white/60 text-sm flex-1 overflow-y-auto">
                <p>Select or create a workspace to see channels and DMs.</p>
                <button
                  onClick={() => setWorkspaceModal(true)}
                  className="mt-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium"
                >
                  Create workspace
                </button>
              </div>
            )}
          </div>

          {/* User footer */}
          <div className="p-2 border-t border-white/10 flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#1164a3] flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
              <p className="text-xs text-white/60 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              title="Sign out"
            >
              <Icon name="LogOut" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <CreateWorkspaceModal
        open={workspaceModal}
        onClose={() => setWorkspaceModal(false)}
        onCreated={(id) => {
          onSelectWorkspace(id);
          setWorkspaceModal(false);
        }}
      />
      <CreateChannelModal
        open={channelModal}
        onClose={() => setChannelModal(false)}
        workspaceId={selectedWorkspaceId}
        onCreated={(id) => {
          onSelectChannel(id);
          setChannelModal(false);
        }}
      />
      <StartDmModal
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        workspaceId={selectedWorkspaceId}
        onStarted={(threadId) => {
          onSelectDm(threadId);
          setDmOpen(false);
        }}
      />
      <BrowseChannelsModal
        open={browseChannelsOpen}
        onClose={() => setBrowseChannelsOpen(false)}
        workspaceId={selectedWorkspaceId}
        onSelectChannel={(id) => {
          onSelectChannel(id);
          setBrowseChannelsOpen(false);
        }}
      />
      <EditWorkspaceModal
        open={editWorkspaceOpen}
        onClose={() => setEditWorkspaceOpen(false)}
        workspaceId={selectedWorkspaceId}
        onSaved={() => setEditWorkspaceOpen(false)}
      />
      <InviteToSlackModal
        open={inviteToSlackOpen}
        onClose={() => setInviteToSlackOpen(false)}
        userId={userId}
        workspaceId={selectedWorkspaceId}
      />
      <CreateWorkspaceModal
        open={subWorkspaceModal}
        onClose={() => setSubWorkspaceModal(false)}
        parentWorkspaceId={selectedWorkspaceId}
        parentWorkspaceName={currentWorkspace?.name}
        onCreated={(id) => {
          onSelectWorkspace(id);
          setSubWorkspaceModal(false);
        }}
      />
    </>
  );
}

function formatDmDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) {
    return d.toLocaleDateString([], { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

function DmThreadItem({
  threadId,
  participantIds,
  currentUserId,
  isSelected,
  onSelect,
  lastBody,
  lastUserName,
  lastTime,
}: {
  threadId: Id<"directMessageThreads">;
  participantIds: Id<"users">[];
  currentUserId: Id<"users">;
  isSelected: boolean;
  onSelect: () => void;
  lastBody: string | null;
  lastUserName: string | null;
  lastTime: number | null;
}) {
  const users = useQuery(api.users.list, {});
  const otherIds = participantIds.filter((id) => id !== currentUserId);
  const names = otherIds
    .map((id) => users?.find((u) => u._id === id)?.name ?? "Unknown")
    .join(", ");
  const currentUserName = users?.find((u) => u._id === currentUserId)?.name ?? "You";
  const snippet = lastBody
    ? lastUserName === currentUserName
      ? `You: ${lastBody}`
      : lastBody
    : null;

  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition ${
          isSelected ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/90"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-purple-500/80 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {(names || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{names || "DM"}</span>
            {lastTime != null && (
              <span className="text-xs text-white/60 shrink-0">{formatDmDate(lastTime)}</span>
            )}
          </div>
          {snippet && (
            <p className="text-xs text-white/70 truncate mt-0.5">{snippet}</p>
          )}
        </div>
      </button>
    </li>
  );
}
