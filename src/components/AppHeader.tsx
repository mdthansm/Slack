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
  onProfileClick?: () => void;
};

export function AppHeader({ workspaceId, onMenuClick, onSelectChannel, onProfileClick }: Props) {
  const { userId, user } = useCurrentUser();
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

      <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
        <NotificationBell
          userId={userId}
          workspaceId={workspaceId}
          onAcceptedChannel={onSelectChannel}
        />
        {userId && onProfileClick && (
          <button
            type="button"
            onClick={onProfileClick}
            className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-gray-200 focus:ring-gray-300 focus:outline-none transition-all active:scale-95"
            aria-label="Open profile"
            title="Profile"
          >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.name ?? "Profile"}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <span
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-700 text-white text-sm font-semibold border border-gray-200 shrink-0"
              aria-hidden
            >
              {(user?.name?.trim().charAt(0) ?? "?").toUpperCase()}
            </span>
          )}
          </button>
        )}
      </div>
    </header>
  );
}
