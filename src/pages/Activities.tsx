import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Clock,
  ChevronRight,
  ChevronLeft,
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
  Key,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActionLabel, getActionColor, getEntityLabel } from "../utils/activityLogger";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../utils/timeAgo";
import { useTheme } from "../context/ThemeContext";
import { ds } from "../utils/darkStyles";



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
    case "PASSWORD_CHANGE": return Key;
    default: return Activity;
  }
};

const ACTION_FILTERS = ["All", "CREATE", "UPDATE", "DELETE", "BLOCK", "UNBLOCK", "ROLE_CHANGE", "PASSWORD_CHANGE", "LOGIN", "LOGOUT"];
const ENTITY_FILTERS = ["All", "SERVANT", "PASTOR", "MEMBER", "CHURCH", "DEPARTMENT", "PROFILE", "SETTINGS", "SYSTEM"];

const PAGE_SIZE = 20;

export default function Activities() {
  const { isDark } = useTheme();
  const d = ds(isDark);
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // Role-based scope description
  const scopeLabel = profile?.role === "super_admin"
    ? "All system-wide activities"
    : profile?.role === "pastor"
      ? "Activities within your church"
      : "Your personal activities";

  const scopeIcon = profile?.role === "super_admin"
    ? Eye
    : profile?.role === "pastor"
      ? Building
      : User;

  const ScopeIcon = scopeIcon;

  // Build the query based on role
  const buildQuery = useCallback((forCount = false) => {
    const role = profile?.role;

    // Servant: own activities only
    if (role === "servant") {
      let query = forCount
        ? supabase.from("activity_logs").select("*", { count: "exact", head: true })
        : supabase.from("activity_logs").select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url,
              role,
              church_id
            )
          `);
      query = query.eq("user_id", profile?.id);
      return query;
    }

    // Pastor: activities from users in the same church
    if (role === "pastor" && profile?.church_id) {
      if (forCount) {
        // For count, we use !inner join to filter by church
        let query = supabase
          .from("activity_logs")
          .select(`
            *,
            profiles:user_id!inner (
              full_name,
              avatar_url,
              role,
              church_id
            )
          `, { count: "exact", head: true })
          .eq("profiles.church_id", profile.church_id);
        return query;
      } else {
        let query = supabase
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
          .eq("profiles.church_id", profile.church_id);
        return query;
      }
    }

    // Super Admin: all activities
    let query = forCount
      ? supabase.from("activity_logs").select("*", { count: "exact", head: true })
      : supabase.from("activity_logs").select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            church_id
          )
        `);
    return query;
  }, [profile]);

  // Apply filters to query
  const applyFilters = useCallback((query: any) => {
    if (actionFilter !== "All") {
      query = query.eq("action_type", actionFilter);
    }
    if (entityFilter !== "All") {
      query = query.eq("entity_type", entityFilter);
    }
    if (searchQuery.trim()) {
      query = query.ilike("details", `%${searchQuery.trim()}%`);
    }
    return query;
  }, [actionFilter, entityFilter, searchQuery]);

  // Fetch total count for pagination
  const fetchCount = useCallback(async () => {
    try {
      let query = buildQuery(true);
      query = applyFilters(query);
      const { count, error } = await query;
      if (error) throw error;
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching activity count:", error);
    }
  }, [buildQuery, applyFilters]);

  // Fetch paginated logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = buildQuery(false);
      query = applyFilters(query);

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, applyFilters, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, entityFilter, searchQuery]);

  // Fetch data when page or filters change
  useEffect(() => {
    if (profile) {
      fetchLogs();
      fetchCount();
    }
  }, [profile, currentPage, actionFilter, entityFilter, searchQuery, fetchLogs, fetchCount]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("activity_logs_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          // If on first page, refresh to show new entries
          if (currentPage === 1) {
            fetchLogs();
          }
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, fetchLogs, fetchCount]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Group logs by date
  const groupedLogs: Record<string, any[]> = {};
  logs.forEach((log) => {
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
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const renderChanges = (changes: any) => {
    if (!changes) return null;

    // Handle legacy format { old: {}, new: {} }
    if (changes.old && changes.new && !changes.old.old) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-500/20 shrink-0 mt-0.5">Before</span>
            <div className="text-xs text-gray-500 font-mono bg-rose-50/30 dark:bg-rose-500/5 p-2 rounded-lg flex-1 break-all">
              {Object.entries(changes.old).map(([key, value]) => (
                <div key={key}><span className="font-semibold text-gray-600 dark:text-gray-400">{key.replace(/_/g, " ")}:</span> {String(value ?? "—")}</div>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-500/20 shrink-0 mt-0.5">After</span>
            <div className="text-xs text-gray-500 font-mono bg-emerald-50/30 dark:bg-emerald-500/5 p-2 rounded-lg flex-1 break-all">
              {Object.entries(changes.new).map(([key, value]) => (
                <div key={key}><span className="font-semibold text-gray-600 dark:text-gray-400">{key.replace(/_/g, " ")}:</span> {String(value ?? "—")}</div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Handle granular format { field: { old, new } } or simple kv
    return (
      <div className="space-y-2">
        {Object.entries(changes).map(([key, value]: [string, any]) => {
          if (key === "password") return null;

          const isDiff = value && typeof value === "object" && ("old" in value || "new" in value);

          return (
            <div key={key} className="rounded-xl p-3 border" style={d.emptyInner}>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{key.replace(/_/g, " ")}</div>
              {isDiff ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-rose-500 uppercase">Old:</span>
                    <span className="text-xs text-gray-600 font-medium line-through decoration-rose-300/50">{String(value.old ?? "—")}</span>
                  </div>
                  <ChevronRight size={12} className="text-gray-500 dark:text-gray-400 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-emerald-500 uppercase">New:</span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 font-bold">{String(value.new ?? "—")}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-700 dark:text-gray-400 font-medium">{String(value ?? "—")}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Pagination helpers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
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
                <p className="text-blue-100 text-sm flex items-center gap-2">
                  <ScopeIcon size={14} />
                  {scopeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Scope Badge */}
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <span className="text-white/70 text-xs font-medium block">Viewing as</span>
                <p className="text-white text-sm font-bold capitalize">{profile?.role?.replace("_", " ") || "User"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <span className="text-white/70 text-xs font-medium block">Total Events</span>
                <p className="text-white text-xl font-black">{totalCount}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="p-2 rounded-2xl border shadow-sm flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all flex-1" style={d.modalContent}>
          <div className="pl-3 pr-2 text-gray-500 dark:text-gray-400">
            <Search size={20} className="text-[#4B9BDC]" />
          </div>
          <input
            type="text"
            placeholder="Search activities by detail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium placeholder-gray-400 text-sm"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={d.searchBar(false)}
            className="appearance-none bg-white px-4 py-3 pr-10 rounded-2xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] transition-all cursor-pointer"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "All" ? "All Actions" : getActionLabel(f)}
              </option>
            ))}
          </select>
          <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
        </div>

        {/* Entity Filter */}
        <div className="relative">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={d.searchBar(false)}
            className="appearance-none bg-white px-4 py-3 pr-10 rounded-2xl border border-gray-100 shadow-sm text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] transition-all cursor-pointer"
          >
            {ENTITY_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "All" ? "All Categories" : getEntityLabel(f)}
              </option>
            ))}
          </select>
          <Shield size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
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
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm" style={d.card}>
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4" style={d.emptyIcon}>
              <Activity className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              No activity recorded
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {searchQuery || actionFilter !== "All" || entityFilter !== "All"
                ? "No activities match your current filters. Try adjusting your search criteria."
                : profile?.role === "servant"
                  ? "Your personal actions will appear here as they occur."
                  : "System actions will appear here as they occur."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm" style={d.card}>
                    <Calendar size={14} className="text-[#4B9BDC]" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{date}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800/50">
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
                          exit={{ opacity: 0, x: -10 }}
                          transition={{
                            duration: 0.2,
                            layout: {
                              type: "spring",
                              stiffness: 400,
                              damping: 40,
                              mass: 1,
                              delay: 0
                            }
                          }}
                          key={log.id}
                          className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden cursor-pointer group ${isExpanded
                            ? "border-[#4B9BDC]/30 shadow-[0_4px_20px_rgba(75,155,220,0.1)]"
                            : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700"
                            }`}
                          style={isExpanded ? d.detailPanel : d.card}

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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
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

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Clock size={12} className="text-gray-500 dark:text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium" title={formatFullDate(log.created_at)}>
                                      {timeAgo(log.created_at)}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                                  {log.details}
                                </p>

                                {log.profiles?.role && (
                                  <div className="mt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                      {log.profiles.role.replace("_", " ")}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {log.changes && (
                                <div className="flex-shrink-0">
                                  <ChevronDown
                                    size={18}
                                    className={`text-gray-500 dark:text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
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
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="px-5 pb-5 pt-0">
                                  <div className="border-t pt-4" style={d.innerBorder}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
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

      {/* Pagination Controls */}
      {!loading && totalCount > PAGE_SIZE && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          style={d.card}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Showing{" "}
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {(currentPage - 1) * PAGE_SIZE + 1}
            </span>
            {" – "}
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {Math.min(currentPage * PAGE_SIZE, totalCount)}
            </span>
            {" of "}
            <span className="font-bold text-gray-900 dark:text-gray-100">{totalCount}</span> events
          </p>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="First page"
            >
              <ChevronsLeft size={18} />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-500 dark:text-gray-400 text-sm font-bold select-none">
                    ···
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`min-w-[36px] h-9 rounded-xl text-sm font-bold transition-all ${currentPage === page
                      ? "bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] text-white shadow-[0_4px_12px_rgba(75,155,220,0.3)]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Next page"
            >
              <ChevronRight size={18} />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Last page"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
