import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  signUp: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (!isSupabaseConfigured) {
    return "Connect your Supabase project in Replit Secrets to enable account access.";
  }
  if (
    message.includes("already registered") ||
    message.includes("user already exists") ||
    message.includes("already been registered")
  ) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email using the link we sent before logging in.";
  }
  if (message.includes("password") && (message.includes("length") || message.includes("short"))) {
    return "Choose a password that meets your Supabase project's password requirements.";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many attempts just now. Please wait a moment and try again.";
  }
  return "We couldn't complete that request. Please try again in a moment.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let alive = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await client
        .from("users")
        .select("id, email, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (!alive) return;
      if (!error && data) setProfile(data as UserProfile);
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(false);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      void loadProfile(nextUser.id);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return { confirmationRequired: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ configured: isSupabaseConfigured, loading, user, profile, signUp, signIn, signOut }),
    [loading, user, profile, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
