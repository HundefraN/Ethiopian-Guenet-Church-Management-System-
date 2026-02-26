import React, { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  ChevronRight,
  User,
  ArrowLeft,
  Loader2,
  Building,
  Shield,
  Users,
  Trash2,
  Edit2,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  LogIn,
  LogOut,
  Settings,
  Filter,
  Search,
  ChevronDown,
  Calendar,
  Upload,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { ActivityLog } from "../types";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActionLabel, getActionColor, getEntityLabel } from "../utils/activityLogger";

// Human-readable time formatter
const timeAgo = (date: string) => {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  let interval = seconds / 60;
  if (interval < 60) return `${Math.floor(interval)}m ago`;
  interval = seconds / 3600;
  if (interval < 24) return `${Math.floor(interval)}h ago`;
  interval = seconds / 86400;
  if (interval < 7) return `${Math.floor(interval)}d ago`;
  interval = seconds / 2592000;
  if (interval < 12) return `${Math.floor(interval)}mo ago`;
  interval = seconds / 31536000;
  return `${Math.floor(interval)}y ago`;
};

const formatFullDate = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

// Icon mapper for entity types
const getEntityIcon = (entity: string) => {
  switch (entity) {
    case "SERVANT": return Users;
    case "PASTOR": return User;
    case "MEMBER": return Users;
    case "CHURCH": return Building;
    case "DEPARTMENT": return Shield;
    case "PROFILE": return User;
    case "SETTINGS": return Settings;
    case "USER": return User;
    case "SYSTEM": return Activity;
    default: return Activity;
  }
};

const ACTION_FILTERS = ["All", "CREATE", "UPDATE", "DELETE", "BLOCK", "UNBLOCK", "ROLE_CHANGE", "LOGIN", "LOGOUT"];
const ENTITY_FILTERS = ["All", "SERVANT", "PASTOR", "MEMBER", "CHURCH", "DEPARTMENT", "PROFILE", "SETTINGS", "SYSTEM"];

export default function Activities() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "All" || log.action_type === actionFilter;
    const matchesEntity = entityFilter === "All" || log.entity_type === entityFilter;
    const matchesSearch = searchQuery === "" ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesEntity && matchesSearch;
  });

  // Group logs by date
  const groupedLogs: Record<string, any[]> = {};
  filteredLogs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedLogs[date]) groupedLogs[date] = [];
    groupedLogs[date].push(log);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const renderChanges = (changes: any) => {
    if (!changes) return null;

    // If changes has old/new structure
    if (changes.old && changes.new) {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 shrink-0 mt-0.5">Before</span>
            <div className="text-xs text-gray-500 font-mono bg-red-50/30 p-2 rounded-lg flex-1 break-all">
              {Object.entries(changes.old).map(([key, value]) => (
                <div key={key}><span className="font-semibold text-gray-600">{key.replace(/_/g, " ")}:</span> {String(value ?? "—")}</div>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0 mt-0.5">After</span>
            <div className="text-xs text-gray-500 font-mono bg-emerald-50/30 p-2 rounded-lg flex-1 break-all">
              {Object.entries(changes.new).map(([key, value]) => (
                <div key={key}><span className="font-semibold text-gray-600">{key.replace(/_/g, " ")}:</span> {String(value ?? "—")}</div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Simple key-value changes
    return (
      <div className="text-xs text-gray-500 font-mono bg-gray-50 p-3 rounded-lg break-all space-y-0.5">
        {Object.entries(changes).map(([key, value]) => {
          if (key === "password") return null;
          return (
            <div key={key}>
              <span className="font-semibold text-gray-600">{key.replace(/_/g, " ")}:</span>{" "}
              {typeof value === "object" && value !== null
                ? JSON.stringify(value)
                : String(value ?? "—")}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] p-8 shadow-lg">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="text-white">
                <h1 className="text-3xl font-extrabold tracking-tight mb-1">
                  Activity Log
                </h1>
                <p className="text-blue-100 text-sm">
                  Complete audit trail of all system actions — who did what, when, and details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <span className="text-white/70 text-xs font-medium">Total Events</span>
                <p className="text-white text-xl font-black">{filteredLogs.length}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all flex-1">
          <div className="pl-3 pr-2 text-gray-400">
            <Search size={20} className="text-[#4B9BDC]" />
          </div>
          <input
            type="text"
            placeholder="Search activities by user, action, or detail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400 text-sm"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none bg-white px-4 py-3 pr-10 rounded-2xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] transition-all cursor-pointer"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "All" ? "All Actions" : getActionLabel(f)}
              </option>
            ))}
          </select>
          <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Entity Filter */}
        <div className="relative">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="appearance-none bg-white px-4 py-3 pr-10 rounded-2xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] transition-all cursor-pointer"
          >
            {ENTITY_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "All" ? "All Categories" : getEntityLabel(f)}
              </option>
            ))}
          </select>
          <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* Activity List */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-[#4B9BDC] mx-auto mb-4" size={40} />
              <p className="text-gray-500 font-medium">Loading activity log...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              No activity recorded
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {searchQuery || actionFilter !== "All" || entityFilter !== "All"
                ? "No activities match your current filters. Try adjusting your search criteria."
                : "System actions will appear here as they occur."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <Calendar size={14} className="text-[#4B9BDC]" />
                    <span className="text-sm font-bold text-gray-700">{date}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-100"></div>
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                    {dateLogs.length} {dateLogs.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Log Items */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {dateLogs.map((log) => {
                      const ActionIcon = getActionIcon(log.action_type);
                      const colors = getActionColor(log.action_type);
                      const isExpanded = expandedLog === log.id;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          key={log.id}
                          className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer group ${isExpanded
                              ? "border-[#4B9BDC]/30 shadow-[0_4px_20px_rgba(75,155,220,0.1)]"
                              : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"
                            }`}
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <div className="p-4 sm:p-5">
                            <div className="flex items-start gap-4">
                              {/* User Avatar */}
                              <div className="flex-shrink-0">
                                {log.profiles?.avatar_url ? (
                                  <img
                                    src={log.profiles.avatar_url}
                                    alt={log.profiles.full_name}
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-600">
                                    {log.profiles?.full_name?.charAt(0) || "?"}
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  {/* Main description line */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900">
                                      {log.profiles?.full_name || "System"}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
                                      <ActionIcon size={10} />
                                      {getActionLabel(log.action_type)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {getEntityLabel(log.entity_type)}
                                    </span>
                                  </div>

                                  {/* Timestamp */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400 font-medium" title={formatFullDate(log.created_at)}>
                                      {timeAgo(log.created_at)}
                                    </span>
                                  </div>
                                </div>

                                {/* Detail text */}
                                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                                  {log.details}
                                </p>

                                {/* Role badge */}
                                {log.profiles?.role && (
                                  <div className="mt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                      {log.profiles.role.replace("_", " ")}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Expand indicator */}
                              {log.changes && (
                                <div className="flex-shrink-0">
                                  <ChevronDown
                                    size={18}
                                    className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded Changes Section */}
                          <AnimatePresence>
                            {isExpanded && log.changes && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-5 pb-5 pt-0">
                                  <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                      <Settings size={10} />
                                      Change Details
                                    </p>
                                    {renderChanges(log.changes)}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
