"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/context/CurrentUserContext";
import { Icon } from "@/components/icons/FontAwesomeIcons";

type Mode = "signup" | "signin";

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { signUp, signIn } = useCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Email is required.");
      return;
    }
    if (mode === "signup") {
      if (!name.trim()) {
        setError("Display name is required.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    } else {
      if (!password) {
        setError("Password is required.");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(name.trim(), emailTrimmed, password);
        setSignUpSuccess(true);
        setMode("signin");
        setPassword("");
        setError("");
      } else {
        await signIn(emailTrimmed, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.includes("Connection lost") || msg.includes("in flight")) {
        setError("Connection was lost. Please check your network and try again.");
      } else if (msg.includes("already exists") || msg.includes("Sign in instead")) {
        setError("This email is already registered. Sign in with your password below.");
        setMode("signin");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setError("");
    setSignUpSuccess(false);
    setMode((m) => (m === "signup" ? "signin" : "signup"));
    if (mode === "signup") setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/80 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4"
            >
              <Icon name="MessageCircle" className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Slack Clone</h1>
            <p className="text-white/70 text-sm mt-1">
              {mode === "signup"
                ? "Create an account to get started"
                : "Sign in to continue"}
            </p>
          </div>

          <div className="flex rounded-xl bg-white/10 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setError("");
                setSignUpSuccess(false);
                setMode("signin");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSignUpSuccess(false);
                setMode("signup");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign up
            </button>
          </div>

          {signUpSuccess && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-green-300 text-center mb-4"
            >
              Account created. Sign in below.
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-white/90 mb-1"
                  >
                    Display name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/90 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/90 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                disabled={loading}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-300"
              >
                {error}
              </motion.p>
            )}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                mode === "signup" ? "Signing up..." : "Signing in..."
              ) : (
                <>
                  <Icon name="Send" className="w-4 h-4" />
                  {mode === "signup" ? "Sign up" : "Sign in"}
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-white/60 text-sm mt-4">
            {mode === "signup"
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-purple-300 hover:text-white font-medium underline underline-offset-2"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
