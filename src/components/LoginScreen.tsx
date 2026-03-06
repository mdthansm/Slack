"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/context/CurrentUserContext";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-900 text-white text-lg font-bold mb-4">
            S
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === "signin" ? "Sign in to Slack Clone" : "Create your account"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "signin"
              ? "Enter your credentials to continue"
              : "Get started with your team"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {signUpSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
            >
              Account created successfully. Sign in below.
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Display name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? mode === "signup" ? "Creating account..." : "Signing in..."
                : mode === "signup" ? "Create account" : "Sign in"
              }
            </button>
          </form>
        </div>

        {/* Switch mode */}
        <p className="text-center text-gray-500 text-sm mt-5">
          {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
