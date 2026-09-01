import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthResult {
  error: Error | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Unix seconds when the current JWT expires (null when signed out). */
  expiresAt: number | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string, currentPassword?: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Map backend auth errors to human-readable, non-leaky messages. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (m.includes("password should be")) return "Password does not meet the security requirements.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "This password has appeared in a data breach. Please choose another.";
  if (m.includes("current password")) return "Your current password is incorrect.";
  if (m.includes("network") || m.includes("fetch")) return "Network error. Check your connection and retry.";
  return message;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register the listener first so no auth event (including token refresh) is missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const wrap = async (fn: () => Promise<{ error: { message: string } | null }>): Promise<AuthResult> => {
    try {
      const { error } = await fn();
      return { error: error ? new Error(friendlyAuthError(error.message)) : null };
    } catch (e) {
      return { error: new Error(friendlyAuthError((e as Error).message)) };
    }
  };

  const signUp = useCallback(
    (email: string, password: string, displayName?: string) =>
      wrap(() =>
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName?.trim() },
          },
        }),
      ),
    [],
  );

  const signIn = useCallback(
    (email: string, password: string) =>
      wrap(() => supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })),
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) =>
      wrap(() =>
        supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      ),
    [],
  );

  const updatePassword = useCallback(
    (password: string, currentPassword?: string) =>
      wrap(() =>
        supabase.auth.updateUser(
          (currentPassword
            ? { password, current_password: currentPassword }
            : { password }) as Parameters<typeof supabase.auth.updateUser>[0],
        ),
      ),
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        expiresAt: session?.expires_at ?? null,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
