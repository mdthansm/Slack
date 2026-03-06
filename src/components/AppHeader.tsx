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
    <header className="h-12 px-2 sm:px-4 flex items-center gap-1 sm:gap-4 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            aria-label="Open menu"
          >
            <Icon name="Bars" className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="Back"
        >
          <Icon name="ArrowLeft" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="Forward"
        >
          <Icon name="ArrowRight" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="hidden md:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="Recent"
        >
          <Icon name="Clock" className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 max-w-xl ml-0 sm:ml-2">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-gray-100 border border-transparent focus-within:bg-white focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-300 transition">
            <Icon name="Search" className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          type="button"
          className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition relative"
          title="People"
        >
          <Icon name="UserGroup" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="hidden md:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="Huddles"
        >
          <Icon name="Headphones" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="More"
        >
          <Icon name="ChevronDown" className="w-4 h-4" />
        </button>
        <NotificationBell
          userId={userId}
          workspaceId={workspaceId}
          onAcceptedChannel={onSelectChannel}
        />
        <button
          type="button"
          className="hidden sm:block p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="Search"
        >
          <Icon name="Search" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          title="More options"
        >
          <Icon name="Ellipsis" className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
