import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Shield, Users, UserCheck, ChevronRight, Activity,
  ArrowUpRight, TrendingUp, Sparkles,
  BarChart3, Target, Layers
} from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import ActivityLogList from "../components/ActivityLogList";
import {
  springPresets,
  containerVariants as sharedContainerVariants,
  itemVariants as sharedItemVariants,
  cardRevealVariants,
} from "../utils/animations";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import { Skeleton } from "../components/common/Skeleton";

// Animated number using high-performance springs
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

// Horizontal bar chart with shimmer
function HorizontalBar({ label, value, maxValue, color, icon: Icon, d, delay = 0 }: { label: string; value: number; maxValue: number; color: string; icon: any; d: any; delay?: number }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ...springPresets.smooth }}
      className="group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden relative" style={d.iconBox}>
        <motion.div
          className={`h-full rounded-full ${color} relative progress-shimmer`}
          initial={{ width: "0%" }}
          whileInView={{ width: `${Math.max(pct, 4)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: delay + 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

export default function PastorDashboard() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const d = ds(isDark);
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    departments: 0, servants: 0, members: 0, recentMembers: 0,
    activeMembers: 0, transferMembers: 0, deceasedMembers: 0,
  });
  const [topDepartments, setTopDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.church_id) { fetchStats(); fetchTopDepartments(); }
    else { setLoading(false); }
  }, [profile?.church_id]);

  const fetchStats = async () => {
    setLoading(true);
    const { count: memberCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id);
    const { count: servantCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id).eq("role", "servant");
    const { count: deptCount } = await supabase.from("departments").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id);
    const { count: activeCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id).eq("status", "Active");
    const { count: transferCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id).eq("status", "Transfer");
    const { count: deceasedCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("church_id", profile?.church_id).eq("status", "Death");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentMembersCount } = await supabase.from("members").select("*", { count: "exact", head: true })
      .eq("church_id", profile?.church_id).gte("created_at", thirtyDaysAgo.toISOString());
    setStats({
      departments: deptCount || 0, servants: servantCount || 0, members: memberCount || 0,
      recentMembers: recentMembersCount || 0,
      activeMembers: activeCount || 0, transferMembers: transferCount || 0, deceasedMembers: deceasedCount || 0,
    });
    setLoading(false);
  };

  const fetchTopDepartments = async () => {
    try {
      const { data } = await supabase.from("departments").select("id, name").eq("church_id", profile?.church_id).limit(5);
      if (data) {
        const deptWithCounts = await Promise.all(
          data.map(async (dept: any) => {
            const { count } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("department_id", dept.id);
            return { ...dept, memberCount: count || 0 };
          })
        );
        setTopDepartments(deptWithCounts.sort((a, b) => b.memberCount - a.memberCount));
      }
    } catch (error) { console.error("Error fetching departments:", error); }
  };

  const getGrowthRate = () => {
    if (stats.members === 0) return 0;
    const old = stats.members - stats.recentMembers;
    if (old === 0) return stats.recentMembers > 0 ? 100 : 0;
    return Math.round((stats.recentMembers / old) * 100);
  };

  const leadershipRatio = stats.servants > 0 ? Math.round(stats.members / stats.servants) : 0;
  const avgPerDept = stats.departments > 0 ? Math.round(stats.members / stats.departments) : 0;
  const growthRate = getGrowthRate();

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-7 max-w-7xl mx-auto pb-10">

      {/* ═══════════ Hero Banner ═══════════ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-2xl hero-mesh"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a3a6e 75%, #2d5a8e 100%)", backgroundSize: "400% 400%" }}
      >
        {/* Aurora orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-violet-500/15 to-transparent rounded-full blur-3xl -mt-24 -mr-24 aurora-orb" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl aurora-orb-reverse" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-500/8 rounded-full blur-2xl aurora-orb" />

        {/* Floating particles */}
        <div className="absolute top-1/4 right-1/5 w-2 h-2 bg-violet-300 rounded-full" style={{ animation: "floatParticle 6s ease-in-out infinite" }} />
        <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full" style={{ animation: "floatParticle2 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-indigo-200 rounded-full" style={{ animation: "floatParticle3 5s ease-in-out infinite" }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, ...springPresets.smooth }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full badge-shine">
              <Sparkles size={12} className="text-violet-300" />
              <span className="text-violet-200 text-xs font-bold uppercase tracking-wider">{t("dashboard.churchTitle")}</span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...springPresets.smooth }}
            className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2"
          >
            {t("dashboard.welcomePastor")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-blue-200/70 font-medium max-w-lg text-sm"
          >
            {t("dashboard.pastorSubtitle")}
          </motion.p>
        </div>
      </motion.div>

      {/* ═══════════ Stat Cards ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: t("dashboard.stats.activeMinistries"), value: stats.departments, icon: Shield, gradient: "from-violet-600 to-indigo-500", glow: "rgba(139,92,246,0.2)" },
          { label: t("dashboard.stats.servingLeaders"), value: stats.servants, icon: UserCheck, gradient: "from-cyan-500 to-blue-500", glow: "rgba(6,182,212,0.2)" },
          { label: t("dashboard.stats.totalMembers"), value: stats.members, icon: Users, gradient: "from-emerald-500 to-teal-500", glow: "rgba(16,185,129,0.2)", recent: stats.recentMembers },
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={cardRevealVariants}
            whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={{ scale: 0.98 }}
            className="group dashboard-card bg-white rounded-[1.5rem] p-6 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden stat-card-inner"
            style={d.card}
          >
            {loading ? (
              <div className="space-y-4">
                <div className="skeleton-premium w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="skeleton-premium h-10 w-2/3" />
                  <div className="skeleton-premium h-4 w-1/2" />
                </div>
              </div>
            ) : (
              <>
                <motion.div
                  className="absolute -top-8 -right-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500"
                  animate={{ rotate: [0, 5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <card.icon size={120} />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={springPresets.snappy}
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-5 shadow-lg stat-icon-pulse`}
                  style={{ boxShadow: `0 8px 24px ${card.glow}` }}
                >
                  <card.icon size={22} />
                </motion.div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-4xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                    <AnimatedNumber value={card.value} />
                  </h3>
                  {card.recent && card.recent > 0 && (
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

      {/* ═══════════ Quick Navigation ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: "/members", label: t("dashboard.actions.manageMembers"), desc: t("dashboard.actions.viewAddMembers"), icon: Users, color: "text-blue-500", hoverBorder: "hover:border-blue-200", glow: "rgba(59,130,246,0.1)" },
          { to: "/departments", label: t("dashboard.actions.manageDepartments"), desc: t("dashboard.actions.organizeMinistries"), icon: Shield, color: "text-violet-500", hoverBorder: "hover:border-violet-200", glow: "rgba(139,92,246,0.1)" },
          { to: "/servants", label: t("dashboard.actions.manageServants"), desc: t("dashboard.actions.overseeLeadership"), icon: UserCheck, color: "text-cyan-500", hoverBorder: "hover:border-cyan-200", glow: "rgba(6,182,212,0.1)" },
        ].map((action, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Link
              to={action.to}
              className={`flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-lg ${action.hoverBorder} transition-all group dashboard-card`}
              style={d.card}
            >
              <motion.div
                whileHover={{ scale: 1.15, rotate: 10 }}
                transition={springPresets.snappy}
                className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center`}
                style={{ ...d.iconBox, boxShadow: `0 4px 16px ${action.glow}` }}
              >
                <action.icon size={20} />
              </motion.div>
              <div className="flex-1">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm block">{action.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</span>
              </div>
              <ChevronRight size={20} className="text-gray-500 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ Analytics Section ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity Log */}
        <motion.div variants={itemVariants} className="lg:col-span-2 dashboard-card bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
          <div className="p-6 md:p-8 flex justify-between items-center" style={d.innerBorder}>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg"
                style={{ boxShadow: "0 8px 24px rgba(251,146,60,0.25)" }}
              >
                <Activity size={18} />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.activity.recentActivities")}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.activity.latestUpdates")}</p>
              </div>
            </div>
            <Link to="/activities" className="text-sm text-[#4B9BDC] font-bold hover:text-[#1A365D] bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-all hover:shadow-md">
              {t("dashboard.activity.viewAll")}
            </Link>
          </div>
          <div className="p-6 md:p-8">
            <ActivityLogList limit={7} churchId={profile?.church_id || undefined} />
          </div>
        </motion.div>

        {/* Insights Panel */}
        <motion.div variants={itemVariants} className="dashboard-card bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col" style={d.card}>
          <div className="p-6 md:p-8" style={d.innerBorder}>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: -15, scale: 1.1 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg"
                style={{ boxShadow: "0 8px 24px rgba(6,182,212,0.25)" }}
              >
                <TrendingUp size={18} />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.analytics.insightTitle")}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.analytics.insightSub")}</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 flex-1 space-y-7">
            {loading ? (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between">
                      <div className="skeleton-premium h-4 w-1/3" />
                      <div className="skeleton-premium h-4 w-12 rounded-lg" />
                    </div>
                    <div className="skeleton-premium h-2.5 w-full rounded-full" />
                  </div>
                ))}
                <div className="skeleton-premium h-24 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {/* Growth */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{t("dashboard.analytics.memberGrowth")}</span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, ...springPresets.bouncy }}
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border ${growthRate >= 0 ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50" : "text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50"}`}
                    >
                      {growthRate >= 0 ? "+" : ""}{growthRate}%
                    </motion.span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden relative" style={d.iconBox}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-full relative progress-shimmer"
                      initial={{ width: "0%" }}
                      whileInView={{ width: `${Math.min(growthRate + 10, 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{stats.recentMembers} {t("dashboard.analytics.newReg30d")}</p>
                </div>

                {/* Leadership Ratio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-400">{t("dashboard.analytics.leadershipRatio")}</span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, ...springPresets.bouncy }}
                      className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50"
                    >
                      1:{leadershipRatio || "N/A"}
                    </motion.span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden relative" style={d.iconBox}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500 rounded-full relative progress-shimmer"
                      initial={{ width: "0%" }}
                      whileInView={{ width: `${Math.min((stats.servants / (stats.members || 1)) * 500, 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{t("dashboard.analytics.servantPerMember").replace("{{count}}", (leadershipRatio || 0).toString())}</p>
                </div>

                {/* Member Status */}
                <div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-400 block mb-3">{t("dashboard.analytics.memberStatus")}</span>
                  <div className="space-y-2">
                    {[
                      { label: t("dashboard.analytics.statusActive"), val: stats.activeMembers, color: "bg-emerald-400", glow: "rgba(16,185,129,0.4)" },
                      { label: t("dashboard.analytics.statusTransfer"), val: stats.transferMembers, color: "bg-amber-400", glow: "rgba(245,158,11,0.4)" },
                      { label: t("dashboard.analytics.statusDeceased"), val: stats.deceasedMembers, color: "bg-gray-400", glow: "rgba(148,163,184,0.4)" },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1, ...springPresets.smooth }}
                        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full ${s.color}`} style={{ boxShadow: `0 0 8px ${s.glow}` }} />
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">{s.label}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{s.val}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Average Members Per Ministry */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, ...springPresets.bouncy }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] rounded-2xl p-5 text-center relative overflow-hidden metric-glass"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-10"><Target size={60} /></div>
                  <div className="absolute top-0 left-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl aurora-orb" />
                  <div className="relative z-10">
                    <span className="block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-1 counter-glow">{avgPerDept}</span>
                    <span className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider">{t("dashboard.analytics.avgMemberMinistry")}</span>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ═══════════ Department Breakdown ═══════════ */}
      {topDepartments.length > 0 && (
        <motion.div variants={itemVariants} className="dashboard-card bg-white rounded-[1.5rem] p-6 md:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]" style={d.card}>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg"
              style={{ boxShadow: "0 8px 24px rgba(139,92,246,0.25)" }}
            >
              <Layers size={18} />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("dashboard.analytics.ministryBreakdown")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("dashboard.analytics.deptDistribution")}</p>
            </div>
          </div>
          <div className="space-y-5">
            {topDepartments.map((dept, i) => {
              const maxCount = topDepartments[0]?.memberCount || 1;
              const colors = [
                "bg-gradient-to-r from-violet-400 to-violet-500",
                "bg-gradient-to-r from-blue-400 to-blue-500",
                "bg-gradient-to-r from-cyan-400 to-cyan-500",
                "bg-gradient-to-r from-emerald-400 to-emerald-500",
                "bg-gradient-to-r from-amber-400 to-amber-500",
              ];
              return (
                <div key={dept.id}>
                  <HorizontalBar
                    label={dept.name}
                    value={dept.memberCount}
                    maxValue={maxCount}
                    color={colors[i % colors.length]}
                    icon={Shield}
                    d={d}
                    delay={i * 0.1}
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
