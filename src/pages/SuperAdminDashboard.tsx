import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Building, ToggleLeft, ToggleRight, Users, UserCheck,
  TrendingUp, Activity, ArrowUpRight,
  Shield, Zap, Globe, Eye, BarChart3
} from "lucide-react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import ActivityLogList from "../components/ActivityLogList";
import { timeAgo } from "../utils/timeAgo";
import ConfirmDialog from "../components/ConfirmDialog";
import { Link } from "react-router-dom";
import { logActivity } from "../utils/activityLogger";
import {
  springPresets,
  containerVariants as sharedContainerVariants,
  itemVariants as sharedItemVariants,
  cardRevealVariants,
} from "../utils/animations";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import { formatDisplayDateTime } from "../utils/dateFormatter";
import { Skeleton } from "../components/common/Skeleton";

// Animated counter component using framer-motion for smooth, realistic counting
function AnimatedNumber({ value }: { value: number }) {
  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 18,
    mass: 1,
    restDelta: 0.001,
  });
  const displayValue = useTransform(springValue, (current) => Math.floor(current));

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springPresets.bouncy, duration: 0.6 }}
      className="counter-glow"
    >
      {displayValue}
    </motion.span>
  );
}

// Modern Donut chart component using framer-motion path animations
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const { t } = useLanguage();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0)
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        {t("dashboard.activity.noActivity")}
      </div>
    );

  let cumulativePercent = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative w-full h-full flex items-center justify-center donut-glow">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Background track */}
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" stroke="rgba(148,163,184,0.1)" />
        <AnimatePresence>
          {segments.map((segment, i) => {
            const percent = segment.value / total;
            if (percent === 0) return null;
            const strokeDasharray = `${circumference * percent} ${circumference}`;
            const strokeDashoffset = -circumference * cumulativePercent;
            cumulativePercent += percent;

            return (
              <motion.circle
                key={segment.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="12"
                stroke={segment.color}
                strokeDasharray={strokeDasharray}
                initial={{ strokeDashoffset: circumference, opacity: 0 }}
                animate={{
                  strokeDashoffset,
                  opacity: 1,
                  transition: { duration: 1.2, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] },
                }}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${segment.color}40)` }}
              />
            );
          })}
        </AnimatePresence>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0.3, opacity: 0, filter: "blur(8px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ ...springPresets.bouncy, delay: 0.3 }}
          className="text-4xl font-black text-gray-900 dark:text-gray-100 counter-glow"
        >
          {total}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic"
        >
          {t("dashboard.analytics.platformOverview")}
        </motion.span>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const d = ds(isDark);
  const { settings, calendarType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.is_maintenance_mode || false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    churches: 0, pastors: 0, servants: 0, members: 0,
    recentMembers: 0, recentChurches: 0,
    activeMembers: 0, transferMembers: 0, deceasedMembers: 0,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");
  const [confirmButtonText, setConfirmButtonText] = useState(t("common.save"));

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("activity_logs_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        fetchRecentActivities();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRecentActivities()]);
    setLoading(false);
  };

  const fetchRecentActivities = async () => {
    try {
      const { data } = await supabase
        .from("activity_logs")
        .select(`*, profiles:user_id (full_name, avatar_url)`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRecentActivities(data);
    } catch (error) { console.error("Error fetching activities:", error); }
  };

  const fetchStats = async () => {
    try {
      const { count: churchCount } = await supabase.from("churches").select("*", { count: "exact", head: true });
      const { count: pastorCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "pastor");
      const { count: servantCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "servant");
      const { count: memberCount } = await supabase.from("members").select("*", { count: "exact", head: true });
      const { count: activeCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "Active");
      const { count: transferCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "Transfer");
      const { count: deceasedCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "Death");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();
      const { count: recentMembersCount } = await supabase.from("members").select("*", { count: "exact", head: true }).gte("created_at", isoDate);
      const { count: recentChurchesCount } = await supabase.from("churches").select("*", { count: "exact", head: true }).gte("created_at", isoDate);
      setStats({
        churches: churchCount || 0, pastors: pastorCount || 0, servants: servantCount || 0,
        members: memberCount || 0, recentMembers: recentMembersCount || 0,
        recentChurches: recentChurchesCount || 0,
        activeMembers: activeCount || 0, transferMembers: transferCount || 0, deceasedMembers: deceasedCount || 0,
      });
    } catch (error) { console.error("Error fetching stats:", error); }
  };

  const handleToggleMaintenanceClick = () => {
    const newValue = !maintenanceMode;
    setConfirmTitle(newValue ? t("dashboard.maintenance.enableTitle") : t("dashboard.maintenance.disableTitle"));
    setConfirmMessage(newValue ? t("dashboard.maintenance.enableMsg") : t("dashboard.maintenance.disableMsg"));
    setConfirmType("warning");
    setConfirmButtonText(newValue ? t("settings.maintenance.label") : t("common.cancel"));
    setConfirmAction(() => () => toggleMaintenance());
    setConfirmOpen(true);
  };

  const toggleMaintenance = async () => {
    const newValue = !maintenanceMode;
    const loadingToast = toast.loading(t("settings.security.updating"));
    const { error } = await supabase.from("global_settings").update({ is_maintenance_mode: newValue }).eq("id", settings?.id || 1);
    if (!error) {
      await logActivity("TOGGLE", "SETTINGS", `${newValue ? "Enabled" : "Disabled"} maintenance mode from dashboard`, String(settings?.id || 1),
        { old: { is_maintenance_mode: !newValue }, new: { is_maintenance_mode: newValue } });
      setMaintenanceMode(newValue);
      toast.success(t("dashboard.messages.updateSuccess"), { id: loadingToast });
    } else {
      toast.error(t("dashboard.messages.updateError"), { id: loadingToast });
    }
    setConfirmOpen(false);
  };

  const getGrowthRate = (currentTotal: number, recentCount: number) => {
    if (currentTotal === 0) return 0;
    const oldTotal = currentTotal - recentCount;
    if (oldTotal === 0) return recentCount > 0 ? 100 : 0;
    return Math.round((recentCount / oldTotal) * 100);
  };

  const totalPeople = stats.members + stats.servants + stats.pastors;
  const memberGrowth = getGrowthRate(stats.members, stats.recentMembers);
  const churchGrowth = getGrowthRate(stats.churches, stats.recentChurches);

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ═══════════ Hero Banner ═══════════ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-2xl group hero-mesh"
        style={{ background: "linear-gradient(135deg, #0c1929 0%, #1a2f4a 25%, #1e3a5f 50%, #2d5a8e 75%, #4B9BDC 100%)", backgroundSize: "400% 400%" }}
      >
        {/* Aurora orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full blur-3xl -mt-24 -mr-24 aurora-orb" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl aurora-orb-reverse" />
        <div className="absolute top-1/2 right-1/6 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl aurora-orb" />

        {/* Floating particles */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-cyan-300 rounded-full" style={{ animation: "floatParticle 6s ease-in-out infinite" }} />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full" style={{ animation: "floatParticle2 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-sky-200 rounded-full" style={{ animation: "floatParticle3 5s ease-in-out infinite" }} />
        <div className="absolute top-2/3 right-1/5 w-1.5 h-1.5 bg-indigo-300 rounded-full" style={{ animation: "floatParticle 7s ease-in-out infinite 1s" }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, ...springPresets.smooth }}
              className="flex items-center gap-3 mb-2 sm:mb-3"
            >
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full badge-shine">
                <div className="w-2 h-2 bg-emerald-400 rounded-full live-dot" />
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">{t("dashboard.maintenance.online")}</span>
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ...springPresets.smooth }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-1 sm:mb-2"
            >
              {t("dashboard.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-blue-200/80 font-medium max-w-lg text-sm"
            >
              {t("dashboard.subtitle")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, ...springPresets.bouncy }}
            className="flex items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleToggleMaintenanceClick}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold transition-all shadow-lg border backdrop-blur-sm ${maintenanceMode
                ? "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                }`}
            >
              {maintenanceMode ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              <span>{maintenanceMode ? t("dashboard.maintenance.on") : t("dashboard.maintenance.active")}</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════ Stat Cards Row ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          { label: t("dashboard.stats.churches"), value: stats.churches, recent: stats.recentChurches, icon: Building, gradient: "from-blue-600 to-blue-400", glowColor: "rgba(59,130,246,0.15)" },
          { label: t("dashboard.stats.pastors"), value: stats.pastors, recent: 0, icon: Shield, gradient: "from-violet-600 to-purple-400", glowColor: "rgba(139,92,246,0.15)" },
          { label: t("dashboard.stats.servants"), value: stats.servants, recent: 0, icon: UserCheck, gradient: "from-amber-500 to-orange-400", glowColor: "rgba(245,158,11,0.15)" },
          { label: t("dashboard.stats.members"), value: stats.members, recent: stats.recentMembers, icon: Users, gradient: "from-emerald-600 to-teal-400", glowColor: "rgba(16,185,129,0.15)" },
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={cardRevealVariants}
            whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={{ scale: 0.98 }}
            className="group dashboard-card bg-white rounded-[1.5rem] p-5 md:p-6 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden stat-card-inner"
            style={d.card}
          >
            {loading ? (
              <div className="space-y-4">
                <div className="skeleton-premium w-11 h-11 rounded-xl" />
                <div className="space-y-2">
                  <div className="skeleton-premium h-10 w-2/3" />
                  <div className="skeleton-premium h-4 w-1/2" />
                </div>
              </div>
            ) : (
              <>
                <motion.div
                  className="absolute -top-6 -right-6 opacity-[0.04] group-hover:opacity-[0.1] transition-all duration-500"
                  animate={{ rotate: [0, 5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <card.icon size={100} />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springPresets.snappy}
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-4 shadow-lg stat-icon-pulse`}
                  style={{ boxShadow: `0 8px 24px ${card.glowColor}` }}
                >
                  <card.icon size={20} />
                </motion.div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                    <AnimatedNumber value={card.value} />
                  </h3>
                  {card.recent > 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1, ...springPresets.bouncy }}
                      className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50 badge-shine"
                    >
                      <ArrowUpRight size={12} />+{card.recent}
                    </motion.span>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ Analytics Grid ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Role Distribution Donut */}
        <motion.div variants={itemVariants} className="lg:col-span-2 dashboard-card bg-white rounded-[1.5rem] p-6 md:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]" style={d.card}>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg"
              style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.25)" }}
            >
              <Eye size={18} />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.analytics.roleDistribution")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.analytics.platformPeople")}</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-8">
              <div className="skeleton-premium w-44 h-44 rounded-full mx-auto" />
              <div className="space-y-3">
                <div className="skeleton-premium h-6 w-full" />
                <div className="skeleton-premium h-6 w-full" />
                <div className="skeleton-premium h-6 w-full" />
              </div>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...springPresets.bouncy, delay: 0.2 }}
                className="w-44 h-44 mx-auto mb-6"
              >
                <DonutChart
                  segments={[
                    { value: stats.pastors, color: "#8b5cf6", label: t("dashboard.stats.pastors") },
                    { value: stats.servants, color: "#f59e0b", label: t("dashboard.stats.servants") },
                    { value: stats.members, color: "#10b981", label: t("dashboard.stats.members") },
                  ]}
                />
              </motion.div>
              <div className="space-y-2.5">
                {[
                  { label: t("dashboard.stats.pastors"), value: stats.pastors, color: "bg-violet-500", pct: totalPeople > 0 ? Math.round((stats.pastors / totalPeople) * 100) : 0 },
                  { label: t("dashboard.stats.servants"), value: stats.servants, color: "bg-amber-500", pct: totalPeople > 0 ? Math.round((stats.servants / totalPeople) * 100) : 0 },
                  { label: t("dashboard.stats.members"), value: stats.members, color: "bg-emerald-500", pct: totalPeople > 0 ? Math.round((stats.members / totalPeople) * 100) : 0 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1, ...springPresets.smooth }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} style={{ boxShadow: `0 0 8px ${item.color === 'bg-violet-500' ? 'rgba(139,92,246,0.4)' : item.color === 'bg-amber-500' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}` }} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-200 tabular-nums">{item.value}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md w-12 text-center" style={d.iconBox}>{item.pct}%</span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Growth & Performance */}
        <motion.div variants={itemVariants} className="lg:col-span-3 dashboard-card bg-white rounded-[1.5rem] p-6 md:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]" style={d.card}>
          <div className="flex items-center gap-3 mb-8">
            <motion.div
              whileHover={{ rotate: -15, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg"
              style={{ boxShadow: "0 8px 24px rgba(6,182,212,0.25)" }}
            >
              <TrendingUp size={18} />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.analytics.growthAnalytics")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.analytics.metrics30d")}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <div className="skeleton-premium h-4 w-1/3" />
                    <div className="skeleton-premium h-6 w-16 rounded-lg" />
                  </div>
                  <div className="skeleton-premium h-3 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-7">
              {/* Member Growth */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{t("dashboard.analytics.memberGrowth")}</span>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, ...springPresets.bouncy }}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg border ${memberGrowth >= 0 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}
                  >
                    {memberGrowth >= 0 ? "+" : ""}{memberGrowth}%
                  </motion.span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={d.iconBox}>
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-full relative progress-shimmer"
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(memberGrowth + 10, 100)}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">{stats.recentMembers} {t("dashboard.analytics.newReg30d")}</p>
              </div>

              {/* Church Expansion */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{t("dashboard.analytics.churchExpansion")}</span>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, ...springPresets.bouncy }}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg border ${churchGrowth >= 0 ? "text-blue-600 bg-blue-50 border-blue-100" : "text-red-600 bg-red-50 border-red-100"}`}
                  >
                    {churchGrowth >= 0 ? "+" : ""}{churchGrowth}%
                  </motion.span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={d.iconBox}>
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 rounded-full relative progress-shimmer"
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(churchGrowth + 10, 100)}%` }}
                    transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">{stats.recentChurches} {t("dashboard.analytics.newBranches")}</p>
              </div>

              {/* Member Status Breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={16} className="text-violet-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{t("dashboard.analytics.memberStatus")}</span>
                </div>
                <div className="flex gap-3">
                  {[
                    { label: t("dashboard.analytics.statusActive"), value: stats.activeMembers, color: "from-emerald-400 to-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", glow: "rgba(16,185,129,0.15)" },
                    { label: t("dashboard.analytics.statusTransfer"), value: stats.transferMembers, color: "from-amber-400 to-amber-500", bg: "bg-amber-50", text: "text-amber-700", glow: "rgba(245,158,11,0.15)" },
                    { label: t("dashboard.analytics.statusDeceased"), value: stats.deceasedMembers, color: "from-gray-400 to-gray-500", bg: "bg-gray-50", text: "text-gray-600", glow: "rgba(148,163,184,0.15)" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, ...springPresets.smooth }}
                      whileHover={{ y: -3, scale: 1.03 }}
                      className={`flex-1 ${item.bg} dark:bg-gray-800/30 rounded-xl p-4 text-center border border-gray-100/40 dark:border-gray-800/50 transition-all cursor-default`}
                      style={{ ...d.emptyInner, boxShadow: `0 4px 16px ${item.glow}` }}
                    >
                      <span className={`block text-2xl font-black ${item.text} dark:text-gray-100 tabular-nums`}>{item.value}</span>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ═══════════ Activity & Metrics ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2 dashboard-card bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
          <div className="px-8 py-6 flex items-center justify-between" style={d.innerBorder}>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg"
                style={{ boxShadow: "0 8px 24px rgba(251,146,60,0.25)" }}
              >
                <Activity size={18} />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.activity.liveActivity")}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.activity.realTimeEvents")}</p>
              </div>
            </div>
            <Link
              to="/activities"
              className="text-sm font-bold text-[#4B9BDC] hover:text-[#1A365D] bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-all hover:shadow-md"
            >
              {t("dashboard.activity.viewAll")}
            </Link>
          </div>
          <div className="p-6 md:p-8">
            <div className="space-y-1">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-4">
                      <div className="skeleton-premium w-10 h-10 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton-premium h-4 w-full" />
                        <div className="skeleton-premium h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, ...springPresets.smooth }}
                    className="flex items-start gap-4 p-4 rounded-xl transition-all group activity-feed-item"
                    style={d.listItem}
                  >
                    <div className="relative">
                      {log.profiles?.avatar_url ? (
                        <img src={log.profiles.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-sm font-black text-[#4B9BDC] ring-2 ring-white shadow-sm">
                          {log.profiles?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                      {i === 0 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full live-dot" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{log.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{log.profiles?.full_name || t("common.error")}</span>
                        <span className="text-gray-500 dark:text-gray-400">·</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400" title={formatDisplayDateTime(log.created_at, calendarType, language as any)}>
                          {timeAgo(log.created_at, language as any)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t("dashboard.activity.noActivity")}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dark metrics panel */}
        <motion.div
          variants={itemVariants}
          className="metric-glass bg-gradient-to-br from-[#0c1929] via-[#1e293b] to-[#1e3a5f] rounded-[1.5rem] border border-gray-800/50 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl aurora-orb" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/8 rounded-full blur-3xl aurora-orb-reverse" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" style={{ animation: "floatParticle 10s ease-in-out infinite" }} />

          <div className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-cyan-300 border border-white/10"
              >
                <Globe size={18} />
              </motion.div>
              <div>
                <h2 className="text-sm font-bold text-white">{t("dashboard.analytics.platformOverview")}</h2>
                <p className="text-xs text-gray-500 font-medium">{t("dashboard.analytics.globalMetrics")}</p>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, ...springPresets.bouncy }}
              className="mb-8"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
                <div className="relative z-10">
                  {loading ? (
                    <div className="skeleton-premium h-12 w-24 mx-auto mb-2" style={{ background: "rgba(255,255,255,0.1)" }} />
                  ) : (
                    <span className="block text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 mb-2 tabular-nums counter-glow">
                      <AnimatedNumber value={totalPeople} />
                    </span>
                  )}
                  <span className="text-xs font-bold text-blue-300/80 uppercase tracking-wider">{t("dashboard.analytics.totalAccounts")}</span>
                </div>
              </div>
            </motion.div>

            <div className="space-y-4">
              {[
                { label: t("dashboard.analytics.servantRatio"), value: stats.servants > 0 ? `1:${Math.round(stats.members / stats.servants)}` : "N/A", icon: UserCheck },
                { label: t("dashboard.analytics.avgMemberBranch"), value: stats.churches > 0 ? Math.round(stats.members / stats.churches) : 0, icon: Building },
                { label: t("dashboard.analytics.avgServantBranch"), value: stats.churches > 0 ? Math.round(stats.servants / stats.churches) : 0, icon: Shield },
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, ...springPresets.smooth }}
                  whileHover={{ x: -4, backgroundColor: "rgba(255,255,255,0.1)" }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-colors cursor-default"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <metric.icon size={14} />
                  </div>
                  <span className="flex-1 text-sm text-gray-500 dark:text-gray-400 font-medium">{metric.label}</span>
                  {loading ? (
                    <div className="skeleton-premium h-4 w-12" style={{ background: "rgba(255,255,255,0.1)" }} />
                  ) : (
                    <span className="text-sm font-black text-white tabular-nums">{metric.value}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ═══════════ Comprehensive Logs ═══════════ */}
      <motion.div variants={itemVariants} className="dashboard-card bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
        <div className="px-8 py-6 flex items-center justify-between" style={d.innerBorder}>
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={springPresets.snappy}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white shadow-lg"
            >
              <Zap size={18} />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.audit.title")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.audit.subtitle")}</p>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8">
          <ActivityLogList limit={6} />
        </div>
      </motion.div>

      <ConfirmDialog isOpen={confirmOpen} title={confirmTitle} message={confirmMessage}
        onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} type={confirmType} confirmText={confirmButtonText} />
    </motion.div>
  );
}
