"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Props = {
  workspaceId: Id<"workspaces">;
};

export function FilesView({ workspaceId }: Props) {
  const channels = useQuery(api.channels.listByWorkspace, { workspaceId }) ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      <div className="p-6 max-w-2xl w-full mx-auto overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Files</h1>
        <p className="text-sm text-gray-400 mb-6">Files shared in your channels and DMs</p>

        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-gray-500">No files yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Files shared in your {channels.length} channel{channels.length !== 1 ? "s" : ""} will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
