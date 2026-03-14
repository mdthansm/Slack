"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/icons/FontAwesomeIcons";

type Props = {
  workspaceId: Id<"workspaces">;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFileIcon(type: string): "FileImage" | "FileVideo" | "FileAudio" | "FilePdf" | "File" {
  if (type.startsWith("image/")) return "FileImage";
  if (type.startsWith("video/")) return "FileVideo";
  if (type.startsWith("audio/")) return "FileAudio";
  if (type.includes("pdf")) return "FilePdf";
  return "File";
}

export function FilesView({ workspaceId }: Props) {
  const files = useQuery(api.files.listFilesForWorkspace, { workspaceId }) ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-2xl w-full mx-auto overflow-y-auto overscroll-contain flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Files</h1>
        <p className="text-sm text-gray-400 mb-5 sm:mb-6">Files shared in your channels and DMs</p>

        {files.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="Folder" className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No files yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Files shared in channels and DMs will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => {
              const isImage = file.fileType.startsWith("image/");
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition group"
                >
                  {isImage && file.fileUrl ? (
                    <img
                      src={file.fileUrl}
                      alt={file.fileName}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon name={getFileIcon(file.fileType)} className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.fileSize)} &middot; {file.sharedBy} &middot; {file.context} &middot; {formatDate(file.sharedAt)}
                    </p>
                  </div>
                  {file.fileUrl && (
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition opacity-0 group-hover:opacity-100 shrink-0"
                      title="Download"
                    >
                      <Icon name="Download" className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
