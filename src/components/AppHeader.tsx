"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { NotificationBell } from "@/components/notifications/NotificationDropdown";

type Props = {
  workspaceId: Id<"workspaces"> | null;
  onMenuClick?: () => void;
  onSelectChannel?: (channelId: Id<"channels">) => void;
};

export function AppHeader({ workspaceId, onMenuClick, onSelectChannel }: Props) {
  const { userId } = useCurrentUser();
  const workspace = useQuery(
    api.workspaces.get,
    workspaceId ? { workspaceId } : "skip"
  );
  const searchPlaceholder = workspace?.name ? `Search ${workspace.name}` : "Search";

  return (
    <header className="h-12 px-2 sm:px-3 flex items-center gap-2 border-b border-gray-100 bg-white shrink-0">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition"
          aria-label="Open menu"
        >
          <Icon name="Bars" className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 min-w-0 max-w-md">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus-within:bg-white focus-within:border-gray-300 transition">
          <Icon name="Search" className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm"
          />
        </div>
      </div>

      <NotificationBell
        userId={userId}
        workspaceId={workspaceId}
        onAcceptedChannel={onSelectChannel}
      />
    </header>
  );
}
