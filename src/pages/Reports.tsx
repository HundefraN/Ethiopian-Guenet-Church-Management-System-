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
    ExternalLink,
    Heart,
    GraduationCap,
    Briefcase,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, BarChart, Bar,
} from "recharts";
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import { parseGoogleMapsUrl, DEFAULT_ETHIOPIA_CENTER } from "../utils/mapUtils";
import logo from "../assets/logo.png";
import toast from "react-hot-toast";
import { ReportsSkeleton } from "../components/ReportsSkeleton";

// Leaflet icon fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// For custom church marker
const createChurchIcon = (color: string) => L.divIcon({
    html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; display: flex; items-center; justify-center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg></div>`,
    className: 'custom-church-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

// Component to handle map view updates
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

// --- Constants ---
const AGE_GROUPS = [
    { label: "0-12", min: 0, max: 12 },
    { label: "13-19", min: 13, max: 19 },
    { label: "20-35", min: 20, max: 35 },
    { label: "36-50", min: 36, max: 50 },
    { label: "50+", min: 51, max: 150 },
];

const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];
const EDUCATION_OPTIONS = ["High School", "Diploma", "Bachelor's", "Master's", "PhD"];
const EMPLOYMENT_OPTIONS = ["Employed", "Self-Employed", "Unemployed", "Student", "Retired"];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
};

export default function Reports() {
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
    const [demographicMarital, setDemographicMarital] = useState<any[]>([]);
    const [demographicEducation, setDemographicEducation] = useState<any[]>([]);
    const [demographicEmployment, setDemographicEmployment] = useState<any[]>([]);

    // Map state
    const [viewState, setViewState] = useState({
        latitude: DEFAULT_ETHIOPIA_CENTER.lat,
        longitude: DEFAULT_ETHIOPIA_CENTER.lng,
        zoom: DEFAULT_ETHIOPIA_CENTER.zoom || 10,
    });

    // Filtered churches for map (respects church filter)
    const mapChurches = useMemo(() => {
        if (selectedChurchId === "all") return churches;
        const c = churches.find((ch) => ch.id === selectedChurchId);
        return c ? [c] : [];
    }, [churches, selectedChurchId]);

    // Churches with valid coordinates from map_link
    const churchesWithCoords = useMemo(() => {
        return mapChurches
            .map((church) => {
                const coords = parseGoogleMapsUrl(church.map_link);
                if (coords) {
                    return { ...church, ...coords };
                }
                return null;
            })
            .filter(Boolean) as any[];
    }, [mapChurches]);

    // Fallback: churches without map_link get offset positions
    const churchesWithoutCoords = useMemo(() => {
        return mapChurches.filter((c) => !parseGoogleMapsUrl(c.map_link));
    }, [mapChurches]);

    useEffect(() => {
        fetchAllData();
    }, [selectedChurchId, dateRange]);

    // Update map view when filtered churches change
    useEffect(() => {
        if (churchesWithCoords.length > 0) {
            const first = churchesWithCoords[0];
            setViewState((prev) => ({
                ...prev,
                latitude: first.lat,
                longitude: first.lng,
                zoom: churchesWithCoords.length === 1 ? 14 : 10,
            }));
        } else if (churchesWithoutCoords.length > 0) {
            setViewState({
                latitude: DEFAULT_ETHIOPIA_CENTER.lat,
                longitude: DEFAULT_ETHIOPIA_CENTER.lng,
                zoom: 10,
            });
        }
    }, [churchesWithCoords.length, churchesWithoutCoords.length]);

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

            // 5. Fetch Activities (filter by church via entity_id)
            let activitiesCount = 0;
            if (selectedChurchId === "all") {
                const { count } = await supabase.from("activity_logs").select("*", { count: "exact", head: true });
                activitiesCount = count || 0;
            } else {
                const memberIds = (membersData || []).map((m: any) => m.id);
                const { data: deptData } = await supabase.from("departments").select("id").eq("church_id", selectedChurchId);
                const deptIds = (deptData || []).map((d: any) => d.id);
                const activityIds = new Set<string>();
                if (memberIds.length > 0) {
                    const { data: actData } = await supabase
                        .from("activity_logs")
                        .select("id")
                        .eq("entity_type", "MEMBER")
                        .in("entity_id", memberIds);
                    (actData || []).forEach((a: any) => activityIds.add(a.id));
                }
                if (deptIds.length > 0) {
                    const { data: actDept } = await supabase
                        .from("activity_logs")
                        .select("id")
                        .eq("entity_type", "DEPARTMENT")
                        .in("entity_id", deptIds);
                    (actDept || []).forEach((a: any) => activityIds.add(a.id));
                }
                activitiesCount = activityIds.size;
            }
            const activitiesArr = Array(activitiesCount || 0).fill({});

            const fetchedStats = {
                members: membersData || [],
                churches: churchesData || [],
                profiles: profilesData || [],
                departments: deptsData || [],
                activities: activitiesArr,
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
        const { members, profiles, departments, activities } = data;

        // --- 1. Growth Calculation ---
        const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const growthMap: { [key: string]: number } = {};

        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const rawMonth = monthsNames[d.getMonth()];
            const key = `${t(`common.months.${rawMonth}`)} ${d.getFullYear() % 100}`;
            growthMap[key] = 0;
        }

        members.forEach((m: any) => {
            const d = new Date(m.created_at);
            const rawMonth = monthsNames[d.getMonth()];
            const key = `${t(`common.months.${rawMonth}`)} ${d.getFullYear() % 100}`;
            if (growthMap.hasOwnProperty(key)) {
                growthMap[key]++;
            }
        });

        let runningTotal = members.length - Object.values(growthMap).reduce((a, b) => a + b, 0);
        const growthArr: any[] = Object.entries(growthMap).map(([month, count]) => {
            runningTotal += count;
            return { month, members: runningTotal };
        });

        if (growthArr.length >= 2) {
            const last = growthArr[growthArr.length - 1].members;
            const prev = growthArr[growthArr.length - 2].members;
            const diff = Math.max(0, last - prev);

            const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const nextRawMonth = monthsNames[nextMonthDate.getMonth()];
            growthArr.push({
                month: `${t(`common.months.${nextRawMonth}`)} ${nextMonthDate.getFullYear() % 100}`,
                members: last + diff,
                isProjected: true,
            });

            const secondMonthDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
            const secondRawMonth = monthsNames[secondMonthDate.getMonth()];
            growthArr.push({
                month: `${t(`common.months.${secondRawMonth}`)} ${secondMonthDate.getFullYear() % 100}`,
                members: last + diff * 2,
                isProjected: true,
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

        // --- 3. Demographics: Age ---
        const demoMap = AGE_GROUPS.map((g) => ({ ...g, count: 0 }));
        members.forEach((m: any) => {
            if (m.dob) {
                const age = calculateAge(m.dob);
                const group = demoMap.find((g) => age >= g.min && age <= g.max);
                if (group) group.count++;
            }
        });

        const totalWithAge = demoMap.reduce((acc, g) => acc + g.count, 0);
        setDemographicData(demoMap.map((g) => ({
            age: g.label,
            count: g.count,
            percentage: totalWithAge > 0 ? (g.count / totalWithAge) * 100 : 0
        })));

        // --- 4. Demographics: Marital Status ---
        const maritalMap: Record<string, number> = {};
        MARITAL_OPTIONS.forEach((o) => (maritalMap[o] = 0));
        maritalMap["Unknown"] = 0;
        members.forEach((m: any) => {
            const status = m.marital_status && MARITAL_OPTIONS.includes(m.marital_status) ? m.marital_status : "Unknown";
            maritalMap[status]++;
        });
        setDemographicMarital(
            Object.entries(maritalMap).map(([name, count]) => ({ name, count, fill: getMaritalColor(name) }))
        );

        // --- 5. Demographics: Education ---
        const eduMap: Record<string, number> = {};
        EDUCATION_OPTIONS.forEach((o) => (eduMap[o] = 0));
        eduMap["Unknown"] = 0;
        members.forEach((m: any) => {
            const level = m.educational_level && EDUCATION_OPTIONS.includes(m.educational_level) ? m.educational_level : "Unknown";
            eduMap[level]++;
        });
        setDemographicEducation(
            Object.entries(eduMap).map(([name, count]) => ({ name, count, fill: getEducationColor(name) }))
        );

        // --- 6. Demographics: Employment ---
        const empMap: Record<string, number> = {};
        EMPLOYMENT_OPTIONS.forEach((o) => (empMap[o] = 0));
        empMap["Unknown"] = 0;
        members.forEach((m: any) => {
            const status = m.employment_status && EMPLOYMENT_OPTIONS.includes(m.employment_status) ? m.employment_status : "Unknown";
            empMap[status]++;
        });
        setDemographicEmployment(
            Object.entries(empMap).map(([name, count]) => ({ name, count, fill: getEmploymentColor(name) }))
        );
    };

    const getMaritalColor = (name: string) => {
        const colors: Record<string, string> = {
            Single: "#6366f1",
            Married: "#10b981",
            Divorced: "#f59e0b",
            Widowed: "#64748b",
            Unknown: "#94a3b8",
        };
        return colors[name] || "#94a3b8";
    };

    const getEducationColor = (name: string) => {
        const colors: Record<string, string> = {
            "High School": "#3b82f6",
            Diploma: "#8b5cf6",
            "Bachelor's": "#06b6d4",
            "Master's": "#ec4899",
            PhD: "#f59e0b",
            Unknown: "#94a3b8",
        };
        return colors[name] || "#94a3b8";
    };

    const getEmploymentColor = (name: string) => {
        const colors: Record<string, string> = {
            Employed: "#10b981",
            "Self-Employed": "#3b82f6",
            Unemployed: "#ef4444",
            Student: "#8b5cf6",
            Retired: "#64748b",
            Unknown: "#94a3b8",
        };
        return colors[name] || "#94a3b8";
    };

    const calculateAge = (dob: string) => {
        const birthday = new Date(dob);
        const ageDifMs = Date.now() - birthday.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const churchName =
            selectedChurchId === "all" ? t("reports.allChurches") : churches.find((c) => c.id === selectedChurchId)?.name;

        const renderAmharicText = (text: string, size: number, color: string = "#000000", isBold: boolean = false) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return { data: "", width: 0, height: 0 };

            // Hi-res scaling for crispiness
            const scale = 4;
            // Clean up text if it's a translation key by mistake
            const cleanText = text.includes('.') && text.split('.').length > 2 ? t(text) : text;

            ctx.font = `${isBold ? "bold " : ""}${size * scale}px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif`;
            const metrics = ctx.measureText(cleanText);

            canvas.width = metrics.width + (12 * scale);
            canvas.height = (size * 1.6) * scale;

            ctx.font = `${isBold ? "bold " : ""}${size * scale}px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif`;
            ctx.fillStyle = color;
            ctx.textBaseline = "middle";
            ctx.fillText(cleanText, 6 * scale, canvas.height / 2);

            return {
                data: canvas.toDataURL("image/png"),
                width: (canvas.width / scale) * (72 / 96), // Convert px to pt approx
                height: (canvas.height / scale) * (72 / 96)
            };
        };

        const drawAmharic = (text: string, x: number, y: number, size: number, color: string = "#000000", isBold: boolean = false) => {
            const { data, width, height } = renderAmharicText(text, size, color, isBold);
            if (data) {
                // Adjust y to match baseline (approx)
                doc.addImage(data, "PNG", x, y - (height / 2), width, height);
            }
        };

        // Header
        doc.addImage(logo, "PNG", 15, 10, 25, 25);

        // Use standard text for English, but check if we need Amharic
        const titleText = t("reports.pdf.title") || "ETHIOPIAN GUENET CHURCH";
        drawAmharic(titleText, 45, 20, 18, "#1E3A8A", true);

        const subtitleText = t("reports.title");
        drawAmharic(subtitleText, 45, 30, 12, "#64748B", false);

        doc.setDrawColor(200, 200, 200);
        doc.line(15, 40, 195, 40);

        // Report metadata
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);

        const scopeLabel = t("reports.pdf.scope") || "Report Scope";
        drawAmharic(`${scopeLabel}: ${churchName}`, 15, 52, 9, "#505050");

        const rangeLabel = t("reports.pdf.dateRange") || "Date Range";
        const rangeVal = t(`reports.dateRanges.${dateRange}`) || dateRange.replace(/_/g, " ");
        drawAmharic(`${rangeLabel}: ${rangeVal}`, 15, 59, 9, "#505050");

        const generatedLabel = t("reports.pdf.generated") || "Generated";
        drawAmharic(`${generatedLabel}: ${new Date().toLocaleString()}`, 130, 52, 9, "#505050");

        const recordsLabel = t("reports.pdf.totalRecords") || "Total Records";
        drawAmharic(`${recordsLabel}: ${stats.members.length} ${t("sidebar.members")}`, 130, 59, 9, "#505050");

        // Summary Snapshot (Dashboard-like section)
        doc.setFillColor(240, 249, 255); // Light blue background
        doc.roundedRect(15, 68, 180, 28, 4, 4, "F"); // Increased height to 28 for padding

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        drawAmharic(t("reports.pdf.totalMembers"), 25, 76, 8, "#64748B", true);
        drawAmharic(t("reports.pdf.totalBranches"), 85, 76, 8, "#64748B", true);
        drawAmharic(t("reports.pdf.currentScope"), 145, 76, 8, "#64748B", true);

        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text(stats.members.length.toLocaleString(), 25, 86);
        doc.text(churches.length.toLocaleString(), 85, 86);

        const displayChurchName = churchName.length > 30 ? churchName.substring(0, 28) + "..." : churchName;
        // Check if churchName is Amharic
        const isAmharicName = /[\u1200-\u137F]/.test(displayChurchName);
        if (isAmharicName) {
            drawAmharic(displayChurchName, 145, 86, 10, "#1E3A8A", true);
        } else {
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text(displayChurchName, 145, 86);
        }

        let y = 108;

        const isAmharic = (text: any) => typeof text === 'string' && /[\u1200-\u137F]/.test(text);

        const willDrawCell = (data: any) => {
            if (isAmharic(data.cell.raw)) {
                data.cell.text = [""]; // Prevent original text from drawing
            }
        };

        const didDrawCell = (data: any) => {
            if (data.section === 'body' || data.section === 'head') {
                const text = data.cell.raw;
                if (isAmharic(text)) {
                    const { data: imgData, width, height } = renderAmharicText(
                        text,
                        data.section === 'head' ? 10 : 9,
                        data.section === 'head' ? "#FFFFFF" : "#000000",
                        data.section === 'head'
                    );
                    if (imgData) {
                        const x = data.cell.x + (data.cell.width - width) / 2;
                        const y = data.cell.y + (data.cell.height) / 2;
                        doc.addImage(imgData, "PNG", x, y - (height / 2), width, height);
                    }
                }
            }
        };

        // 1. Analytics Overview
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.overview") || "1. Analytics Overview", 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.category") || "Category", t("reports.pdf.count") || "Count", t("reports.pdf.percentage") || "Percentage"]],
            body: distributionData.map((f) => [
                f.category,
                f.amount.toLocaleString(),
                totalStats > 0 ? `${((f.amount / totalStats) * 100).toFixed(1)}%` : "0%",
            ]),
            theme: "striped",
            headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 4 },
            bodyStyles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        // Check if we need a new page
        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        // 2. Growth Forecasting
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.growth") || "2. Growth Forecasting", 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.month") || "Month", t("sidebar.members") || "Members", t("reports.pdf.status") || "Status"]],
            body: growthData.map((g) => [g.month, g.members, g.isProjected ? (t("reports.pdf.projected") || "Projected") : (t("reports.pdf.actual") || "Actual")]),
            theme: "striped",
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 4 },
            bodyStyles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        // 3. Age Demographics
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.age"), 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.ageGroup"), t("reports.pdf.count"), t("reports.pdf.percentage")]],
            body: demographicData.map((g) => {
                const total = demographicData.reduce((a, b) => a + b.count, 0);
                return [g.age + " " + t("reports.yrs"), g.count, total > 0 ? `${((g.count / total) * 100).toFixed(1)}%` : "0%"];
            }),
            theme: "striped",
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold", cellPadding: 5 },
            bodyStyles: { cellPadding: 5 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        // 4. Marital Status
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.marital"), 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.status"), t("reports.pdf.count"), t("reports.pdf.percentage")]],
            body: demographicMarital.map((g) => {
                const total = demographicMarital.reduce((a, b) => a + b.count, 0);
                const nameLabel = g.name === "Unknown" ? t("common.unknown") : (t(`members.form.maritalStatus.${g.name.toLowerCase()}`) || g.name);
                return [nameLabel, g.count, total > 0 ? `${((g.count / total) * 100).toFixed(1)}%` : "0%"];
            }),
            theme: "striped",
            headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: "bold", cellPadding: 4 },
            bodyStyles: { cellPadding: 4 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [253, 242, 248] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        // 5. Education Level
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.education"), 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.level"), t("reports.pdf.count"), t("reports.pdf.percentage")]],
            body: demographicEducation.map((g) => {
                const total = demographicEducation.reduce((a, b) => a + b.count, 0);
                // Map names to translation keys
                const eduKeyMap: Record<string, string> = {
                    "High School": "highSchool",
                    "Diploma": "diploma",
                    "Bachelor's": "bachelors",
                    "Master's": "masters",
                    "PhD": "phd"
                };
                const translatedName = g.name !== "Unknown" ? t(`members.form.${eduKeyMap[g.name] || g.name}`) : t("common.unknown");
                return [translatedName, g.count, total > 0 ? `${((g.count / total) * 100).toFixed(1)}%` : "0%"];
            }),
            theme: "striped",
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", cellPadding: 4 },
            bodyStyles: { cellPadding: 4 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 15;

        if (y > 230) {
            doc.addPage();
            y = 20;
        }

        // 6. Employment Status
        doc.setFontSize(14);
        drawAmharic(t("reports.pdf.employment"), 15, y, 14, "#000000", true);
        y += 8;
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.status"), t("reports.pdf.count"), t("reports.pdf.percentage")]],
            body: demographicEmployment.map((g) => {
                const total = demographicEmployment.reduce((a, b) => a + b.count, 0);
                // Map names to translation keys
                const empKeyMap: Record<string, string> = {
                    "Employed": "employed",
                    "Self-Employed": "selfEmployed",
                    "Unemployed": "unemployed",
                    "Student": "student",
                    "Retired": "retired"
                };
                const translatedName = g.name !== "Unknown" ? t(`members.form.${empKeyMap[g.name] || g.name}`) : t("common.unknown");
                return [translatedName, g.count, total > 0 ? `${((g.count / total) * 100).toFixed(1)}%` : "0%"];
            }),
            theme: "striped",
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold", cellPadding: 4 },
            bodyStyles: { cellPadding: 4 },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            margin: { left: 15, right: 15 },
            willDrawCell: willDrawCell,
            didDrawCell: didDrawCell
        });

        // Footer for all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`${t("reports.pdf.pageOf", { page: String(i), total: String(pageCount) })}`, 105, 285, { align: "center" });

            const footerNote = t("reports.pdf.generatedBy");
            doc.text(footerNote, 105, 290, { align: "center" });
        }

        doc.save(`Guenet_Report_${churchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success("PDF Exported successfully!");
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const churchName =
            selectedChurchId === "all" ? "All_Churches" : churches.find((c) => c.id === selectedChurchId)?.name?.replace(/\s+/g, "_") || "Report";

        // Overview
        const overviewData = distributionData.map((r) => ({
            [t("reports.excel.category")]: r.category,
            [t("reports.excel.count")]: r.amount,
            [t("reports.excel.percentage")]: totalStats > 0 ? `${((r.amount / totalStats) * 100).toFixed(1)}%` : "0%",
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), t("reports.excel.overview"));

        // Growth
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(
                growthData.map((g) => ({ [t("reports.excel.month")]: g.month, [t("reports.excel.members")]: g.members, [t("reports.excel.status")]: g.isProjected ? t("reports.pdf.projected") : t("reports.pdf.actual") }))
            ),
            t("reports.excel.growth")
        );

        // Age Demographics
        const totalAge = demographicData.reduce((a, b) => a + b.count, 0);
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(
                demographicData.map((g) => ({
                    [t("reports.excel.ageGroup")]: g.age + " " + t("reports.yrs"),
                    [t("reports.excel.count")]: g.count,
                    [t("reports.excel.percentage")]: totalAge > 0 ? `${((g.count / totalAge) * 100).toFixed(1)}%` : "0%",
                }))
            ),
            t("reports.excel.ageDemographics")
        );

        // Marital Status
        const totalMarital = demographicMarital.reduce((a, b) => a + b.count, 0);
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(
                demographicMarital.map((g) => ({
                    [t("reports.excel.status")]: t(`members.form.maritalStatus.${g.name.toLowerCase()}`) || g.name,
                    [t("reports.excel.count")]: g.count,
                    [t("reports.excel.percentage")]: totalMarital > 0 ? `${((g.count / totalMarital) * 100).toFixed(1)}%` : "0%",
                }))
            ),
            t("reports.excel.maritalStatus")
        );

        // Education
        const totalEdu = demographicEducation.reduce((a, b) => a + b.count, 0);
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(
                demographicEducation.map((g) => {
                    const eduKeyMap: Record<string, string> = {
                        "High School": "highSchool",
                        "Diploma": "diploma",
                        "Bachelor's": "bachelors",
                        "Master's": "masters",
                        "PhD": "phd"
                    };
                    const translatedName = g.name !== "Unknown" ? t(`members.form.${eduKeyMap[g.name] || g.name}`) : t("common.unknown");
                    return {
                        [t("reports.excel.level")]: translatedName,
                        [t("reports.excel.count")]: g.count,
                        [t("reports.excel.percentage")]: totalEdu > 0 ? `${((g.count / totalEdu) * 100).toFixed(1)}%` : "0%",
                    };
                })
            ),
            t("reports.excel.educationLevel")
        );

        // Employment
        const totalEmp = demographicEmployment.reduce((a, b) => a + b.count, 0);
        XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(
                demographicEmployment.map((g) => {
                    const empKeyMap: Record<string, string> = {
                        "Employed": "employed",
                        "Self-Employed": "selfEmployed",
                        "Unemployed": "unemployed",
                        "Student": "student",
                        "Retired": "retired"
                    };
                    const translatedName = g.name !== "Unknown" ? t(`members.form.${empKeyMap[g.name] || g.name}`) : t("common.unknown");
                    return {
                        [t("reports.excel.status")]: translatedName,
                        [t("reports.excel.count")]: g.count,
                        [t("reports.excel.percentage")]: totalEmp > 0 ? `${((g.count / totalEmp) * 100).toFixed(1)}%` : "0%",
                    };
                })
            ),
            t("reports.excel.employmentStatus")
        );

        // Church locations (for map reference)
        const churchSheet = mapChurches.map((c) => ({
            [t("reports.excel.name")]: c.name,
            [t("reports.excel.location")]: c.location || "",
            [t("reports.excel.mapLink")]: c.map_link || "",
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(churchSheet), t("reports.excel.churchLocations"));

        XLSX.writeFile(wb, `Guenet_Report_${churchName}_${new Date().toISOString().split("T")[0]}.xlsx`);
        toast.success("Excel Exported successfully!");
    };

    const totalStats = useMemo(() => distributionData.reduce((acc, curr) => acc + curr.amount, 0), [distributionData]);

    if (loading) {
        return <ReportsSkeleton />;
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 sm:space-y-8 pb-20 px-2 sm:px-4"
        >
            {/* --- HERO HEADER --- */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-2xl"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)" }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", bounce: 0.5 }}
            >
                <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-blue-400/20 blur-[80px] sm:blur-[100px] rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-emerald-400/10 blur-[60px] sm:blur-[80px] rounded-full -ml-16 sm:-ml-20 -mb-16 sm:-mb-20" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                            <Sparkles size={14} className="text-blue-300" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                                {t("reports.title")}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            {t("reports.headerChurch")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">{t("reports.intelligent")}</span> {t("reports.headerReports")}
                        </h1>
                        <p className="text-blue-100/70 max-w-xl font-medium text-xs sm:text-sm md:text-base">
                            {t("reports.subtitle")}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white text-blue-600 font-bold text-xs sm:text-sm shadow-xl"
                        >
                            <Download size={18} />
                            {t("reports.exportPdf")}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl"
                        >
                            <FileText size={18} />
                            {t("reports.exportExcel")}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* --- FILTERS BAR --- */}
            <motion.div
                variants={itemVariants}
                className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center p-4 sm:p-6 rounded-2xl sm:rounded-[2rem]"
                style={d.card}
            >
                <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0 sm:min-w-[200px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">
                            {t("reports.selectChurch")}
                        </label>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={selectedChurchId}
                                onChange={(e) => setSelectedChurchId(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none font-bold text-sm"
                                style={d.formInput}
                            >
                                <option value="all">{t("reports.allChurches")}</option>
                                {churches.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-0 sm:min-w-[180px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">
                            {t("reports.dateRange")}
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                style={d.formInput}
                            >
                                <option value="last_30_days">{t("reports.dateRanges.last_30_days")}</option>
                                <option value="last_3_months">{t("reports.dateRanges.last_3_months")}</option>
                                <option value="last_6_months">{t("reports.dateRanges.last_6_months")}</option>
                                <option value="last_year">{t("reports.dateRanges.last_year")}</option>
                                <option value="all_time">{t("reports.dateRanges.all_time")}</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-2 sm:p-4 lg:p-6 lg:border-l border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => setViewMode("visual")}
                        className={`p-2.5 sm:p-3 rounded-xl transition-all ${viewMode === "visual" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                        <PieIcon size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`p-2.5 sm:p-3 rounded-xl transition-all ${viewMode === "table" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                        <BarChart3 size={20} />
                    </button>
                </div>
            </motion.div>

            {/* --- DASHBOARD CONTENT --- */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                {/* --- LEFT COLUMN --- */}
                <div className="xl:col-span-2 space-y-6 sm:space-y-8">
                    {/* Analytics Overview */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-transparent shadow-xl overflow-hidden relative"
                        style={d.card}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <DollarSign size={22} className="sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100">
                                        {t("reports.overview")}
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        {t("dashboard.analytics.globalMetrics")}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100">
                                    {totalStats.toLocaleString()}
                                </p>
                                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                    <ArrowUpRight size={14} />
                                    <span>{t("dashboard.activity.liveActivity")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
                            <div className="h-[220px] sm:h-[250px] min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distributionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="category" type="category" hide />
                                        <Tooltip
                                            cursor={{ fill: "transparent" }}
                                            contentStyle={{
                                                borderRadius: "16px",
                                                border: "none",
                                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                            }}
                                        />
                                        <Bar dataKey="amount" radius={[0, 10, 10, 0]}>
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3 sm:space-y-4">
                                {distributionData.map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                                        whileHover={{ scale: 1.02, x: -5 }}
                                        className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 truncate">
                                                {item.category}
                                            </span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100 shrink-0 ml-2">
                                            {item.amount.toLocaleString()}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Growth Forecasting */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-transparent shadow-xl relative overflow-hidden"
                        style={d.card}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    whileHover={{ rotate: 15, scale: 1.1 }}
                                    className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"
                                >
                                    <TrendingUp size={22} className="sm:w-6 sm:h-6" />
                                </motion.div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100">
                                        {t("reports.forecasting")}
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        {t("reports.projections")}
                                    </p>
                                </div>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-emerald-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-lg shadow-emerald-500/20"
                            >
                                {t("reports.predictiveAiEnabled")}
                            </motion.div>
                        </div>

                        <div className="h-[260px] sm:h-[300px] min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 600, fill: "#94a3b8" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: "16px",
                                            border: "none",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="members"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorMembers)"
                                        dot={{ r: 5, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                                        activeDot={{ r: 7, strokeWidth: 0 }}
                                        animationDuration={1500}
                                        animationEasing="ease-in-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-4 sm:gap-8">
                            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {t("reports.historicalData")}
                                </span>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {t("reports.aiForecast")}
                                </span>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                {/* --- RIGHT COLUMN: Map & Demographics --- */}
                <div className="space-y-6 sm:space-y-8">
                    {/* Branch Distribution Map */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="rounded-2xl sm:rounded-[2.5rem] border border-transparent shadow-xl overflow-hidden relative"
                        style={d.card}
                    >
                        <div className="p-4 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                    <MapIcon size={22} className="sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 truncate">
                                        {t("reports.branchDensity")}
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        {t("reports.distribution")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[320px] sm:h-[380px] md:h-[400px] relative">
                            <div className="h-full w-full z-0">
                                <MapContainer
                                    center={[viewState.latitude, viewState.longitude]}
                                    zoom={viewState.zoom}
                                    style={{ width: "100%", height: "100%" }}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    />
                                    <MapUpdater center={[viewState.latitude, viewState.longitude]} zoom={viewState.zoom} />

                                    {churchesWithCoords.map((church) => (
                                        <LeafletMarker
                                            key={church.id}
                                            position={[church.lat, church.lng]}
                                            icon={createChurchIcon('#3b82f6')}
                                        >
                                            <Popup>
                                                <div className="p-1">
                                                    <p className="text-sm font-black text-gray-900">{church.name}</p>
                                                    <p className="text-xs text-gray-500">{church.location || t("reports.noLocation")}</p>
                                                    {church.map_link && (
                                                        <a
                                                            href={church.map_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-blue-500 font-bold hover:underline"
                                                        >
                                                            <ExternalLink size={10} />
                                                            {t("reports.openInMaps")}
                                                        </a>
                                                    )}
                                                </div>
                                            </Popup>
                                        </LeafletMarker>
                                    ))}

                                    {churchesWithoutCoords.map((church, idx) => (
                                        <LeafletMarker
                                            key={church.id}
                                            position={[
                                                DEFAULT_ETHIOPIA_CENTER.lat + (idx + 1) * 0.01,
                                                DEFAULT_ETHIOPIA_CENTER.lng + (idx + 1) * 0.02
                                            ]}
                                            icon={createChurchIcon('#f59e0b')}
                                        >
                                            <Popup>
                                                <div className="p-1">
                                                    <p className="text-sm font-black text-gray-900">{church.name}</p>
                                                    <p className="text-xs text-amber-600">{t("reports.noMapLink")}</p>
                                                </div>
                                            </Popup>
                                        </LeafletMarker>
                                    ))}
                                </MapContainer>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-white/20">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-blue-500" />
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                                {t("reports.branches")} ({mapChurches.length})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-amber-500" />
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                                                {t("reports.noMapLink")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Demographic Heatmap - Ultra Professional */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-transparent shadow-xl relative overflow-hidden"
                        style={d.card}
                    >
                        <div className="flex items-center gap-3 mb-6 sm:mb-8">
                            <motion.div
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"
                            >
                                <Users size={22} className="sm:w-6 sm:h-6" />
                            </motion.div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100">
                                    {t("reports.demographics")}
                                </h2>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    {t("reports.memberInsights")}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 sm:space-y-8">
                            {/* Age Distribution - Heatmap style */}
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                        <Users size={14} className="text-violet-600" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                        {t("reports.ageDistribution")}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                                    <AnimatePresence>
                                        {demographicData.map((item, idx) => {
                                            const maxVal = Math.max(...demographicData.map((d) => d.count), 1);
                                            const intensity = item.count / maxVal;
                                            const bgOpacity = 0.2 + intensity * 0.8;
                                            return (
                                                <motion.div
                                                    key={idx + '-' + item.age}
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: idx * 0.05, type: 'spring' }}
                                                    className="relative group flex flex-col items-center justify-center p-6 rounded-[2.5rem] border border-violet-200/50 dark:border-violet-500/20 shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden min-h-[160px]"
                                                    style={{
                                                        background: isDark
                                                            ? `linear-gradient(180deg, rgba(139, 92, 246, ${bgOpacity * 0.4}) 0%, rgba(99, 102, 241, ${bgOpacity * 0.3}) 100%)`
                                                            : `linear-gradient(180deg, rgba(139, 92, 246, ${bgOpacity}) 0%, rgba(99, 102, 241, ${bgOpacity * 0.8}) 100%)`,
                                                    }}
                                                >
                                                    {/* Internal Glass Shine */}
                                                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 blur-xl -translate-y-1/2 rounded-full" />

                                                    <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                                                        <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDark ? "text-violet-300" : "text-white/80"}`}>
                                                            {item.age} {t("reports.yrs")}
                                                        </p>
                                                        <motion.p
                                                            initial={{ scale: 0.5 }}
                                                            whileInView={{ scale: 1 }}
                                                            viewport={{ once: true }}
                                                            transition={{ type: "spring", stiffness: 200, delay: 0.2 + idx * 0.05 }}
                                                            className={`text-4xl sm:text-5xl font-black leading-none ${isDark ? "text-white" : "text-white"}`}
                                                        >
                                                            {item.count}
                                                        </motion.p>
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${isDark ? "bg-violet-900/50 text-violet-200" : "bg-white/20 text-white"}`}>
                                                            {item.percentage.toFixed(0)}%
                                                        </span>
                                                    </div>

                                                    {/* Bottom Scale - Horizontal Progress */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/5">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            whileInView={{ width: `${(item.count / maxVal) * 100}%` }}
                                                            viewport={{ once: true }}
                                                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 + idx * 0.05 }}
                                                            className="h-full bg-white/60 dark:bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                                        />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Marital Status */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                        <Heart size={14} className="text-pink-600" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                        {t("reports.maritalStatus")}
                                    </h3>
                                </div>
                                <div className="space-y-2 sm:space-y-3">
                                    {demographicMarital.map((item, idx) => {
                                        const total = demographicMarital.reduce((a, b) => a + b.count, 0);
                                        const pct = total > 0 ? (item.count / total) * 100 : 0;
                                        return (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                                                        {item.name === "Unknown" ? t("common.unknown") : (t(`members.form.maritalStatus.${item.name.toLowerCase()}`) || item.name)}
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100">
                                                        {item.count} ({pct.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 sm:h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${pct}%` }}
                                                        viewport={{ once: true }}
                                                        transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: item.fill }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Education & Employment - Compact grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <GraduationCap size={14} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                            {t("reports.education")}
                                        </h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {demographicEducation.slice(0, 4).map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="flex justify-between text-[10px] sm:text-xs"
                                            >
                                                <span className="font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                                                    {(() => {
                                                        const eduKeyMap: Record<string, string> = {
                                                            "High School": "highSchool",
                                                            "Diploma": "diploma",
                                                            "Bachelor's": "bachelors",
                                                            "Master's": "masters",
                                                            "PhD": "phd"
                                                        };
                                                        return item.name !== "Unknown" ? t(`members.form.${eduKeyMap[item.name] || item.name}`) : t("common.unknown");
                                                    })()}
                                                </span>
                                                <span className="font-black text-gray-900 dark:text-gray-100 shrink-0">
                                                    {item.count}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Briefcase size={14} className="text-emerald-600" />
                                        </div>
                                        <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                            {t("reports.employment")}
                                        </h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {demographicEmployment.slice(0, 4).map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="flex justify-between text-[10px] sm:text-xs"
                                            >
                                                <span className="font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                                                    {(() => {
                                                        const empKeyMap: Record<string, string> = {
                                                            "Employed": "employed",
                                                            "Self-Employed": "selfEmployed",
                                                            "Unemployed": "unemployed",
                                                            "Student": "student",
                                                            "Retired": "retired"
                                                        };
                                                        return item.name !== "Unknown" ? t(`members.form.${empKeyMap[item.name] || item.name}`) : t("common.unknown");
                                                    })()}
                                                </span>
                                                <span className="font-black text-gray-900 dark:text-gray-100 shrink-0">
                                                    {item.count}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
