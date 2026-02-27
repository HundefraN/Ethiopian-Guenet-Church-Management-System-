import React, { useEffect, useState, useMemo } from "react";
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
import DepartmentDetailsModal from "../components/DepartmentDetailsModal";
import { motion, AnimatePresence } from "framer-motion";

interface DepartmentWithDetails extends Department {
  churches: {
    name: string;
  } | null;
  members: { count: number }[];
  profile_departments: { count: number }[];
}

export default function Departments() {
  const { profile } = useAuth();
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
        const { error } = await supabase
          .from("departments")
          .update({ name: formData.name, church_id: formData.church_id })
          .eq("id", editingDept.id);

        if (error) throw error;

        const oldChurch = churches.find(c => c.id === editingDept.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === formData.church_id)?.name || "Unknown";
        const logOld = { name: editingDept.name, church: oldChurch };
        const logNew = { name: formData.name, church: newChurch };
        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity("UPDATE", "DEPARTMENT", `Updated department ${formData.name}`, editingDept.id, diff);
        }
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
      { bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', accent: '#f97316', light: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.12)' },
      { bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', accent: '#14b8a6', light: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.12)' },
      { bg: 'linear-gradient(135deg, #fefce8, #fef9c3)', accent: '#eab308', light: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.12)' },
      { bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', accent: '#ef4444', light: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.12)' },
    ];
    const idx = name.charCodeAt(0) % palettes.length;
    return palettes[idx];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 40%, #7e22ce 70%, #a855f7 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #c084fc, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #e879f9, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #818cf8, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(192,132,252,0.3), rgba(232,121,249,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Layers size={24} className="text-purple-200" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#d8b4fe' }}>
                <Sparkles size={10} className="inline mr-1" /> Ministries
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d8b4fe 50%, #e879f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Departments Directory
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-purple-200/60 max-w-lg text-sm md:text-base font-medium"
            >
              Manage church departments, ministries, and view detailed statistics.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{departments.length}</p>
                <p className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider">Departments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e879f9, #c026d3)' }}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{totalPeople}</p>
                <p className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider">Total People</p>
              </div>
            </div>

            {profile?.role !== "super_admin" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #f3e8ff)', color: '#7c3aed', boxShadow: '0 8px 32px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={18} />
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
            background: searchFocused ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            border: searchFocused ? '1.5px solid rgba(139,92,246,0.3)' : '1.5px solid rgba(0,0,0,0.06)',
            boxShadow: searchFocused ? '0 8px 32px rgba(139,92,246,0.1), 0 0 0 4px rgba(139,92,246,0.05)' : '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div className="pl-4 pr-2">
            <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-purple-500' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search ministries and departments by name or church branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 mr-2 text-gray-400 hover:text-purple-500 rounded-xl hover:bg-purple-50 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ DEPARTMENT CARDS GRID ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-purple-100 border-t-purple-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Layers size={18} className="text-purple-400" />
            </div>
          </div>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <Shield className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No departments found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Try adjusting your search or add a new department.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredDepartments.map((dept, index) => {
              const colors = getDeptColors(dept.name);
              const totalCount = (dept.profile_departments?.[0]?.count || 0) + (dept.members?.[0]?.count || 0);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.04, type: "spring", stiffness: 150 }}
                  key={dept.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="group cursor-pointer relative overflow-hidden rounded-[1.5rem] flex flex-col transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Clickable Area for Details */}
                  <div
                    className="absolute inset-0 z-[1]"
                    onClick={() => setSelectedDeptForView(dept)}
                  ></div>

                  <div className="p-6 flex flex-col flex-1 relative z-[2] pointer-events-none">
                    <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[50px] -mr-10 -mt-10 opacity-0 group-hover:opacity-30 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${colors.accent}, transparent)` }}></div>

                    <div className="flex items-start justify-between mb-5 relative z-10 pointer-events-auto">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                        style={{ background: colors.bg, boxShadow: `0 4px 16px ${colors.border}` }}
                      >
                        <Shield size={26} style={{ color: colors.accent }} />
                      </div>
                      {profile?.role !== "super_admin" && profile?.role === "pastor" && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(dept); }}
                            className="p-2.5 rounded-xl transition-all text-blue-400 hover:text-white hover:shadow-md"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                            title="Edit Department"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(dept.id); }}
                            className="p-2.5 rounded-xl transition-all text-red-400 hover:text-white hover:shadow-md"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                            title="Delete Department"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-gray-900 mb-1 transition-colors leading-tight" style={{ color: undefined }}>
                        <span className="group-hover:hidden">{dept.name}</span>
                        <span className="hidden group-hover:inline" style={{ color: colors.accent }}>{dept.name}</span>
                      </h3>

                      {dept.churches && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-6">
                          <Building size={13} className="text-gray-400" />
                          <p className="truncate text-xs">{dept.churches.name}</p>
                        </div>
                      )}

                      <div className="pt-5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)` }}>
                            <Users size={14} />
                          </div>
                          <span className="text-2xl font-black text-gray-900 tabular-nums">
                            {totalCount}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: colors.light, border: `1px solid ${colors.border}` }}>
                          <Calendar size={12} style={{ color: colors.accent }} />
                          <span className="text-[10px] font-bold" style={{ color: colors.accent }}>Weekly</span>
                        </div>
                      </div>
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
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px) saturate(180%)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md p-8 relative overflow-hidden rounded-[2rem]"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px)', boxShadow: '0 25px 80px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.9)' }}
            >
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #a855f7, #8b5cf6, #6366f1)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingDept ? "Edit Ministry" : "Add Ministry"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage department profiles</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors" style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Department Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                      <Shield size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                      placeholder="e.g. Worship Team"
                    />
                  </div>
                </div>

                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Assign to Branch</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                        <Building size={18} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={(e) => setFormData({ ...formData, church_id: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 appearance-none"
                        style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                      >
                        <option value="" disabled className="text-gray-400">Select a church...</option>
                        {churches.map((church) => (
                          <option key={church.id} value={church.id}>{church.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8 pt-6" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}
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

      {/* Department Details Modal */}
      <AnimatePresence>
        {selectedDeptForView && (
          <DepartmentDetailsModal
            department={selectedDeptForView}
            onClose={() => setSelectedDeptForView(null)}
          />
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
  );
}
