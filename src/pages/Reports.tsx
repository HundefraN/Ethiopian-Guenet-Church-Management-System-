import React, { useState, useEffect, useMemo } from "react";
import {
    FileText,
    Download,
    TrendingUp,
    Map as MapIcon,
    DollarSign,
    Users,
    Calendar,
    ChevronDown,
    Sparkles,
    BarChart3,
    PieChart as PieIcon,
    ArrowUpRight,
    Building,
} from "lucide-react";
import { motion } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, BarChart, Bar
} from "recharts";
import Map, { Marker, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import logo from "../assets/logo.png";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// --- Constants ---
const AGE_GROUPS = [
    { label: "0-12", min: 0, max: 12 },
    { label: "13-19", min: 13, max: 19 },
    { label: "20-35", min: 20, max: 35 },
    { label: "36-50", min: 36, max: 50 },
    { label: "50+", min: 51, max: 150 },
];

export default function Reports() {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const d = ds(isDark);

    const [churches, setChurches] = useState<any[]>([]);
    const [selectedChurchId, setSelectedChurchId] = useState<string>("all");
    const [dateRange, setDateRange] = useState("last_6_months");
    const [viewMode, setViewMode] = useState<"visual" | "table">("visual");

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        members: [] as any[],
        churches: [] as any[],
        profiles: [] as any[],
        departments: [] as any[],
        activities: [] as any[],
    });

    const [growthData, setGrowthData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [demographicData, setDemographicData] = useState<any[]>([]);

    // Map state
    const [viewState, setViewState] = useState({
        latitude: 9.0192,
        longitude: 38.7525,
        zoom: 11
    });

    useEffect(() => {
        fetchAllData();
    }, [selectedChurchId, dateRange]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Churches (always needed for filter)
            const { data: churchesData } = await supabase.from("churches").select("*");

            // 2. Fetch Members
            let membersQuery = supabase.from("members").select("*");
            if (selectedChurchId !== "all") {
                membersQuery = membersQuery.eq("church_id", selectedChurchId);
            }
            const { data: membersData } = await membersQuery;

            // 3. Fetch Profiles (Pastors & Servants)
            let profilesQuery = supabase.from("profiles").select("*");
            if (selectedChurchId !== "all") {
                profilesQuery = profilesQuery.eq("church_id", selectedChurchId);
            }
            const { data: profilesData } = await profilesQuery;

            // 4. Fetch Departments
            let deptsQuery = supabase.from("departments").select("*");
            if (selectedChurchId !== "all") {
                deptsQuery = deptsQuery.eq("church_id", selectedChurchId);
            }
            const { data: deptsData } = await deptsQuery;

            // 5. Fetch Activities (Count only for performance)
            const { count: activitiesCount } = await supabase.from("activity_logs").select("*", { count: 'exact', head: true });
            const activitiesData = Array(activitiesCount || 0).fill({});

            const fetchedStats = {
                members: membersData || [],
                churches: churchesData || [],
                profiles: profilesData || [],
                departments: deptsData || [],
                activities: activitiesData || [],
            };

            setStats(fetchedStats);
            setChurches(churchesData || []);

            calculateAnalytics(fetchedStats);

        } catch (err) {
            console.error("Error fetching report data:", err);
            toast.error("Failed to fetch real-time analytics");
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = (data: any) => {
        const { members, profiles, departments, churches, activities } = data;

        // --- 1. Growth Calculation ---
        const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const growthMap: { [key: string]: number } = {};

        // Initialize last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${monthsNames[d.getMonth()]} ${d.getFullYear() % 100}`;
            growthMap[key] = 0;
        }

        members.forEach((m: any) => {
            const d = new Date(m.created_at);
            const key = `${monthsNames[d.getMonth()]} ${d.getFullYear() % 100}`;
            if (growthMap.hasOwnProperty(key)) {
                growthMap[key]++;
            }
        });

        // Cumulative growth
        let runningTotal = members.length - Object.values(growthMap).reduce((a, b) => a + b, 0);
        const growthArr: any[] = Object.entries(growthMap).map(([month, count]) => {
            runningTotal += count;
            return { month, members: runningTotal };
        });

        // Add 2 projected months (simple linear growth)
        if (growthArr.length >= 2) {
            const last = growthArr[growthArr.length - 1].members;
            const prev = growthArr[growthArr.length - 2].members;
            const diff = Math.max(0, last - prev);

            const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            growthArr.push({
                month: `${monthsNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear() % 100}`,
                members: last + diff,
                isProjected: true
            });

            const secondMonthDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
            growthArr.push({
                month: `${monthsNames[secondMonthDate.getMonth()]} ${secondMonthDate.getFullYear() % 100}`,
                members: last + diff * 2,
                isProjected: true
            });
        }

        setGrowthData(growthArr);

        // --- 2. Distribution Calculation ---
        const pastorsCount = profiles.filter((p: any) => p.role === "pastor").length;
        const servantsCount = profiles.filter((p: any) => p.role === "servant").length;

        setDistributionData([
            { category: t("sidebar.members"), amount: members.length, color: "#10b981" },
            { category: t("sidebar.pastors"), amount: pastorsCount, color: "#3b82f6" },
            { category: t("sidebar.servants"), amount: servantsCount, color: "#f59e0b" },
            { category: t("sidebar.departments"), amount: departments.length, color: "#8b5cf6" },
            { category: t("sidebar.activities"), amount: activities.length, color: "#ec4899" },
        ]);

        // --- 3. Demographics Calculation ---
        const demoMap = AGE_GROUPS.map(g => ({ ...g, count: 0 }));
        members.forEach((m: any) => {
            if (m.dob) {
                const age = calculateAge(m.dob);
                const group = demoMap.find(g => age >= g.min && age <= g.max);
                if (group) group.count++;
            }
        });
        setDemographicData(demoMap.map(g => ({ age: g.label, count: g.count })));
    };

    const calculateAge = (dob: string) => {
        const birthday = new Date(dob);
        const ageDifMs = Date.now() - birthday.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const churchName = selectedChurchId === "all" ? t("reports.allChurches") : churches.find(c => c.id === selectedChurchId)?.name;

        // Header
        doc.addImage(logo, "PNG", 10, 10, 20, 20);
        doc.setFontSize(22);
        doc.setTextColor(75, 155, 220);
        doc.text("ETHIOPIAN GUENET CHURCH", 40, 20);
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text(t("reports.title"), 40, 30);

        doc.line(10, 35, 200, 35);

        // Content Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`${t("reports.selectChurch")}: ${churchName}`, 10, 45);
        doc.text(`${t("reports.dateRange")}: ${dateRange.replace("_", " ")}`, 10, 52);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 10, 59);

        // Distribution Table
        doc.setFontSize(16);
        doc.text("Analytics Overview", 10, 75);
        autoTable(doc, {
            startY: 80,
            head: [["Category", "Count"]],
            body: distributionData.map(f => [f.category, f.amount.toLocaleString()]),
            theme: 'grid',
            headStyles: { fillColor: [75, 155, 220] }
        });

        // Growth Table
        doc.text(t("reports.forecasting"), 10, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["Month", "Members", "Status"]],
            body: growthData.map(g => [g.month, g.members, g.isProjected ? "Projected" : "Actual"]),
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }
        });

        doc.save(`Guenet_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success("PDF Exported successfully!");
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // Stats sheet
        const statsWs = XLSX.utils.json_to_sheet(distributionData);
        XLSX.utils.book_append_sheet(wb, statsWs, "Overview");

        // Growth sheet
        const growthWs = XLSX.utils.json_to_sheet(growthData);
        XLSX.utils.book_append_sheet(wb, growthWs, "Growth");

        // Demographics sheet
        const demoWs = XLSX.utils.json_to_sheet(demographicData);
        XLSX.utils.book_append_sheet(wb, demoWs, "Demographics");

        XLSX.writeFile(wb, `Guenet_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel Exported successfully!");
    };

    const totalStats = useMemo(() => distributionData.reduce((acc, curr) => acc + curr.amount, 0), [distributionData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
        >
            {/* --- HERO HEADER --- */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)' }}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 blur-[100px] rounded-full -mr-20 -mt-20 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 blur-[80px] rounded-full -ml-20 -mb-20" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                            <Sparkles size={14} className="text-blue-300" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">{t("reports.title")}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            Church <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">Intelligent</span> Reports
                        </h1>
                        <p className="text-blue-100/70 max-w-xl font-medium text-sm md:text-base">
                            {t("reports.subtitle")}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white text-blue-600 font-bold text-sm shadow-xl"
                        >
                            <Download size={18} />
                            {t("reports.exportPdf")}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-xl"
                        >
                            <FileText size={18} />
                            {t("reports.exportExcel")}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* --- FILTERS BAR --- */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center p-6 rounded-[2rem]" style={d.card}>
                <div className="flex-1 flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">{t("reports.selectChurch")}</label>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={selectedChurchId}
                                onChange={(e) => setSelectedChurchId(e.target.value)}
                                className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none font-bold text-sm"
                                style={d.formInput}
                            >
                                <option value="all">{t("reports.allChurches")}</option>
                                {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">{t("reports.dateRange")}</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                style={d.formInput}
                            >
                                <option value="last_30_days">Last 30 Days</option>
                                <option value="last_3_months">Last 3 Months</option>
                                <option value="last_6_months">Last 6 Months</option>
                                <option value="last_year">Last Year</option>
                                <option value="all_time">All Time</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>
                </div>

                <div className="p-4 lg:p-6 lg:border-l border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <button
                        onClick={() => setViewMode("visual")}
                        className={`p-3 rounded-xl transition-all ${viewMode === "visual" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                        <PieIcon size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`p-3 rounded-xl transition-all ${viewMode === "table" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                        <BarChart3 size={20} />
                    </button>
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* --- LEFT COLUMN: Financials & Growth --- */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Financial Snapshot */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="rounded-[2.5rem] p-8 border border-transparent shadow-xl overflow-hidden relative"
                        style={d.card}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{t("reports.overview")}</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t("dashboard.analytics.globalMetrics")}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{totalStats.toLocaleString()}</p>
                                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold justify-end">
                                    <ArrowUpRight size={14} />
                                    <span>{t("dashboard.activity.liveActivity")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distributionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="category" type="category" hide />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="amount" radius={[0, 10, 10, 0]}>
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-4">
                                {distributionData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.category}</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100">{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Growth Forecasting */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="rounded-[2.5rem] p-8 border border-transparent shadow-xl relative overflow-hidden"
                        style={d.card}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{t("reports.forecasting")}</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t("reports.projections")}</p>
                                </div>
                            </div>
                            <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20">
                                PREDICTIVE AI ENABLED
                            </div>
                        </div>

                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="members"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorMembers)"
                                        dot={{ r: 6, fill: '#fff', stroke: '#10b981', strokeWidth: 3 }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Historical Data</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Forecast (Next 3 Months)</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* --- RIGHT COLUMN: Map & Demographics --- */}
                <div className="space-y-8">

                    {/* Geographic Distribution Map */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="rounded-[2.5rem] border border-transparent shadow-xl overflow-hidden relative"
                        style={d.card}
                    >
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                    <MapIcon size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{t("reports.branchDensity")}</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t("reports.distribution")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px] relative">
                            <Map
                                {...viewState}
                                onMove={evt => setViewState(evt.viewState)}
                                style={{ width: '100%', height: '100%' }}
                                mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
                                mapboxAccessToken={MAPBOX_TOKEN}
                            >
                                <FullscreenControl position="top-right" />
                                <NavigationControl position="top-right" />

                                {churches.map((church, idx) => (
                                    <Marker key={idx} longitude={38.7525 + (idx * 0.01)} latitude={9.0192 + (idx * 0.005)} anchor="bottom">
                                        <div className="group relative">
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-xl transform transition-transform group-hover:scale-125">
                                                <Building size={16} />
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-gray-100 dark:border-gray-700">
                                                <p className="text-xs font-black text-gray-900 dark:text-white">{church.name}</p>
                                                <p className="text-[10px] text-gray-500">{church.location || "No location"}</p>
                                            </div>
                                        </div>
                                    </Marker>
                                ))}
                            </Map>

                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">Branches</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">Member Density</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Demographic Heatmap */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="rounded-[2.5rem] p-8 border border-transparent shadow-xl relative"
                        style={d.card}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{t("reports.demographics")}</h2>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {demographicData.map((item, idx) => {
                                const maxValue = Math.max(...demographicData.map(d => d.count), 1);
                                const percentage = (item.count / maxValue) * 100;

                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.age} Years</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-gray-100">{item.count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 1, delay: idx * 0.1 }}
                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                </div>
            </div>
        </motion.div>
    );
}
