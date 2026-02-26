import React, { useEffect, useState } from "react";
import { Activity, Clock, ChevronRight, User, Plus, Edit2, Trash2, Lock, Unlock, RefreshCw, LogIn, LogOut, Settings, Users, Building, Shield, Upload } from "lucide-react";
import { supabase } from "../supabaseClient";
import { ActivityLog } from "../types";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";
import { getActionLabel, getActionColor, getEntityLabel } from "../utils/activityLogger";

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
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel(`internal_activity_logs_${churchId || "all"}`)
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
  }, [churchId]);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from("activity_logs")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            church_id
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      // Note: Filtering by church_id on joined table is tricky in Supabase unless we use !inner join or filter in JS
      // However, Supabase filters on joined tables using the syntax: table!inner(column)

      if (churchId) {
        // Filter logs where the user belongs to the church
        // Using !inner ensures we only get logs from users in that church
        query = supabase
          .from("activity_logs")
          .select(
            `
            *,
            profiles:user_id!inner (
              full_name,
              avatar_url,
              role,
              church_id
            )
          `
          )
          .eq("profiles.church_id", churchId)
          .order("created_at", { ascending: false })
          .limit(limit);
      }

      const { data, error } = await query;

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
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="font-medium">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">Actions will appear here as they occur</p>
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
            className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 group"
          >
            {/* Action Icon */}
            <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
              <ActionIcon size={16} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Who did what */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-gray-900">
                  {log.profiles?.full_name || "System"}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {getActionLabel(log.action_type)}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {getEntityLabel(log.entity_type)}
                </span>
              </div>

              {/* Detail */}
              <p className="text-sm text-gray-600 mt-0.5 break-words line-clamp-2">
                {log.details}
              </p>

              {/* When */}
              <div className="flex items-center gap-2 mt-1.5">
                <Clock size={11} className="text-gray-400" />
                <span className="text-[11px] text-gray-400 font-medium">
                  {timeAgo(log.created_at)}
                </span>
                {log.profiles?.role && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400 capitalize font-medium">
                      {log.profiles.role.replace("_", " ")}
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
        className="w-full py-2.5 text-sm text-[#4B9BDC] font-bold hover:bg-[#4B9BDC]/5 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-transparent hover:border-[#4B9BDC]/10"
      >
        <span>View All Activity</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
