"use client";

import { useCurrentUser } from "@/context/CurrentUserContext";
import { LoginScreen } from "@/components/LoginScreen";
import { SlackLayout } from "@/components/SlackLayout";

export default function Home() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <SlackLayout />;
}
