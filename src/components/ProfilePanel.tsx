"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { SetStatusModal } from "@/components/ProfilePopup";
import type { Id } from "../../convex/_generated/dataModel";

type UserStatus = { emoji: string; text: string } | null;

function formatLocalTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " local time";
}

type ProfilePanelProps = {
  userName: string;
  imageUrl?: string;
  email: string;
  isOnline: boolean;
  status: UserStatus;
  userId: Id<"users">;
  onClose: () => void;
};

export function ProfilePanel({
  userName,
  imageUrl,
  email,
  isOnline,
  status,
  userId,
  onClose,
}: ProfilePanelProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateProfileImage = useMutation(api.users.updateProfileImage);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await updateProfileImage({ userId, storageId });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col w-full md:w-[360px] md:shrink-0 h-full bg-white text-gray-900 border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <h2 className="font-bold text-base text-gray-900">Profile</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
          aria-label="Close"
        >
          <Icon name="X" className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-4 px-4">
        {/* Profile picture - dark blue card with white circular avatar */}
        <div className="relative w-full h-[220px] rounded-xl overflow-hidden bg-[#2d3748] mb-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={userName}
              className="w-full h-full object-contain object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center">
                <Icon name="User" className="w-14 h-14 text-gray-400" />
              </div>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-sm text-white">Uploading…</span>
            </div>
          )}
          {/* Upload Photo button - top right of avatar card */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition shadow-sm"
          >
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
          {/* Single-Channel Guest badge */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800/90 px-3 py-2 flex items-center justify-between rounded-b-xl">
            <span className="text-xs text-white">▲ Single-Channel Guest</span>
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10 text-white/70"
              title="Help"
            >
              <Icon name="CircleQuestion" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Name and Edit */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-lg text-gray-900">{userName}</h3>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Edit
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          />
          <span className="text-sm text-gray-700">
            ▲ {status ? `${status.emoji} ${status.text}` : "Active"}
          </span>
        </div>

        {/* Local time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Icon name="Clock" className="w-4 h-4 shrink-0" />
          <span>{formatLocalTime()}</span>
        </div>

        {/* Action buttons - white with black border */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 transition"
          >
            Set a status
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleUploadPhoto}
          disabled={uploading}
        />

        {/* Profile information */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Display name
            </p>
            <p className="text-sm text-gray-900">{userName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Local time
            </p>
            <p className="text-sm text-gray-900">{formatLocalTime()}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Email address
            </p>
            <a
              href={`mailto:${email}`}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              {email}
            </a>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <SetStatusModal
          userId={userId}
          currentStatus={status}
          onCloseAction={() => setShowStatusModal(false)}
          onSavedAction={() => setShowStatusModal(false)}
        />
      )}
    </div>
  );
}
