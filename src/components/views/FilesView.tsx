"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/icons/FontAwesomeIcons";

type Props = {
  workspaceId: Id<"workspaces">;
};

export function FilesView({ workspaceId }: Props) {
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];
  const channelCount = channels.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f8f8] overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="Folder" className="w-5 h-5 text-purple-500" />
          Files
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Files shared in your channels and DMs</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Icon name="Folder" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No files yet</p>
          <p className="text-sm text-gray-500 mt-1">
            When files are shared in your {channelCount} channel{channelCount !== 1 ? "s" : ""}, they’ll appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
