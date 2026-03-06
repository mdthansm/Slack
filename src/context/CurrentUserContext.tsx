"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Doc } from "../../convex/_generated/dataModel";

const STORAGE_KEY = "slack-clone-user-id";

type CurrentUserContextType = {
  userId: Id<"users"> | null;
  user: Doc<"users"> | null;
  setUserFromStorage: () => void;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [optimisticUser, setOptimisticUser] = useState<Doc<"users"> | null>(null);
  const signUpAction = useAction(api.auth.signUp);
  const signInAction = useAction(api.auth.signIn);
  const userFromQuery = useQuery(
    api.users.get,
    userId ? { userId } : "skip"
  );
  const user = userFromQuery ?? optimisticUser ?? null;

  const setUserFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUserId(stored as Id<"users">);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setUserFromStorage();
  }, [setUserFromStorage]);

  useEffect(() => {
    if (userFromQuery !== undefined) setOptimisticUser(null);
  }, [userFromQuery]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await signUpAction({ name, email, password });
    },
    [signUpAction]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const userDoc = await signInAction({ email, password });
      if (!userDoc) {
        throw new Error("Invalid email or password.");
      }
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, userDoc._id);
      setOptimisticUser(userDoc);
      setUserId(userDoc._id);
    },
    [signInAction]
  );

  const signOut = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
    setOptimisticUser(null);
  }, []);

  return (
    <CurrentUserContext.Provider
      value={{
        userId,
        user,
        setUserFromStorage,
        signUp,
        signIn,
        signOut,
        isLoading,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}
