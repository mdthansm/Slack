"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import type { Id } from "../../convex/_generated/dataModel";

type UserStatus = { emoji: string; text: string } | null;

const STATUS_PRESETS = [
  { emoji: "📅", text: "In a meeting", duration: 30 },
  { emoji: "🍽️", text: "Lunch", duration: 60 },
  { emoji: "🤒", text: "Out sick", duration: 1440 },
  { emoji: "🔕", text: "Do Not Disturb", duration: 60 },
  { emoji: "☕", text: "On Break", duration: 30 },
  { emoji: "🏠", text: "Working from home", duration: 480 },
  { emoji: "🚗", text: "Commuting", duration: 60 },
  { emoji: "🎯", text: "Focus time", duration: 120 },
];

function formatLocalTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " local time";
}

type ProfilePopupProps = {
  userName: string;
  imageUrl?: string;
  isOnline: boolean;
  status: UserStatus;
  isSelf: boolean;
  userId: Id<"users">;
  onCloseAction: () => void;
  anchorRect: DOMRect | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  placeAbove?: boolean;
  onStatusModalOpenChange?: (open: boolean) => void;
  onProfileClick?: () => void;
};

export function ProfilePopup({
  userName,
  imageUrl,
  isOnline,
  status,
  isSelf,
  userId,
  onCloseAction: onClose,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
  placeAbove,
  onStatusModalOpenChange,
  onProfileClick,
}: ProfilePopupProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (showStatusModal) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose, showStatusModal]);

  const updateProfileImage = useMutation(api.users.updateProfileImage);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSelf) return;
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

  const popupStyle: React.CSSProperties = {};
  if (anchorRect) {
    popupStyle.position = "fixed";
    if (placeAbove) {
      popupStyle.bottom = window.innerHeight - anchorRect.top + 4;
      popupStyle.top = "auto";
    } else {
      popupStyle.top = anchorRect.bottom + 4;
    }
    popupStyle.left = anchorRect.left;
    popupStyle.zIndex = 60;
  }

  return (
    <>
      <div
        ref={popupRef}
        style={popupStyle}
        className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Header - matches image: large avatar, name + green triangle, local time */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={userName}
                  className="w-16 h-16 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{userName}</span>
                {isSelf && (
                  <>
                    <span className="text-gray-400 font-normal">(you)</span>
                    <span
                      className={`w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent shrink-0 ${
                        isOnline ? "border-b-green-500" : "border-b-red-500"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </>
                )}
              </p>
              {status && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  <span className="mr-1">{status.emoji}</span>
                  {status.text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Local time */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Icon name="Clock" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{formatLocalTime()}</span>
          </div>
        </div>

        {/* Action buttons */}
        {isSelf && (
          <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
            <button
              onClick={() => {
                setShowStatusModal(true);
                onStatusModalOpenChange?.(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition text-left border border-transparent hover:border-gray-100"
            >
              <Icon name="Smile" className="w-4 h-4 text-gray-400 shrink-0" />
              {status ? "Update status" : "Set a status"}
            </button>
            <label className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition text-left border border-transparent hover:border-gray-100 cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleUploadPhoto}
                disabled={uploading}
              />
              <Icon name="Image" className="w-4 h-4 text-gray-400 shrink-0" />
              {uploading ? "Uploading…" : "Upload photo"}
            </label>
            {onProfileClick && (
              <button
                onClick={() => {
                  onProfileClick();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition text-left border border-transparent hover:border-gray-100"
              >
                <Icon name="User" className="w-4 h-4 text-gray-400 shrink-0" />
                Profile
              </button>
            )}
          </div>
        )}
      </div>

      {showStatusModal && (
        <SetStatusModal
          userId={userId}
          currentStatus={status}
          onCloseAction={() => {
            setShowStatusModal(false);
            onStatusModalOpenChange?.(false);
          }}
          onSavedAction={() => {
            setShowStatusModal(false);
            onStatusModalOpenChange?.(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

export type SetStatusModalProps = {
  userId: Id<"users">;
  currentStatus: UserStatus;
  onCloseAction: () => void;
  onSavedAction: () => void;
};

export function SetStatusModal({ userId, currentStatus, onCloseAction: onClose, onSavedAction: onSaved }: SetStatusModalProps) {
  const setStatusMutation = useMutation(api.status.setStatus);
  const clearStatusMutation = useMutation(api.status.clearStatus);
  const [customEmoji, setCustomEmoji] = useState(currentStatus?.emoji ?? "");
  const [customText, setCustomText] = useState(currentStatus?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const QUICK_EMOJIS = ["😀", "😊", "🎯", "📅", "🍽️", "🤒", "🔕", "☕", "🏠", "🚗", "💻", "🎵", "✈️", "🏖️", "📚", "💪"];

  const handlePreset = async (preset: (typeof STATUS_PRESETS)[0]) => {
    setSaving(true);
    setSelectedPreset(preset.text);
    try {
      await setStatusMutation({
        userId,
        statusEmoji: preset.emoji,
        statusText: preset.text,
        durationMinutes: preset.duration,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSave = async () => {
    if (!customText.trim()) return;
    setSaving(true);
    try {
      await setStatusMutation({
        userId,
        statusEmoji: customEmoji || "💬",
        statusText: customText.trim(),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await clearStatusMutation({ userId });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} minutes`;
    if (mins === 60) return "1 hour";
    if (mins < 1440) return `${Math.floor(mins / 60)} hours`;
    return "Today";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Set a status</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        {/* Custom input */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <button
              type="button"
              onClick={() => setShowEmojiGrid((s) => !s)}
              className="text-lg hover:bg-gray-100 rounded p-0.5 transition shrink-0"
            >
              {customEmoji || "😀"}
            </button>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="What's your status?"
              className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
            />
          </div>

          {showEmojiGrid && (
            <div className="mt-2 grid grid-cols-8 gap-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setCustomEmoji(em);
                    setShowEmojiGrid(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-lg transition"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Presets - matches image layout */}
        <div className="px-5 pb-4">
          <div className="space-y-0.5 max-h-52 overflow-y-auto">
            {STATUS_PRESETS.map((preset) => (
              <button
                key={preset.text}
                onClick={() => handlePreset(preset)}
                disabled={saving}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition group disabled:opacity-50 ${
                  selectedPreset === preset.text
                    ? "bg-blue-100 border border-blue-200"
                    : "hover:bg-blue-50 active:bg-blue-100 border border-transparent"
                }`}
              >
                <span className="text-lg shrink-0">{preset.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{preset.text}</span>
                  <span className="text-xs text-gray-400 ml-1.5">— {formatDuration(preset.duration)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          {currentStatus && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Clear status
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCustomSave}
            disabled={saving || !customText.trim()}
            className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 transition"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
