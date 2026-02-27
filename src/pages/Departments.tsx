import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Shield,
  Search,
  Plus,
  Users,
  Calendar,
  Loader2,
  X,
  Edit2,
  Trash2,
  Save,
  Building,
  Sparkles,
  Layers,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Department, Church } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { ds } from "../utils/darkStyles";
import MasterDetailLayout from "../components/common/MasterDetailLayout";
import DepartmentDetails from "../components/DepartmentDetails";

interface DepartmentWithDetails extends Department {
  churches: {
    name: string;
  } | null;
  members: { count: number }[];
  profile_departments: { count: number }[];
}

export default function Departments() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const d = ds(isDark);
  const navigate = useNavigate();
  const { id } = useParams();
  const [departments, setDepartments] = useState<DepartmentWithDetails[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithDetails | null>(null);
  const [formData, setFormData] = useState({ name: "", church_id: "" });
  const [selectedDeptForView, setSelectedDeptForView] = useState<DepartmentWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");

  useEffect(() => {
    if (profile) {
      fetchDepartments();
      if (profile.role === "super_admin") {
        fetchChurches();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (id && departments.length > 0) {
      const d = departments.find((d) => d.id === id);
      if (d) {
        setSelectedDeptForView(d);
      }
    } else if (!id) {
      setSelectedDeptForView(null);
    }
  }, [id, departments]);

  useEffect(() => {
    if (editingDept) {
      setFormData({ name: editingDept.name, church_id: editingDept.church_id || "" });
    } else {
      setFormData({ name: "", church_id: profile?.role === "super_admin" ? "" : profile?.church_id || "" });
    }
  }, [editingDept, profile, isModalOpen]);

  const fetchChurches = async () => {
    const { data } = await supabase.from("churches").select("*").order("name");
    if (data) setChurches(data);
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      let query = supabase.from("departments").select(`*, churches ( name ), members:members(count), profile_departments(count)`);

      if ((profile?.role === "pastor" || profile?.role === "servant") && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query.order("name");

      if (error) {
        if (error.code === "PGRST200") {
          await fetchDepartmentsLegacy();
          return;
        }
        throw error;
      }

      setDepartments((data as any) || []);
    } catch (error) {
      console.error("Error fetching departments (new schema):", error);
      await fetchDepartmentsLegacy();
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsLegacy = async () => {
    try {
      let query = supabase.from("departments").select(`*, churches ( name ), members:members(count)`);

      if ((profile?.role === "pastor" || profile?.role === "servant") && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      setDepartments((data as any) || []);
    } catch (error) {
      console.error("Error fetching departments (legacy):", error);
      toast.error("Failed to load departments");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }
    if (!formData.church_id) {
      toast.error("Church is required");
      return;
    }

    try {
      setSubmitting(true);

      if (editingDept) {
        const oldChurch = churches.find(c => c.id === editingDept.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === formData.church_id)?.name || "Unknown";
        const logOld = { name: editingDept.name, church_id: editingDept.church_id, church: oldChurch };
        const logNew = { name: formData.name, church_id: formData.church_id, church: newChurch };
        const diff = getObjectDiff(logOld, logNew);

        if (!diff) {
          toast.error("No changes detected");
          setSubmitting(false);
          return;
        }

        const dbUpdates: any = {};
        if ('name' in diff.new) dbUpdates.name = diff.new.name;
        if ('church_id' in diff.new) dbUpdates.church_id = diff.new.church_id;

        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase
            .from("departments")
            .update(dbUpdates)
            .eq("id", editingDept.id);

          if (error) throw error;
        }

        const changedFields = Object.keys(diff.new).filter(k => k !== 'church_id').join(", ");
        await logActivity("UPDATE", "DEPARTMENT", `Updated department "${editingDept.name}" (Changed: ${changedFields})`, editingDept.id, diff);
        toast.success("Department updated successfully");
      } else {
        const { data, error } = await supabase.from("departments").insert([formData]).select().single();
        if (error) throw error;

        const churchName = churches.find(c => c.id === formData.church_id)?.name || "Unknown";
        await logActivity("CREATE", "DEPARTMENT", `Added new department ${formData.name}`, data.id, { ...formData, church: churchName });
        toast.success("Department added successfully");
      }

      setEditingDept(null);
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast.error(error.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept: DepartmentWithDetails) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmTitle("Delete Department");
    setConfirmMessage("Are you sure you want to delete this department? This action cannot be undone.");
    setConfirmType("danger");
    setConfirmAction(() => () => deleteDepartment(id));
    setConfirmOpen(true);
  };

  const deleteDepartment = async (id: string) => {
    try {
      const deptToDelete = departments.find((d) => d.id === id);
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;

      await logActivity(
        "DELETE", "DEPARTMENT",
        `Deleted department "${deptToDelete?.name || "Unknown"}" from ${deptToDelete?.churches?.name || "Unknown church"}`,
        id,
        deptToDelete ? { name: deptToDelete.name, church: deptToDelete.churches?.name } : null
      );
      toast.success("Department deleted successfully");
      fetchDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast.error(error.message || "Failed to delete department");
    }
    setConfirmOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
  };

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(query) ||
        (dept.churches?.name && dept.churches.name.toLowerCase().includes(query))
    );
  }, [departments, searchQuery]);

  const hasChanges = useMemo(() => {
    if (!editingDept) {
      return !!(formData.name && formData.church_id);
    }
    return formData.name !== (editingDept.name || "") || formData.church_id !== (editingDept.church_id || "");
  }, [formData, editingDept]);

  const totalPeople = useMemo(() => {
    return departments.reduce((acc, d) => acc + (d.profile_departments?.[0]?.count || 0) + (d.members?.[0]?.count || 0), 0);
  }, [departments]);

  // Department card colors
  const getDeptColors = (name: string) => {
    const palettes = [
      { bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', accent: '#8b5cf6', light: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.12)' },
      { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', accent: '#3b82f6', light: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.12)' },
      { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', accent: '#10b981', light: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.12)' },
      { bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', accent: '#ec4899', light: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.12)' },
      { bg: 'linear-gradient(135deg, #f2f8fd, #e8f1fa)', accent: '#f97316', light: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.12)' },
      { bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', accent: '#14b8a6', light: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.12)' },
      { bg: 'linear-gradient(135deg, #fefce8, #fef9c3)', accent: '#eab308', light: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.12)' },
      { bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', accent: '#ef4444', light: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.12)' },
    ];
    const idx = name.charCodeAt(0) % palettes.length;
    return palettes[idx];
  };

  return (
    <MasterDetailLayout
      isOpen={!!id}
      onClose={() => navigate("/departments")}
      detail={<DepartmentDetails department={selectedDeptForView} />}
      title={selectedDeptForView?.name || "Department Details"}
      actions={
        selectedDeptForView && profile?.role === "pastor" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEdit(selectedDeptForView)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => handleDeleteClick(selectedDeptForView.id)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )
      }
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #0c1929 0%, #173254 40%, #3178B5 70%, #4B9BDC 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #7EC8F2, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #3178B5, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 md:gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-3 md:mb-4"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(126,200,242,0.3), rgba(75,155,220,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Layers size={20} className="text-blue-100 md:w-6 md:h-6" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#7EC8F2' }}>
                <Sparkles size={10} className="inline mr-1" /> Ministries
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl md:text-5xl font-black tracking-tight mb-2 md:mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #7EC8F2 50%, #4B9BDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Departments
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-blue-100/70 max-w-lg text-sm md:text-base font-medium hidden xl:block"
            >
              Manage church departments, ministries, and view detailed statistics.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 md:gap-4 w-full xl:w-auto"
          >
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-3 rounded-2xl flex-1 sm:flex-initial min-w-[140px]" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4B9BDC, #3178B5)' }}>
                  <Shield size={16} className="text-white md:w-[18px] md:h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-black text-white leading-none truncate">{departments.length}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-blue-200/70 uppercase tracking-wider truncate">Depts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-3 rounded-2xl flex-1 sm:flex-initial min-w-[140px]" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7EC8F2, #4B9BDC)' }}>
                  <Users size={16} className="text-white md:w-[18px] md:h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl md:text-2xl font-black text-white leading-none truncate">{totalPeople}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-blue-200/70 uppercase tracking-wider truncate">People</p>
                </div>
              </div>
            </div>

            {profile?.role !== "super_admin" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 md:px-6 md:py-3.5 rounded-2xl font-bold text-xs md:text-sm shrink-0 w-full sm:w-auto sm:ml-auto md:ml-0 mt-1 sm:mt-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #e8f1fa)', color: '#3178B5', boxShadow: '0 8px 32px rgba(49,120,181,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                <span>Add Department</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      {/* ═══════════════ SEARCH BAR ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="p-1.5 rounded-2xl flex items-center transition-all duration-300 max-w-3xl"
          style={{
            background: searchFocused ? (isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.95)') : (isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.8)'),
            backdropFilter: 'blur(20px)',
            border: searchFocused ? (isDark ? '1.5px solid rgba(75,155,220,0.4)' : '1.5px solid rgba(75,155,220,0.4)') : (isDark ? '1.5px solid rgba(75,155,220,0.12)' : '1.5px solid rgba(0,0,0,0.06)'),
            boxShadow: searchFocused ? (isDark ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 4px rgba(75,155,220,0.08)' : '0 8px 32px rgba(75,155,220,0.15), 0 0 0 4px rgba(75,155,220,0.05)') : (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'),
          }}
        >
          <div className="pl-4 pr-2">
            <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-[#4B9BDC]' : 'text-gray-500 dark:text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-[#4B9BDC] rounded-xl hover:bg-blue-50 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ DEPARTMENT CARDS LIST ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 border-t-[#4B9BDC] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Layers size={18} className="text-[#4B9BDC]" />
            </div>
          </div>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={d.emptyState}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={d.emptyIcon}>
            <Shield className="h-10 w-10 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No departments found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Try adjusting your search or add a new department.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence>
            {filteredDepartments.map((dept, index) => {
              const colors = getDeptColors(dept.name);
              const totalCount = (dept.profile_departments?.[0]?.count || 0) + (dept.members?.[0]?.count || 0);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8,
                    delay: Math.min(index * 0.015, 0.3),
                    layout: {
                      type: "spring",
                      stiffness: 400,
                      damping: 40,
                      mass: 1,
                      delay: 0
                    }
                  }}
                  key={dept.id}
                  onClick={() => navigate(`/departments/${dept.id}`)}
                  whileHover={{ scale: 1.005, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)' }}
                  className="group cursor-pointer relative overflow-hidden rounded-xl md:rounded-2xl flex items-center p-3 md:p-4 gap-3 md:gap-4 transition-all border border-transparent hover:shadow-lg"
                  style={{
                    ...d.card,
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: colors.accent }}></div>

                  {/* Icon */}
                  <div className="shrink-0 pl-1 md:pl-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                      style={{ background: colors.bg, boxShadow: `0 4px 16px ${colors.border}` }}
                    >
                      <Shield size={18} style={{ color: colors.accent }} className="md:w-5 md:h-5" />
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:gap-1">
                    <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-gray-100 transition-colors leading-tight">
                      <span className="group-hover:hidden">{dept.name}</span>
                      <span className="hidden group-hover:inline" style={{ color: colors.accent }}>{dept.name}</span>
                    </h3>

                    {dept.churches && (
                      <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 font-medium">
                        <Building size={12} className="text-gray-500 dark:text-gray-400" />
                        <p className="truncate dark:text-gray-400">{dept.churches.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mr-4 hidden sm:flex">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                        {totalCount}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Members</span>
                    </div>
                  </div>

                  {/* Actions - MOVED TO TOP BAR */}
                  <div className="flex items-center gap-2 pl-2 border-l border-gray-100 dark:border-gray-800">
                    <div className="text-gray-500 dark:text-gray-400 group-hover:text-[#4B9BDC] transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ═══════════════ ADD/EDIT MODAL ═══════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={d.modalOverlay}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md p-8 relative overflow-hidden rounded-[2rem]"
              style={d.modalContent}
            >
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #3178B5, #4B9BDC, #7EC8F2)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                    {editingDept ? "Edit Ministry" : "Add Ministry"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage department profiles</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors" style={d.subtleButton}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Department Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                      <Shield size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      style={d.formInput}
                      placeholder="e.g. Worship Team"
                    />
                  </div>
                </div>

                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Assign to Branch</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                        <Building size={18} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={(e) => setFormData({ ...formData, church_id: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 appearance-none"
                        style={d.formInput}
                      >
                        <option value="" disabled className="text-gray-500 dark:text-gray-400">Select a church...</option>
                        {churches.map((church) => (
                          <option key={church.id} value={church.id}>{church.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8 pt-6" style={d.modalFooterBorder}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #4B9BDC, #3178B5)', boxShadow: '0 8px 24px rgba(49,120,181,0.25)' }}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        {editingDept ? <Save size={18} /> : <Plus size={18} />}
                        <span>{editingDept ? "Save Changes" : "Create Department"}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
        type={confirmType}
      />
    </motion.div>
    </MasterDetailLayout>
  );
}
