import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  Shield, Users, UserCheck, ChevronRight, Activity,
  ArrowUpRight, BookOpen, TrendingUp, Calendar, Sparkles,
  BarChart3, Target, Layers
} from "lucide-react";
import { motion, useInView, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import ActivityLogList from "../components/ActivityLogList";
import { springPresets, containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants, interactivePresets } from "../utils/animations";
import { useTheme } from "../context/ThemeContext";
import { ds } from "../utils/darkStyles";

// Animated number
// Animated number using high-performance springs
function AnimatedNumber({ value }: { value: number }) {
  const springValue = useSpring(0, { stiffness: 60, damping: 20 });
  const displayValue = useTransform(springValue, (current) => Math.floor(current));

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span>{displayValue}</motion.span>;
}

// Horizontal bar chart
function HorizontalBar({ label, value, maxValue, color, icon: Icon, d }: { label: string; value: number; maxValue: number; color: string; icon: any; d: any }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={d.iconBox}>
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: '0%' }}
          whileInView={{ width: `${Math.max(pct, 4)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.05 }}
        />
      </div>
    </div>
  );
}

export default function PastorDashboard() {
  const { isDark } = useTheme();
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
      const { data } = await supabase
        .from("departments")
        .select("id, name")
        .eq("church_id", profile?.church_id)
        .limit(5);
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
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-radial from-violet-500/15 to-transparent rounded-full blur-3xl -mt-24 -mr-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl mb-0 ml-0" />
        <div className="absolute top-1/4 right-1/5 w-2 h-2 bg-violet-300 rounded-full animate-pulse" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-full">
              <Sparkles size={12} className="text-violet-300" />
              <span className="text-violet-200 text-xs font-bold uppercase tracking-wider">Church Dashboard</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            Welcome back, Pastor
          </h1>
          <p className="text-blue-200/70 font-medium max-w-lg text-sm">
            Manage your church's growth, monitor ministry engagement, and oversee your congregation.
          </p>
        </div>
      </motion.div>

      {/* ═══════════ Stat Cards ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Active Ministries", value: stats.departments, icon: Shield, gradient: "from-violet-600 to-indigo-500", accent: "violet" },
          { label: "Serving Leaders", value: stats.servants, icon: UserCheck, gradient: "from-cyan-500 to-blue-500", accent: "cyan" },
          { label: "Total Members", value: stats.members, icon: Users, gradient: "from-emerald-500 to-teal-500", accent: "emerald", recent: stats.recentMembers },
        ].map((card, i) => (
          <motion.div key={i} variants={itemVariants}
            className="group bg-white rounded-[1.5rem] p-6 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-150 relative overflow-hidden"
            style={d.card}
          >
            <div className="absolute -top-8 -right-8 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-200">
              <card.icon size={120} />
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-5 shadow-lg`}>
              <card.icon size={22} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-4xl font-black text-gray-900 dark:text-gray-100 tabular-nums"><AnimatedNumber value={card.value} /></h3>
              {card.recent && card.recent > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                  <ArrowUpRight size={12} />+{card.recent}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ Quick Navigation ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: "/members", label: "Manage Members", desc: "View and add members", icon: Users, color: "text-blue-500", hoverBorder: "hover:border-blue-200" },
          { to: "/departments", label: "Manage Departments", desc: "Organize ministries", icon: Shield, color: "text-violet-500", hoverBorder: "hover:border-violet-200" },
          { to: "/servants", label: "Manage Servants", desc: "Oversee leadership", icon: UserCheck, color: "text-cyan-500", hoverBorder: "hover:border-cyan-200" },
        ].map((action, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Link to={action.to}
              className={`flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-lg ${action.hoverBorder} transition-all group`}
              style={d.card}
            >
              <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`} style={d.iconBox}>
                <action.icon size={20} />
              </div>
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
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
          <div className="p-6 md:p-8 flex justify-between items-center" style={d.innerBorder}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-md">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activities</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Latest updates in your church</p>
              </div>
            </div>
            <Link to="/activities" className="text-sm text-[#4B9BDC] font-bold hover:text-[#1A365D] bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-colors">
              View All
            </Link>
          </div>
          <div className="p-6 md:p-8">
            <ActivityLogList limit={7} churchId={profile?.church_id || undefined} />
          </div>
        </motion.div>

        {/* Insights Panel */}
        <motion.div variants={itemVariants} className="bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col" style={d.card}>
          <div className="p-6 md:p-8" style={d.innerBorder}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-md">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Insights</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Key analytics</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 flex-1 space-y-7">
            {/* Growth */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-400">Member Growth</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${growthRate >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/50'}`}>
                  {growthRate >= 0 ? '+' : ''}{growthRate}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={d.iconBox}>
                <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  initial={{ width: '0%' }} whileInView={{ width: `${Math.min(growthRate + 10, 100)}%` }}
                  viewport={{ once: true }} transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{stats.recentMembers} new in 30 days</p>
            </div>

            {/* Leadership Ratio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-400">Leadership Ratio</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50">
                  1:{leadershipRatio || 'N/A'}
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={d.iconBox}>
                <motion.div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                  initial={{ width: '0%' }} whileInView={{ width: `${Math.min((stats.servants / (stats.members || 1)) * 500, 100)}%` }}
                  viewport={{ once: true }} transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">1 servant per {leadershipRatio || 0} members</p>
            </div>

            {/* Member Status */}
            <div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-400 block mb-3">Member Status</span>
              <div className="space-y-2">
                {[
                  { label: "Active", val: stats.activeMembers, color: "bg-emerald-400" },
                  { label: "Transfer", val: stats.transferMembers, color: "bg-amber-400" },
                  { label: "Deceased", val: stats.deceasedMembers, color: "bg-gray-400" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">{s.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Average Members Per Ministry */}
            <div className="bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] rounded-2xl p-5 text-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10"><Target size={60} /></div>
              <div className="relative z-10">
                <span className="block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mb-1">{avgPerDept}</span>
                <span className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider">Avg Members / Ministry</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ═══════════ Department Breakdown ═══════════ */}
      {topDepartments.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]" style={d.card}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-md">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ministry Breakdown</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Member distribution across departments</p>
            </div>
          </div>
          <div className="space-y-5">
            {topDepartments.map((dept, i) => {
              const maxCount = topDepartments[0]?.memberCount || 1;
              const colors = [
                'bg-gradient-to-r from-violet-400 to-violet-500',
                'bg-gradient-to-r from-blue-400 to-blue-500',
                'bg-gradient-to-r from-cyan-400 to-cyan-500',
                'bg-gradient-to-r from-emerald-400 to-emerald-500',
                'bg-gradient-to-r from-amber-400 to-amber-500',
              ];
              return (
                <div key={dept.id}>
                  <HorizontalBar label={dept.name} value={dept.memberCount}
                    maxValue={maxCount} color={colors[i % colors.length]} icon={Shield} d={d} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
