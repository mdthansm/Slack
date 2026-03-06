"use client";

import { useCurrentUser } from "@/context/CurrentUserContext";
import { LoginScreen } from "@/components/LoginScreen";
import { SlackLayout } from "@/components/SlackLayout";

export default function Home() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-pulse text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <SlackLayout />;
}
