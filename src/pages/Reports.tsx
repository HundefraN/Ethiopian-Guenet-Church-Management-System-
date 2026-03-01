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
import { useAuth } from "../context/AuthContext";
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
    html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div class="marker-pulse-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color};"></div>
            <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); z-index: 10;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10l-10-8-10 8"/><path d="M6 10v12h12V10"/><path d="M12 16v6"/></svg>
            </div>
        </div>
    `,
    className: 'custom-church-icon-premium',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
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
    const { profile } = useAuth();
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

        setGrowthData(growthArr);

        // --- 2. Distribution Calculation ---
        const pastorsCount = profiles.filter((p: any) => p.role === "pastor").length;
        const servantsCount = profiles.filter((p: any) => p.role === "servant").length;

        setDistributionData([
            { category: t("sidebar.members"), amount: members.length, color: "#10b981" },
            { category: t("sidebar.pastors"), amount: pastorsCount, color: "#3b82f6" },
            { category: t("sidebar.servants"), amount: servantsCount, color: "#f59e0b" },
            ...(profile?.role !== "servant" ? [{ category: t("sidebar.departments"), amount: departments.length, color: "#8b5cf6" }] : []),
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
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;
        const isSpecificChurch = selectedChurchId !== "all";
        const churchName =
            isSpecificChurch ? churches.find((c) => c.id === selectedChurchId)?.name || "Church" : t("reports.allChurches");

        // ─── Amharic Text Rendering Utilities ───
        const renderAmharicText = (text: string, size: number, color: string = "#000000", isBold: boolean = false) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return { data: "", width: 0, height: 0 };
            const scale = 4;
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
                width: (canvas.width / scale) * (25.4 / 96), // Convert px to mm (jsPDF default unit)
                height: (canvas.height / scale) * (25.4 / 96) // Convert px to mm (jsPDF default unit)
            };
        };

        const drawAmharic = (text: string, x: number, y: number, size: number, color: string = "#000000", isBold: boolean = false) => {
            const { data, width, height } = renderAmharicText(text, size, color, isBold);
            if (data) {
                doc.addImage(data, "PNG", x, y - (height / 2), width, height);
            }
        };

        const isEthiopic = (text: any) => typeof text === 'string' && /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/.test(text);

        const smartText = (text: string, x: number, y: number, size: number, color: string = "#000000", isBold: boolean = false) => {
            if (isEthiopic(text)) {
                drawAmharic(text, x, y, size * 0.9, color, isBold); // Slight size reduction for taller Ethiopic chars
            } else {
                doc.setFontSize(size);
                doc.setTextColor(color);
                if (isBold) doc.setFont("helvetica", "bold");
                else doc.setFont("helvetica", "normal");
                doc.text(text, x, y);
            }
        };

        // ─── Page Break Helper ───
        const checkPageBreak = (currentY: number, requiredSpace: number = 60): number => {
            if (currentY + requiredSpace > pageHeight - 30) {
                doc.addPage();
                return 25;
            }
            return currentY;
        };

        // ─── Draw Section Header with Modern Accent ───
        const drawSectionHeader = (title: string, yPos: number, accentColor: [number, number, number]): number => {
            yPos = checkPageBreak(yPos, 50);
            // Accent bar
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.roundedRect(margin, yPos, 4, 14, 2, 2, "F");
            // Section title
            smartText(title, margin + 8, yPos + 9, 13, `rgb(${accentColor.join(",")})`, true);
            // Subtle line
            doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos + 17, pageWidth - margin, yPos + 17);
            return yPos + 22;
        };

        // ─── Amharic-aware autoTable hooks ───
        const willDrawCell = (data: any) => {
            if (isEthiopic(data.cell.raw)) {
                data.cell.text = [""];
            }
        };

        const didDrawCell = (data: any) => {
            if (data.section === 'body' || data.section === 'head') {
                const text = data.cell.raw;
                if (isEthiopic(text)) {
                    const { data: imgData, width, height } = renderAmharicText(
                        text,
                        data.section === 'head' ? 9 * 0.9 : 8 * 0.9,
                        data.section === 'head' ? "#FFFFFF" : "#334155",
                        data.section === 'head'
                    );
                    if (imgData) {
                        const x = data.cell.x + (data.cell.width - width) / 2;
                        const cellY = data.cell.y + (data.cell.height) / 2;
                        doc.addImage(imgData, "PNG", x, cellY - (height / 2), width, height);
                    }
                }
            }
        };

        // ─── Visual Percentage Bar in Tables ───
        const didDrawCellWithBar = (barColor: [number, number, number]) => (data: any) => {
            // First handle Amharic text
            didDrawCell(data);
            // Draw percentage bar for the last column in body rows
            if (data.section === 'body' && data.column.index === 3) {
                const pctText = String(data.cell.raw).replace('%', '');
                const pct = parseFloat(pctText) || 0;
                const barWidth = (data.cell.width - 8) * (pct / 100);
                const barX = data.cell.x + 4;
                const barY = data.cell.y + data.cell.height - 5;
                // Background track
                doc.setFillColor(230, 230, 235);
                doc.roundedRect(barX, barY, data.cell.width - 8, 3, 1.5, 1.5, "F");
                // Fill bar
                if (barWidth > 0) {
                    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
                    doc.roundedRect(barX, barY, Math.max(barWidth, 3), 3, 1.5, 1.5, "F");
                }
            }
        };

        // ═══════════════════════════════════════════════════════════════
        // ░░░ PAGE 1: COVER / HEADER ░░░
        // ═══════════════════════════════════════════════════════════════

        // ── Gradient Header Background ──
        const gradSteps = 40;
        const headerHeight = 52;
        for (let i = 0; i < gradSteps; i++) {
            const ratio = i / gradSteps;
            const r = Math.round(15 + ratio * 30);
            const g = Math.round(23 + ratio * 58);
            const b = Math.round(42 + ratio * 100);
            doc.setFillColor(r, g, b);
            doc.rect(0, (headerHeight / gradSteps) * i, pageWidth, headerHeight / gradSteps + 0.5, "F");
        }

        // ── Decorative Circle Accents ──
        doc.setFillColor(59, 130, 246);
        doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.circle(pageWidth - 25, 15, 30, "F");
        doc.circle(pageWidth - 55, 40, 18, "F");
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

        // ── Logo ──
        doc.addImage(logo, "PNG", margin, 8, 22, 22);

        // ── Header Text ──
        const titleText = t("reports.pdf.title") || "ETHIOPIAN GUENET CHURCH";
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        if (isEthiopic(titleText)) {
            drawAmharic(titleText, margin + 28, 18, 18 * 0.9, "#FFFFFF", true);
        } else {
            doc.text(titleText, margin + 28, 20);
        }

        const subtitleText = t("reports.title") || "Report Generator";
        doc.setFontSize(10);
        doc.setTextColor(180, 200, 255);
        doc.setFont("helvetica", "normal");
        if (isEthiopic(subtitleText)) {
            drawAmharic(subtitleText, margin + 28, 28, 10 * 0.9, "#B4C8FF", false);
        } else {
            doc.text(subtitleText, margin + 28, 28);
        }

        // ── Report meta badge ──
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFillColor(255, 255, 255);
        doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
        doc.roundedRect(margin, 36, contentWidth, 11, 3, 3, "F");
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        doc.setFontSize(7.5);
        doc.setTextColor(200, 215, 255);
        doc.setFont("helvetica", "normal");
        const rangeVal = t(`reports.dateRanges.${dateRange}`) || dateRange.replace(/_/g, " ");
        const fullMeta = `${churchName}  |  ${rangeVal}  |  ${dateStr}`;
        smartText(fullMeta, margin + 4, 43, 7.5, "#C8D7FF", false);

        // ── Thin accent line under header ──
        doc.setFillColor(59, 130, 246);
        doc.rect(0, headerHeight, pageWidth, 1.5, "F");
        doc.setFillColor(16, 185, 129);
        doc.rect(0, headerHeight + 1.5, pageWidth * 0.4, 0.8, "F");

        let y = headerHeight + 10;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ KPI SUMMARY CARDS ░░░
        // ═══════════════════════════════════════════════════════════════

        const pastorsCount = stats.profiles.filter((p: any) => p.role === "pastor").length;
        const servantsCount = stats.profiles.filter((p: any) => p.role === "servant").length;

        // Build KPI items based on context
        const kpiItems: { label: string; value: string; color: [number, number, number]; icon: string }[] = [
            { label: t("reports.pdf.totalMembers"), value: stats.members.length.toLocaleString(), color: [16, 185, 129], icon: "" },
        ];

        // Only show branch count when viewing ALL churches
        if (!isSpecificChurch) {
            kpiItems.push({ label: t("reports.pdf.totalBranches"), value: churches.length.toLocaleString(), color: [59, 130, 246], icon: "" });
        }

        kpiItems.push(
            { label: t("sidebar.pastors"), value: pastorsCount.toLocaleString(), color: [139, 92, 246], icon: "" },
            { label: t("sidebar.servants"), value: servantsCount.toLocaleString(), color: [245, 158, 11], icon: "" },
        );

        if (profile?.role !== "servant") {
            kpiItems.push({ label: t("sidebar.departments"), value: stats.departments.length.toLocaleString(), color: [236, 72, 153], icon: "" });
        }

        const cardCount = kpiItems.length;
        const cardGap = 4;
        const cardW = (contentWidth - (cardCount - 1) * cardGap) / cardCount;
        const cardH = 26;

        kpiItems.forEach((kpi, i) => {
            const cx = margin + i * (cardW + cardGap);
            // Card background
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");
            // Left accent bar
            doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.roundedRect(cx, y, 3, cardH, 1.5, 1.5, "F");
            // Icon
            doc.setFontSize(10);
            doc.text(kpi.icon, cx + 6, y + 10);
            // Value
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "bold");
            doc.text(kpi.value, cx + 6, y + 20);
            // Label
            if (isEthiopic(kpi.label)) {
                drawAmharic(kpi.label, cx + 6 + doc.getTextWidth(kpi.value) + 2, y + 20, 6 * 0.9, "#94A3B8", false);
            } else {
                doc.setFontSize(6);
                doc.setTextColor(148, 163, 184);
                doc.setFont("helvetica", "normal");
                doc.text(kpi.label, cx + 6 + doc.getTextWidth(kpi.value) + 3, y + 20);
            }
        });

        y += cardH + 10;

        // ── Scope badge ──
        doc.setFillColor(isSpecificChurch ? 239 : 240, isSpecificChurch ? 246 : 249, isSpecificChurch ? 255 : 255);
        doc.roundedRect(margin, y, contentWidth, 10, 3, 3, "F");
        doc.setFillColor(isSpecificChurch ? 59 : 16, isSpecificChurch ? 130 : 185, isSpecificChurch ? 246 : 129);
        doc.roundedRect(margin, y, 3, 10, 1.5, 1.5, "F");
        // Removed scope icons contextually
        const scopeText = isSpecificChurch
            ? `${t("reports.pdf.scope")}: ${churchName}`
            : `${t("reports.pdf.scope")}: ${t("reports.allChurches")} (${churches.length} ${t("reports.branches")})`;
        smartText(scopeText, margin + 8, y + 7, 8, "#1E3A8A", true);

        y += 16;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 1: ANALYTICS OVERVIEW ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.overview") || "1. Analytics Overview", y, [30, 58, 138]);

        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.category"), t("reports.pdf.count"), t("reports.pdf.percentage"), ""]],
            body: distributionData.map((f) => {
                const pct = totalStats > 0 ? ((f.amount / totalStats) * 100).toFixed(1) : "0.0";
                return [f.category, f.amount.toLocaleString(), `${pct}%`, `${pct}%`];
            }),
            theme: "plain",
            headStyles: {
                fillColor: [30, 58, 138], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
                lineWidth: 0
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', cellWidth: 'auto', textColor: [255, 255, 255], fontSize: 1 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: margin, right: margin },
            willDrawCell: (data: any) => {
                willDrawCell(data);
                if (data.section === 'head' && data.column.index === 3) {
                    data.cell.text = [""];
                }
            },
            didDrawCell: didDrawCellWithBar([30, 58, 138])
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 2: GROWTH HISTORY ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.growth") || "2. Member Growth History", y, [16, 185, 129]);

        // Draw a mini chart area
        const chartH = 35;
        const chartW = contentWidth;
        y = checkPageBreak(y, chartH + 40);

        // Chart background
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(margin, y, chartW, chartH, 3, 3, "F");

        // Draw simplified sparkline
        if (growthData.length > 1) {
            const maxVal = Math.max(...growthData.map(g => g.members), 1);
            const minVal = Math.min(...growthData.map(g => g.members));
            const range = maxVal - minVal || 1;
            const stepX = (chartW - 20) / (growthData.length - 1);

            // Grid lines
            doc.setDrawColor(200, 230, 210);
            doc.setLineWidth(0.2);
            for (let i = 0; i < 4; i++) {
                const gy = y + 5 + (chartH - 10) * (i / 3);
                doc.line(margin + 10, gy, margin + chartW - 10, gy);
            }

            // Sparkline
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(1.2);
            for (let i = 0; i < growthData.length - 1; i++) {
                const x1 = margin + 10 + i * stepX;
                const x2 = margin + 10 + (i + 1) * stepX;
                const y1 = y + chartH - 5 - ((growthData[i].members - minVal) / range) * (chartH - 15);
                const y2 = y + chartH - 5 - ((growthData[i + 1].members - minVal) / range) * (chartH - 15);
                doc.line(x1, y1, x2, y2);
            }

            // Data point dots
            doc.setFillColor(16, 185, 129);
            growthData.forEach((g, i) => {
                const px = margin + 10 + i * stepX;
                const py = y + chartH - 5 - ((g.members - minVal) / range) * (chartH - 15);
                doc.circle(px, py, 1.5, "F");
                // Value label
                doc.setFontSize(5.5);
                doc.setTextColor(15, 23, 42);
                doc.setFont("helvetica", "bold");
                doc.text(g.members.toString(), px, py - 4, { align: "center" });
            });
        }

        y += chartH + 5;

        // Growth data table
        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.month"), t("sidebar.members")]],
            body: growthData.map((g) => [g.month, g.members.toLocaleString()]),
            theme: "plain",
            headStyles: {
                fillColor: [16, 185, 129], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 }
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: contentWidth * 0.6 },
                1: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            margin: { left: margin, right: margin },
            willDrawCell, didDrawCell
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 3: AGE DEMOGRAPHICS ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.age") || "3. Age Distribution", y, [139, 92, 246]);

        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.ageGroup"), t("reports.pdf.count"), t("reports.pdf.percentage"), ""]],
            body: demographicData.map((g) => {
                const total = demographicData.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : "0.0";
                return [g.age + " " + t("reports.yrs"), g.count.toLocaleString(), `${pct}%`, `${pct}%`];
            }),
            theme: "plain",
            headStyles: {
                fillColor: [139, 92, 246], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', textColor: [255, 255, 255], fontSize: 1 }
            },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            margin: { left: margin, right: margin },
            willDrawCell: (data: any) => {
                willDrawCell(data);
                if (data.section === 'head' && data.column.index === 3) data.cell.text = [""];
            },
            didDrawCell: didDrawCellWithBar([139, 92, 246])
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 4: MARITAL STATUS ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.marital") || "4. Marital Status", y, [236, 72, 153]);

        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.status"), t("reports.pdf.count"), t("reports.pdf.percentage"), ""]],
            body: demographicMarital.map((g) => {
                const total = demographicMarital.reduce((a, b) => a + b.count, 0);
                const nameLabel = g.name === "Unknown" ? t("common.unknown") : (t(`members.form.maritalStatus.${g.name.toLowerCase()}`) || g.name);
                const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : "0.0";
                return [nameLabel, g.count.toLocaleString(), `${pct}%`, `${pct}%`];
            }),
            theme: "plain",
            headStyles: {
                fillColor: [236, 72, 153], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', textColor: [255, 255, 255], fontSize: 1 }
            },
            alternateRowStyles: { fillColor: [253, 242, 248] },
            margin: { left: margin, right: margin },
            willDrawCell: (data: any) => {
                willDrawCell(data);
                if (data.section === 'head' && data.column.index === 3) data.cell.text = [""];
            },
            didDrawCell: didDrawCellWithBar([236, 72, 153])
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 5: EDUCATION LEVEL ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.education") || "5. Education Level", y, [59, 130, 246]);

        const eduKeyMap: Record<string, string> = {
            "High School": "highSchool", "Diploma": "diploma",
            "Bachelor's": "bachelors", "Master's": "masters", "PhD": "phd"
        };

        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.level"), t("reports.pdf.count"), t("reports.pdf.percentage"), ""]],
            body: demographicEducation.map((g) => {
                const total = demographicEducation.reduce((a, b) => a + b.count, 0);
                const translatedName = g.name !== "Unknown" ? t(`members.form.${eduKeyMap[g.name] || g.name}`) : t("common.unknown");
                const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : "0.0";
                return [translatedName, g.count.toLocaleString(), `${pct}%`, `${pct}%`];
            }),
            theme: "plain",
            headStyles: {
                fillColor: [59, 130, 246], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', textColor: [255, 255, 255], fontSize: 1 }
            },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            margin: { left: margin, right: margin },
            willDrawCell: (data: any) => {
                willDrawCell(data);
                if (data.section === 'head' && data.column.index === 3) data.cell.text = [""];
            },
            didDrawCell: didDrawCellWithBar([59, 130, 246])
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // ═══════════════════════════════════════════════════════════════
        // ░░░ SECTION 6: EMPLOYMENT STATUS ░░░
        // ═══════════════════════════════════════════════════════════════

        y = drawSectionHeader(t("reports.pdf.employment") || "6. Employment Status", y, [245, 158, 11]);

        const empKeyMap: Record<string, string> = {
            "Employed": "employed", "Self-Employed": "selfEmployed",
            "Unemployed": "unemployed", "Student": "student", "Retired": "retired"
        };

        autoTable(doc, {
            startY: y,
            head: [[t("reports.pdf.status"), t("reports.pdf.count"), t("reports.pdf.percentage"), ""]],
            body: demographicEmployment.map((g) => {
                const total = demographicEmployment.reduce((a, b) => a + b.count, 0);
                const translatedName = g.name !== "Unknown" ? t(`members.form.${empKeyMap[g.name] || g.name}`) : t("common.unknown");
                const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : "0.0";
                return [translatedName, g.count.toLocaleString(), `${pct}%`, `${pct}%`];
            }),
            theme: "plain",
            headStyles: {
                fillColor: [245, 158, 11], textColor: 255,
                fontStyle: "bold", fontSize: 8.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
            },
            bodyStyles: {
                fontSize: 8.5, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: { bottom: 0.3 }
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', textColor: [255, 255, 255], fontSize: 1 }
            },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            margin: { left: margin, right: margin },
            willDrawCell: (data: any) => {
                willDrawCell(data);
                if (data.section === 'head' && data.column.index === 3) data.cell.text = [""];
            },
            didDrawCell: didDrawCellWithBar([245, 158, 11])
        });

        // ═══════════════════════════════════════════════════════════════
        // ░░░ FOOTER ON ALL PAGES ░░░
        // ═══════════════════════════════════════════════════════════════

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Footer gradient bar
            doc.setFillColor(15, 23, 42);
            doc.rect(0, pageHeight - 16, pageWidth, 16, "F");
            doc.setFillColor(59, 130, 246);
            doc.rect(0, pageHeight - 16, pageWidth, 0.8, "F");

            // Left: branding
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "normal");
            const footerNote = t("reports.pdf.generatedBy");
            if (isEthiopic(footerNote)) {
                drawAmharic(footerNote, margin, pageHeight - 8, 6 * 0.9, "#94A3B8", false);
            } else {
                doc.text(footerNote, margin, pageHeight - 8);
            }

            // Right: page number
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "bold");
            const pageText = t("reports.pdf.pageOf", { page: String(i), total: String(pageCount) });
            if (isEthiopic(pageText)) {
                drawAmharic(pageText, pageWidth - margin - 30, pageHeight - 8, 6.5 * 0.9, "#94A3B8", true);
            } else {
                doc.text(pageText, pageWidth - margin, pageHeight - 8, { align: "right" });
            }

            // Center: decorative dot
            doc.setFillColor(59, 130, 246);
            doc.circle(pageWidth / 2, pageHeight - 8, 1.5, "F");
        }

        // ── Save ──
        doc.save(`Guenet_Report_${churchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success(t("reports.pdf.exportSuccess") || "PDF Exported successfully!");
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
                growthData.map((g) => ({ [t("reports.excel.month")]: g.month, [t("reports.excel.members")]: g.members }))
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
            {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-3.5 sm:p-6 md:p-10 shadow-2xl"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3b82f6 100%)" }}
            >
                {/* Animated mesh orbs */}
                <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 rounded-full opacity-25 blur-[50px] sm:blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #7EC8F2, transparent)' }}></div>
                <div className="absolute bottom-0 left-0 w-32 sm:w-60 h-32 sm:h-60 rounded-full opacity-20 blur-[40px] sm:blur-[60px]" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
                <div className="absolute top-1/2 left-1/3 w-36 sm:w-72 h-36 sm:h-72 rounded-full opacity-10 blur-[60px] sm:blur-[100px]" style={{ background: 'radial-gradient(circle, #3178B5, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>

                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Title Section */}
                    <div className="text-white flex-1 min-w-0">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2 sm:gap-3 mb-2 md:mb-5 flex-wrap"
                        >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(126,200,242,0.3), rgba(75,155,220,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <TrendingUp size={18} className="text-blue-100 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#7EC8F2' }}>
                                <Sparkles size={10} className="inline mr-1" /> {t("reports.title")}
                            </div>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight mb-1 md:mb-4"
                            style={{ background: 'linear-gradient(135deg, #ffffff 0%, #7EC8F2 50%, #4B9BDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                        >
                            {t("reports.headerChurch")} <span>{t("reports.intelligent")}</span> {t("reports.headerReports")}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-blue-100/70 max-w-xl text-[10px] sm:text-sm md:text-base font-medium hidden sm:block"
                        >
                            {t("reports.subtitle")}
                        </motion.p>
                    </div>

                    {/* Actions Group */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                        <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white text-blue-600 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all"
                            style={{ boxShadow: '0 12px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                        >
                            <Download size={18} />
                            <span>{t("reports.exportPdf")}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#10B981] text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all"
                            style={{ boxShadow: '0 12px 24px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                        >
                            <FileText size={18} />
                            <span>{t("reports.exportExcel")}</span>
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
            <motion.div variants={containerVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
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
                                <BarChart3 size={22} className="sm:w-6 sm:h-6" />
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
                </motion.div>
            </motion.div>

            {/* --- BRANCH DISTRIBUTION MAP (Full Width) --- */}
            <motion.div
                variants={itemVariants}
                className="rounded-2xl sm:rounded-[3rem] border border-transparent shadow-2xl overflow-hidden relative"
                style={d.card}
            >
                <div className="p-6 sm:p-10 md:p-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl sm:rounded-3xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/10">
                                <MapIcon size={28} className="sm:w-8 sm:h-8" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                                    {t("reports.branchDensity")}
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">
                                    {t("reports.distribution")}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 rounded-full shadow-sm">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    {t("reports.branches")} ({mapChurches.length})
                                </span>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 rounded-full shadow-sm">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    {t("reports.noMapLink")} ({churchesWithoutCoords.length})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-[600px] sm:h-[800px] md:h-[900px] w-full relative">
                    <div className="h-full w-full z-0 overflow-hidden rounded-b-[2rem] sm:rounded-b-[2.5rem]">
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
                                    <Popup className="custom-popup-premium">
                                        <div className="p-3 min-w-[200px]">
                                            <p className="text-lg font-black text-gray-900 border-b border-gray-100 pb-2 mb-2">{church.name}</p>
                                            <div className="space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <Building size={14} className="text-gray-400 mt-1 shrink-0" />
                                                    <p className="text-sm text-gray-600 leading-tight">{church.location || t("reports.noLocation")}</p>
                                                </div>
                                                {church.map_link && (
                                                    <a
                                                        href={church.map_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-blue-500 text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                                                    >
                                                        <ExternalLink size={14} />
                                                        {t("reports.openInMaps")}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </LeafletMarker>
                            ))}

                            {churchesWithoutCoords.map((church, idx) => (
                                <LeafletMarker
                                    key={church.id}
                                    position={[
                                        DEFAULT_ETHIOPIA_CENTER.lat + (idx + 1) * 0.05,
                                        DEFAULT_ETHIOPIA_CENTER.lng + (idx + 1) * 0.05
                                    ]}
                                    icon={createChurchIcon('#f59e0b')}
                                >
                                    <Popup className="custom-popup-premium">
                                        <div className="p-3">
                                            <p className="text-lg font-black text-gray-900 mb-1">{church.name}</p>
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md inline-block">
                                                {t("reports.noMapLink")}
                                            </p>
                                        </div>
                                    </Popup>
                                </LeafletMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </motion.div>

            {/* --- DEMOGRAPHICS SECTION --- */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                {/* Demographic Heatmap */}
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
                        {/* Age Distribution */}
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                    <Users size={14} className="text-violet-600" />
                                </div>
                                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                    {t("reports.ageDistribution")}
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {demographicData.map((item, idx) => {
                                    const maxVal = Math.max(...demographicData.map((d) => d.count), 1);
                                    const intensity = item.count / maxVal;
                                    const bgOpacity = 0.2 + intensity * 0.8;
                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            className="relative p-4 rounded-2xl border border-violet-100 dark:border-violet-900/30 flex flex-col items-center justify-center text-center overflow-hidden"
                                            style={{
                                                background: isDark
                                                    ? `rgba(139, 92, 246, ${bgOpacity * 0.4})`
                                                    : `rgba(139, 92, 246, ${bgOpacity * 0.2})`,
                                            }}
                                        >
                                            <p className="text-[10px] font-black text-violet-700 dark:text-violet-300 uppercase mb-1">{item.age} {t("reports.yrs")}</p>
                                            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mb-1">{item.count}</p>
                                            <span className="text-[10px] font-bold text-gray-500">{item.percentage.toFixed(0)}%</span>
                                        </motion.div>
                                    );
                                })}
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
                            <div className="space-y-4">
                                {demographicMarital.map((item, idx) => {
                                    const total = demographicMarital.reduce((a, b) => a + b.count, 0);
                                    const pct = total > 0 ? (item.count / total) * 100 : 0;
                                    return (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {item.name === "Unknown" ? t("common.unknown") : (t(`members.form.maritalStatus.${item.name.toLowerCase()}`) || item.name)}
                                                </span>
                                                <span className="text-gray-900 dark:text-gray-100 font-black">{item.count} ({pct.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${pct}%` }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: item.fill }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
