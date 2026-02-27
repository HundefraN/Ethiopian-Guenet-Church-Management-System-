import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { Profile, GlobalSettings } from "../types";
import { logActivity } from "../utils/activityLogger";

import toast from "react-hot-toast";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  settings: GlobalSettings | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("global_settings")
        .select("*")
        .single();
      if (data) setSettings(data);
    };

    fetchSettings();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Log login activity on SIGNED_IN event
        if (_event === "SIGNED_IN") {
          logActivity(
            "LOGIN",
            "SYSTEM",
            `User logged in`,
            session.user.id
          );
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        toast.error("Unable to load your profile. Please sign in again.");
      } else if (data) {
        if (data.is_blocked) {
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setSession(null);
          toast.error(
            "Your account has been blocked. Please contact an administrator."
          );
        } else {
          setProfile(data);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      toast.error("Unable to load your profile. Please sign in again.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Log logout before signing out (while we still have the user's session)
    await logActivity(
      "LOGOUT",
      "SYSTEM",
      `User logged out`
    );
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, settings, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
