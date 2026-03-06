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
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            aria-hidden
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          flex flex-col w-[280px] max-w-[85vw] shrink-0 bg-[#1a1d21] text-white
          fixed inset-y-0 left-0 z-50
          transition-transform duration-250 ease-out
          md:relative md:z-auto md:translate-x-0 md:w-64 lg:w-72
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Navigation"
      >
        {/* Workspace header */}
        <div className="h-12 px-3 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onMobileClose?.()}
              className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/10 text-white shrink-0 active:bg-white/20"
              aria-label="Close menu"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
            <button
              onClick={() => setWorkspaceDropdown(!workspaceDropdown)}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-90 transition active:opacity-70"
            >
              <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {currentWorkspace?.name?.charAt(0).toUpperCase() ?? "S"}
              </div>
              <span className="font-semibold text-sm truncate">
                {currentWorkspace?.name ?? "Select workspace"}
              </span>
              <Icon name="ChevronDown" className="w-3 h-3 shrink-0 text-white/60" />
            </button>
          </div>
          {isWorkspaceAdmin && (
            <button
              onClick={() => setEditWorkspaceOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition"
              title="Edit workspace"
            >
              <Icon name="Pencil" className="w-3.5 h-3.5 text-white/70" />
            </button>
          )}
        </div>

        {/* Workspace dropdown */}
        <AnimatePresence>
          {workspaceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-2 right-2 top-12 mt-1 py-1 bg-[#222529] rounded-lg shadow-xl border border-white/10 z-50 max-h-[50vh] overflow-y-auto"
            >
              {workspaces.filter(Boolean).map((w) => (
                <button
                  key={w!._id}
                  onClick={() => {
                    onSelectWorkspace(w!._id);
                    setWorkspaceDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 active:bg-white/20 truncate flex items-center gap-2 ${
                    w!._id === selectedWorkspaceId ? "text-white bg-white/5" : "text-white/80"
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-purple-600/80 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {w!.name.charAt(0).toUpperCase()}
                  </div>
                  {w!.name}
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1">
                <button
                  onClick={() => {
                    setWorkspaceModal(true);
                    setWorkspaceDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 active:bg-white/20 flex items-center gap-2 text-white/60"
                >
                  <Icon name="Plus" className="w-4 h-4" /> Create workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to parent */}
        {currentWorkspace?.parentWorkspaceId && parentWorkspace && (
          <button
            onClick={() => onSelectWorkspace(currentWorkspace.parentWorkspaceId!)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 active:bg-white/10 transition shrink-0"
          >
            <Icon name="ArrowLeft" className="w-3 h-3" />
            Back to {parentWorkspace.name}
          </button>
        )}

        {/* Nav tabs */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10 shrink-0">
          {([
            { key: "home" as const, icon: "Home" as const, label: "Home" },
            { key: "dms" as const, icon: "MessageCircle" as const, label: "DMs" },
            { key: "activity" as const, icon: "Bell" as const, label: "Activity" },
          ]).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setNav(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition active:scale-95 ${
                leftNavActive === key
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 active:bg-white/15"
              }`}
            >
              <Icon name={icon} className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
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
              <div className="flex-1 overflow-y-auto py-2 overscroll-contain">
                {/* Channels */}
                <div className="px-2 mb-1">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Channels</span>
                    {isWorkspaceAdmin && (
                      <button
                        onClick={() => setChannelModal(true)}
                        className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition text-white/50"
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
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition active:scale-[0.98] ${
                            selected?.type === "channel" && selected.channelId === ch._id
                              ? "bg-[#1164a3] text-white"
                              : "text-white/70 hover:bg-white/10 active:bg-white/15"
                          }`}
                        >
                          {ch.isPrivate ? (
                            <Icon name="Lock" className="w-4 h-4 shrink-0 opacity-60" />
                          ) : (
                            <Icon name="Hash" className="w-4 h-4 shrink-0 opacity-60" />
                          )}
                          <span className="truncate">{ch.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setBrowseChannelsOpen(true)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/40 hover:bg-white/10 active:bg-white/15 text-left text-sm mt-0.5"
                  >
                    <Icon name="Plus" className="w-4 h-4 shrink-0" />
                    Browse channels
                  </button>
                </div>

                {/* Sub-workspaces */}
                {(childWorkspaces.length > 0 || isWorkspaceAdmin) && (
                  <div className="px-2 mt-3">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Sub-workspaces</span>
                      {isWorkspaceAdmin && (
                        <button
                          onClick={() => setSubWorkspaceModal(true)}
                          className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition text-white/50"
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
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition text-white/70 hover:bg-white/10 active:bg-white/15"
                            >
                              <Icon name="Folder" className="w-4 h-4 shrink-0 opacity-60" />
                              <span className="truncate">{sw.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-white/30 px-2.5 py-1.5">No sub-workspaces yet</p>
                    )}
                  </div>
                )}

                {/* Invite */}
                {isWorkspaceAdmin && (
                  <div className="px-2 mt-3">
                    <button
                      onClick={() => setInviteToSlackOpen(true)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/50 hover:bg-white/10 active:bg-white/15 text-left text-sm transition"
                    >
                      <Icon name="Envelope" className="w-4 h-4 shrink-0" />
                      Invite people
                    </button>
                  </div>
                )}

                {/* Direct messages */}
                <div className="px-2 mt-3">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Direct messages</span>
                    <button
                      onClick={() => setDmOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition text-white/50"
                      title="New message"
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
            )
          ) : (
            <div className="px-4 py-12 text-center text-white/40 text-sm flex-1 overflow-y-auto">
              <p>Select or create a workspace to get started.</p>
              <button
                onClick={() => setWorkspaceModal(true)}
                className="mt-4 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-sm font-medium transition"
              >
                Create workspace
              </button>
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="px-3 py-2.5 border-t border-white/10 flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
            <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition text-white/50"
            title="Sign out"
          >
            <Icon name="LogOut" className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Modals */}
      <CreateWorkspaceModal open={workspaceModal} onClose={() => setWorkspaceModal(false)} onCreated={(id) => { onSelectWorkspace(id); setWorkspaceModal(false); }} />
      <CreateChannelModal open={channelModal} onClose={() => setChannelModal(false)} workspaceId={selectedWorkspaceId} onCreated={(id) => { onSelectChannel(id); setChannelModal(false); }} />
      <StartDmModal open={dmOpen} onClose={() => setDmOpen(false)} workspaceId={selectedWorkspaceId} onStarted={(threadId) => { onSelectDm(threadId); setDmOpen(false); }} />
      <BrowseChannelsModal open={browseChannelsOpen} onClose={() => setBrowseChannelsOpen(false)} workspaceId={selectedWorkspaceId} onSelectChannel={(id) => { onSelectChannel(id); setBrowseChannelsOpen(false); }} />
      <EditWorkspaceModal open={editWorkspaceOpen} onClose={() => setEditWorkspaceOpen(false)} workspaceId={selectedWorkspaceId} onSaved={() => setEditWorkspaceOpen(false)} />
      <InviteToSlackModal open={inviteToSlackOpen} onClose={() => setInviteToSlackOpen(false)} userId={userId} workspaceId={selectedWorkspaceId} />
      <CreateWorkspaceModal open={subWorkspaceModal} onClose={() => setSubWorkspaceModal(false)} parentWorkspaceId={selectedWorkspaceId} parentWorkspaceName={currentWorkspace?.name} onCreated={(id) => { onSelectWorkspace(id); setSubWorkspaceModal(false); }} />
    </>
  );
}

function DmThreadItem({
  threadId,
  participantIds,
  currentUserId,
  isSelected,
  onSelect,
  lastBody,
  lastUserName,
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
    ? lastUserName === currentUserName ? `You: ${lastBody}` : lastBody
    : null;

  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition active:scale-[0.98] ${
          isSelected ? "bg-[#1164a3] text-white" : "text-white/70 hover:bg-white/10 active:bg-white/15"
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-[10px] font-bold shrink-0">
          {(names || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="truncate block">{names || "DM"}</span>
          {snippet && <p className="text-xs text-white/40 truncate">{snippet}</p>}
        </div>
      </button>
    </li>
  );
}
