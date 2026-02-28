import React, { useEffect, useState } from "react";
import { Activity, Clock, ChevronRight, User, Plus, Edit2, Trash2, Lock, Unlock, RefreshCw, LogIn, LogOut, Settings, Users, Building, Shield, Upload, Key } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";
import { getActionColor } from "../utils/activityLogger";
import { useAuth } from "../context/AuthContext";
import { formatDisplayDateTime } from "../utils/dateFormatter";
import { useLanguage } from "../context/LanguageContext";
import { Skeleton } from "./common/Skeleton";

// Icon mapper for action types
const getActionIcon = (action: string) => {
  switch (action) {
    case "CREATE": return Plus;
    case "UPDATE": return Edit2;
    case "DELETE": return Trash2;
    case "BLOCK": return Lock;
    case "UNBLOCK": return Unlock;
    case "ROLE_CHANGE": return RefreshCw;
    case "LOGIN": return LogIn;
    case "LOGOUT": return LogOut;
    case "UPLOAD": return Upload;
    case "TOGGLE": return Settings;
    case "PASSWORD_CHANGE": return Key;
    default: return Activity;
  }
};

export default function ActivityLogList({
  limit = 5,
  churchId,
}: {
  limit?: number;
  churchId?: string;
}) {
  const { profile, calendarType } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (profile) {
      fetchLogs();
    }

    const channel = supabase
      .channel(`internal_activity_logs_${churchId || profile?.id || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [churchId, profile]);

  const fetchLogs = async () => {
    try {
      const role = profile?.role;

      // Servant: ONLY their own activities
      if (role === "servant") {
        const { data, error } = await supabase
          .from("activity_logs")
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url,
              role,
              church_id
            )
          `)
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLogs(data || []);
        return;
      }

      // Pastor: activities from users in the same church
      const effectiveChurchId = churchId || (role === "pastor" ? profile?.church_id : null);

      if (effectiveChurchId) {
        const { data, error } = await supabase
          .from("activity_logs")
          .select(`
            *,
            profiles:user_id!inner (
              full_name,
              avatar_url,
              role,
              church_id
            )
          `)
          .eq("profiles.church_id", effectiveChurchId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLogs(data || []);
        return;
      }

      // Super Admin: all activities
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            church_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-2 mt-1">
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Activity className="mx-auto h-8 w-8 text-gray-500 dark:text-gray-400 mb-2" />
        <p className="font-medium">{t('dashboard.activity.noActivity')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.activity.activityHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const ActionIcon = getActionIcon(log.action_type);
        const colors = getActionColor(log.action_type);

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group"
          >
            {/* Action Icon or User Avatar */}
            <div className="relative shrink-0">
              {log.profiles?.avatar_url ? (
                <img
                  src={log.profiles.avatar_url}
                  alt={log.profiles.full_name || "User"}
                  className="w-9 h-9 rounded-lg object-cover"
                />
              ) : (
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  <ActionIcon size={16} />
                </div>
              )}
              {log.profiles?.avatar_url && (
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 ${colors.bg} ${colors.text}`}>
                  <ActionIcon size={8} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Who did what */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {log.profiles?.full_name || "System"}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {t(`activity.actions.${log.action_type}`)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {t(`activity.entities.${log.entity_type}`)}
                </span>
              </div>

              {/* Detail */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 break-words line-clamp-2">
                {log.details}
              </p>

              {/* When */}
              <div className="flex items-center gap-2 mt-1.5">
                <Clock size={11} className="text-gray-500 dark:text-gray-400" />
                <span
                  className="text-[11px] text-gray-500 dark:text-gray-400 font-medium"
                  title={formatDisplayDateTime(log.created_at, calendarType, language)}
                >
                  {timeAgo(log.created_at, language)}
                </span>
                {log.profiles?.role && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize font-medium">
                      {t(`common.roles.${log.profiles.role.toLowerCase()}`)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => navigate("/activities")}
        className="w-full py-2.5 text-sm text-[#4B9BDC] font-bold hover:bg-[#4B9BDC]/5 dark:hover:bg-[#4B9BDC]/10 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-transparent hover:border-[#4B9BDC]/10 dark:hover:border-[#4B9BDC]/20"
      >
        <span>{t('dashboard.activity.viewAll')}</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
