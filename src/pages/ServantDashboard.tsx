import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  Users, Plus, Phone, Calendar, Trash2, Search, Eye,
  ArrowUpRight, UserPlus, Mail, Filter, ChevronDown, Sparkles, BarChart3, Activity
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { logActivity } from "../utils/activityLogger";
import { springPresets, containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants, interactivePresets } from "../utils/animations";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import { Skeleton } from "../components/common/Skeleton";
import ActivityLogList from "../components/ActivityLogList";

// Animated counter using high-performance springs
// Animated counter using high-performance springs
function AnimatedNumber({ value }: { value: number }) {
  const springValue = useSpring(0, {
    stiffness: 40,
    damping: 15,
    mass: 1,
    restDelta: 0.001
  });
  const displayValue = useTransform(springValue, (current) => Math.floor(current));

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {displayValue}
  </motion.span>;
}

export default function ServantDashboard() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const d = ds(isDark);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterFocused, setFilterFocused] = useState(false);

  useEffect(() => {
    if (profile?.church_id || profile?.department_id) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [profile?.church_id, profile?.department_id]);

  const fetchMembers = async () => {
    // If we have a church_id, fetch all members in that church
    // Otherwise, if we only have a department_id (unlikely given the new requirement), fallback
    let query = supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile?.church_id) {
      query = query.eq("church_id", profile.church_id);
    } else if (profile?.department_id) {
      query = query.eq("department_id", profile.department_id);
    }

    const { data, error } = await query;

    if (error) { toast.error(t('servants.messages.loadError')); }
    else if (data) { setMembers(data); }
    setLoading(false);
  };

  const deleteMember = async (id: string) => {
    if (!window.confirm(t('servants.confirmDeleteMsg'))) return;
    const memberToDelete = members.find((m) => m.id === id);
    const loadingToast = toast.loading(t('common.loading'));
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) {
      await logActivity(
        "DELETE",
        "MEMBER",
        `Deleted member ${memberToDelete?.full_name || "Unknown"} from department`,
        id,
        memberToDelete ? { full_name: memberToDelete.full_name, phone: memberToDelete.phone } : null
      );
      fetchMembers();
      toast.success(t('servants.messages.deleteSuccess'), { id: loadingToast });
    }
    else { toast.error(error.message, { id: loadingToast }); }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !searchQuery || m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone?.includes(searchQuery) || m.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [members, searchQuery, statusFilter]);

  // Compute stats from data
  const activeCount = members.filter(m => m.status === "Active").length;
  const recentCount = members.filter(m => {
    const created = new Date(m.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created >= thirtyDaysAgo;
  }).length;

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-7 max-w-7xl mx-auto pb-10">

      {/* ═══════════ Hero Banner ═══════════ */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0c1929 0%, #173254 40%, #3178B5 70%, #4B9BDC 100%)' }}>

        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-blue-300/15 to-transparent rounded-full blur-3xl -mt-16 -mr-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-300 rounded-full animate-pulse" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-full">
                <Sparkles size={12} className="text-blue-100" />
                <span className="text-blue-50 text-xs font-bold uppercase tracking-wider">{t('dashboard.ministryTitle')}</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              {t('dashboard.servantTitle')}
            </h1>
            <p className="text-blue-100/70 font-medium max-w-lg text-sm">
              {t('dashboard.servantSubtitle')}
            </p>
          </div>
          <button
            onClick={() => navigate("/members/add")}
            className="flex items-center gap-3 px-6 py-3.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-2xl hover:bg-white/25 active:scale-95 font-bold transition-all shadow-lg shrink-0"
          >
            <UserPlus size={20} />
            {t('dashboard.actions.registerMember')}
          </button>
        </div>
      </motion.div>

      {/* ═══════════ Stats Row ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.stats.total'), value: members.length, icon: Users, gradient: "from-blue-600 to-blue-400" },
          { label: t('dashboard.stats.active'), value: activeCount, icon: BarChart3, gradient: "from-blue-500 to-cyan-500" },
          { label: t('dashboard.stats.new30d'), value: recentCount, icon: ArrowUpRight, gradient: "from-violet-500 to-purple-500" },
          { label: t('dashboard.stats.filtered'), value: filteredMembers.length, icon: Filter, gradient: "from-amber-500 to-orange-500" },
        ].map((card, i) => (
          <motion.div key={i} variants={itemVariants}
            className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-0.5 transition-all"
            style={d.card}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ) : (
              <>
                <div className="absolute -top-4 -right-4 opacity-[0.04]"><card.icon size={70} /></div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 shadow-md`}>
                  <card.icon size={18} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 tabular-nums"><AnimatedNumber value={card.value} /></h3>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">{card.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ Search & Filter ═══════════ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('members.searchPlaceholder')}
            style={d.searchBar(searchFocused)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200 placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:border-[#4B9BDC] focus:ring-4 focus:ring-[#4B9BDC]/10 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            onFocus={() => setFilterFocused(true)}
            onBlur={() => setFilterFocused(false)}
            style={d.searchBar(filterFocused)}
            className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-gray-700 dark:text-gray-400 focus:outline-none focus:border-[#4B9BDC] focus:ring-4 focus:ring-[#4B9BDC]/10 transition-all cursor-pointer"
          >
            <option value="all">{t('dashboard.stats.total')}</option>
            <option value="Active">{t('dashboard.analytics.statusActive')}</option>
            <option value="Transfer">{t('dashboard.analytics.statusTransfer')}</option>
            <option value="Death">{t('dashboard.analytics.statusDeceased')}</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* ═══════════ Content Section ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List (Main Column) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
            <div className="px-6 md:px-8 py-5 flex justify-between items-center" style={d.innerBorder}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white shadow-md">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('sidebar.members')}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {filteredMembers.length} {filteredMembers.length === 1 ? t('sidebar.members').slice(0, -1) : t('sidebar.members')} {searchQuery || statusFilter !== "all" ? `(${t('dashboard.stats.filtered')})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4 px-6 md:px-8 py-4">
                    <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !profile?.church_id && !profile?.department_id ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="text-red-400" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('dashboard.activity.noChurchAssigned')}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.activity.noChurchAssigned')}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="text-gray-500 dark:text-gray-400" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {searchQuery || statusFilter !== "all" ? t('servants.noServants') : t('dashboard.activity.noActivity')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery || statusFilter !== "all" ? t('servants.noServantsSub') : t('dashboard.activity.latestUpdates')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 h-[500px] overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {filteredMembers.map((member) => (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-4 px-6 md:px-8 py-4 hover:bg-gray-50/50 transition-colors group"
                      style={d.listItem}
                    >
                      {/* Avatar */}
                      <div className="shrink-0" onClick={() => navigate(`/members/${member.id}`)} style={{ cursor: 'pointer' }}>
                        {member.photo ? (
                          <img src={member.photo} alt={member.full_name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-sm font-black text-blue-600 ring-2 ring-white shadow-sm">
                            {member.full_name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/members/${member.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{member.full_name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                            member.status === 'Transfer' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}>
                            {member.status || 'Active'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {member.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {format(new Date(member.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/members/edit/${member.id}`)}
                          className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title={t('common.edit')}>
                          <Eye size={15} />
                        </button>
                        <button onClick={() => deleteMember(member.id)}
                          className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title={t('common.delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity (Side Column) */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className="bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full" style={d.card}>
            <div className="p-6 md:p-8" style={d.innerBorder}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('dashboard.activity.myActivities')}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.activity.latestUpdates')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar h-[500px]">
              <ActivityLogList limit={10} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
