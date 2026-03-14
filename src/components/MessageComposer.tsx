"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "@/context/CurrentUserContext";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐"],
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👊","✊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","🫳","🫴","👋","🤏","✍️","💪","🫂"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","♥️","💟"],
  },
  {
    label: "Objects",
    emojis: ["🔥","⭐","🌟","✨","💫","🎉","🎊","🏆","🥇","🎯","💡","📌","📎","✅","❌","⚡","💯","🚀","🎵","🎶","☕","🍕","🍔","🌮","🍿","🎂","🍻","🥂"],
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦄","🐝","🦋","🐌","🐞"],
  },
];

type ReplyContext = {
  userName: string;
  body: string;
};

type Props = {
  placeholder: string;
  channelId?: Id<"channels">;
  threadId?: Id<"directMessageThreads">;
  replyTo?: ReplyContext | null;
  onCancelReply?: () => void;
};

export function MessageComposer({ placeholder, channelId, threadId, replyTo, onCancelReply }: Props) {
  const { userId, user } = useCurrentUser();
  const sendChannel = useMutation(api.messages.send);
  const sendDm = useMutation(api.directMessages.send);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const insertEmoji = useCallback((emoji: string) => {
    setBody((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 25 * 1024 * 1024) {
        alert("File size must be under 25MB");
        return;
      }
      setFile(selected);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !user || (!body.trim() && !file)) return;
    let trimmed = body.trim();

    if (replyTo) {
      const preview = replyTo.body.length > 60 ? replyTo.body.slice(0, 60) + "…" : replyTo.body;
      trimmed = `> ${replyTo.userName}: ${preview}\n${trimmed}`;
      onCancelReply?.();
    }

    setBody("");
    setLoading(true);
    try {
      let fileStorageId: Id<"_storage"> | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;
      let fileSize: number | undefined;

      if (file) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        fileStorageId = storageId;
        fileName = file.name;
        fileType = file.type;
        fileSize = file.size;
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      if (channelId) {
        await sendChannel({
          channelId,
          userId,
          body: trimmed || (fileName ? `📎 ${fileName}` : ""),
          userName: user.name,
          userImageUrl: user.imageUrl ?? "",
          fileStorageId,
          fileName,
          fileType,
          fileSize,
        });
      } else if (threadId) {
        await sendDm({
          threadId,
          userId,
          body: trimmed || (fileName ? `📎 ${fileName}` : ""),
          userName: user.name,
          userImageUrl: user.imageUrl ?? "",
          fileStorageId,
          fileName,
          fileType,
          fileSize,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Reply context banner */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200 text-sm">
            <Icon name="Reply" className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-indigo-600 font-medium shrink-0">Replying to {replyTo.userName}</span>
            <span className="text-indigo-400 truncate">{replyTo.body}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
          >
            <Icon name="X" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700 max-w-full min-w-0">
            <Icon name="Paperclip" className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="text-xs text-blue-400 shrink-0">
              ({(file.size / 1024).toFixed(0)}KB)
            </span>
            <button
              type="button"
              onClick={removeFile}
              className="ml-1 p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition shrink-0"
            >
              <Icon name="X" className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-1.5 items-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-400 transition shrink-0"
          title="Attach file"
        >
          <Icon name="Paperclip" className="w-4 h-4" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? `Reply to ${replyTo.userName}...` : placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white outline-none transition"
          disabled={loading}
        />

        {/* Emoji picker */}
        <div className="relative shrink-0" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((s) => !s)}
            className={`p-2.5 rounded-lg transition ${
              showEmojiPicker
                ? "bg-amber-50 text-amber-500"
                : "hover:bg-gray-100 active:bg-gray-200 text-gray-400"
            }`}
            title="Emoji"
          >
            <Icon name="Smile" className="w-4 h-4" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 w-[320px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
              {/* Category tabs */}
              <div className="flex border-b border-gray-100 px-1 pt-1 gap-0.5 overflow-x-auto">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setEmojiCategory(idx)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition ${
                      emojiCategory === idx
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="p-2 h-[200px] overflow-y-auto">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-90 text-xl transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!body.trim() && !file)}
          className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
        >
          <Icon name="Send" className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
