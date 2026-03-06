"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/icons/FontAwesomeIcons";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: Id<"users"> | null;
  workspaceId: Id<"workspaces"> | null;
};

export function InviteToSlackModal({ open, onClose, userId, workspaceId }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendInvite = useAction(api.email.sendInvite);
  const sentInvites =
    useQuery(api.appInvites.listSentByUser, userId ? { userId } : "skip") ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !workspaceId || !email.trim()) return;
    setError("");
    setSuccess("");
    setSending(true);
    try {
      const result = await sendInvite({
        email: email.trim(),
        invitedByUserId: userId,
        workspaceId,
        role,
      });
      if (result.sent) {
        setSuccess(`Invite email sent to ${email.trim()}`);
      } else {
        setSuccess(`Invite saved (email: ${result.reason || "not configured"})`);
      }
      setEmail("");
      setRole("member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send invite.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white rounded-xl shadow-xl max-h-[85vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Invite people to Slack
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Send an invite by email. When they sign up, they'll be
              automatically added to your workspace.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                  <Icon
                    name="Envelope"
                    className="w-4 h-4 text-gray-400 shrink-0"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    placeholder="name@example.com"
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Role:</span>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRole("member")}
                    className={`px-4 py-1.5 text-sm font-medium transition ${
                      role === "member"
                        ? "bg-purple-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`px-4 py-1.5 text-sm font-medium transition border-l border-gray-300 ${
                      role === "admin"
                        ? "bg-purple-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || !email.trim() || !workspaceId}
                className="w-full px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {sending ? "Sending\u2026" : "Send invite"}
              </button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <Icon name="Check" className="w-3.5 h-3.5" />
                {success}
              </p>
            )}

            {sentInvites.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Sent invites
                </h4>
                <ul className="space-y-1">
                  {sentInvites.map((inv) => (
                    <li
                      key={inv._id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-gray-50"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                          {inv.email[0]?.toUpperCase() ?? "?"}
                        </span>
                        <span className="min-w-0">
                          <span className="text-sm text-gray-900 truncate block">
                            {inv.email}
                          </span>
                          <span className="text-xs text-gray-400">
                            {inv.role === "admin" ? "Admin" : "Member"}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.hasSignedUp
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {inv.hasSignedUp ? "Joined" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
