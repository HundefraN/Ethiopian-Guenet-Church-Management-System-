import React, { useEffect, useState, useMemo } from "react";
import { Building, MapPin, Search, Plus, Loader2, X, ChevronRight, Users, Shield, BookOpen, Edit2, Trash2, ExternalLink, Map, Sparkles, TrendingUp, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Church } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import { ds } from "../utils/darkStyles";
import ConfirmDialog from "../components/ConfirmDialog";

interface ChurchWithCount extends Church {
  members: { count: number }[];
}

export default function Churches() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const d = ds(isDark);
  const [churches, setChurches] = useState<ChurchWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChurch, setNewChurch] = useState({ name: "", location: "", map_link: "" });
  const [submitting, setSubmitting] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<ChurchWithCount | null>(null);

  const [selectedChurch, setSelectedChurch] = useState<ChurchWithCount | null>(null);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");
  const [churchStats, setChurchStats] = useState<{
    deptCount: number;
    departments: { name: string; servantCount: number }[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchChurches();
    }
  }, [profile]);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      let query = supabase.from("churches").select("*, members(count)");

      if (
        (profile?.role === "pastor" || profile?.role === "servant") &&
        profile.church_id
      ) {
        query = query.eq("id", profile.church_id);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;

      setChurches((data as any) || []);
    } catch (error) {
      console.error("Error fetching churches:", error);
      toast.error("Failed to load churches");
    } finally {
      setLoading(false);
    }
  };

  const handleChurchClick = async (church: ChurchWithCount) => {
    if (selectedChurch?.id === church.id) {
      setSelectedChurch(null);
      return;
    }
    setSelectedChurch(church);
    setLoadingStats(true);
    setChurchStats(null);
    try {
      const { count: deptCount } = await supabase
        .from("departments")
        .select("*", { count: "exact", head: true })
        .eq("church_id", church.id);

      let depts: any[] = [];
      const { data: newDepts, error: newDeptsError } = await supabase
        .from("departments")
        .select(`id, name, profile_departments (count)`)
        .eq("church_id", church.id);

      if (newDeptsError) {
        const { data: legacyDepts } = await supabase
          .from("departments")
          .select("id, name")
          .eq("church_id", church.id);
        depts = legacyDepts || [];
      } else {
        depts = newDepts || [];
      }

      setChurchStats({
        deptCount: deptCount || 0,
        departments:
          depts?.map((d: any) => ({
            name: d.name,
            servantCount: d.profile_departments?.[0]?.count || 0,
          })) || [],
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load details");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurch.name) {
      toast.error("Church name is required");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from("churches")
        .insert([newChurch])
        .select()
        .single();

      if (error) throw error;

      await logActivity(
        "CREATE",
        "CHURCH",
        `Added new church "${newChurch.name}" at ${newChurch.location || "unspecified location"}`,
        data.id,
        { name: newChurch.name, location: newChurch.location, map_link: newChurch.map_link }
      );

      const newChurchWithCount: ChurchWithCount = { ...data, members: [] };
      setChurches([...churches, newChurchWithCount]);
      setNewChurch({ name: "", location: "", map_link: "" });
      setIsModalOpen(false);
      toast.success("Church added successfully");
    } catch (error: any) {
      console.error("Error adding church:", error);
      toast.error(error.message || "Failed to add church");
    } finally {
      setSubmitting(false);
    }
  };
  const handleEditChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurch.name || !editingChurch) {
      toast.error("Church name is required");
      return;
    }

    try {
      setSubmitting(true);
      const originalUpdates = { name: newChurch.name, location: newChurch.location, map_link: newChurch.map_link };
      const diff = getObjectDiff(
        { name: editingChurch.name, location: editingChurch.location, map_link: editingChurch.map_link },
        originalUpdates
      );

      if (!diff) {
        toast.error("No changes detected");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("churches")
        .update(diff.new)
        .eq("id", editingChurch.id);

      if (error) throw error;

      const changedFields = Object.keys(diff.new).join(", ");
      await logActivity(
        "UPDATE",
        "CHURCH",
        `Updated church "${editingChurch.name}" (Changed: ${changedFields})`,
        editingChurch.id,
        diff
      );

      setChurches(churches.map(c => c.id === editingChurch.id ? { ...c, ...diff.new } : c));
      if (selectedChurch?.id === editingChurch.id) {
        setSelectedChurch({ ...selectedChurch, ...diff.new } as any);
      }

      setNewChurch({ name: "", location: "", map_link: "" });
      setEditingChurch(null);
      setIsEditModalOpen(false);
      toast.success("Church updated successfully");
    } catch (error: any) {
      console.error("Error updating church:", error);
      toast.error(error.message || "Failed to update church");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChurchClick = (church: ChurchWithCount) => {
    setConfirmTitle("Delete Church");
    setConfirmMessage(`Are you sure you want to delete "${church.name}"? This action cannot be undone and may affect associated users. `);
    setConfirmType("danger");
    setConfirmAction(() => () => deleteChurch(church));
    setConfirmOpen(true);
  };

  const deleteChurch = async (church: ChurchWithCount) => {
    const loadingToast = toast.loading("Deleting church...");
    try {
      const { error } = await supabase.from("churches").delete().eq("id", church.id);
      if (error) throw error;

      await logActivity(
        "DELETE",
        "CHURCH",
        `Deleted church "${church.name}"`,
        church.id,
        { name: church.name, location: church.location }
      );

      setChurches(churches.filter(c => c.id !== church.id));
      if (selectedChurch?.id === church.id) setSelectedChurch(null);
      toast.success("Church deleted successfully", { id: loadingToast });
    } catch (error: any) {
      console.error("Error deleting church:", error);
      toast.error(error.message || "Failed to delete church", { id: loadingToast });
    } finally {
      setConfirmOpen(false);
    }
  };

  const filteredChurches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return churches;
    return churches.filter(
      (church) =>
        church.name.toLowerCase().includes(query) ||
        (church.location &&
          church.location.toLowerCase().includes(query))
    );
  }, [churches, searchQuery]);

  const hasAddChanges = newChurch.name.trim() !== "";
  const hasEditChanges = useMemo(() => {
    if (!editingChurch) return false;
    return newChurch.name !== (editingChurch.name || "") ||
      newChurch.location !== (editingChurch.location || "") ||
      newChurch.map_link !== (editingChurch.map_link || "");
  }, [newChurch, editingChurch]);

  const totalMembers = useMemo(() => churches.reduce((acc, c) => acc + (c.members?.[0]?.count || 0), 0), [churches]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.15 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #132d50 40%, #1a4a7a 70%, #2563eb 100%)' }}>
        {/* Animated mesh orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-30 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #34d399, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.3), rgba(167,139,250,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Building size={24} className="text-blue-200" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#93c5fd' }}>
                <Sparkles size={10} className="inline mr-1" /> Church Management
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Churches Directory
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-blue-200/70 max-w-lg text-sm md:text-base font-medium"
            >
              Manage all church branches, locations, and detailed statistics in one place.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            {/* Quick stat pills */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                <Globe size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{churches.length}</p>
                <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider">Branches</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{totalMembers}</p>
                <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-wider">Total Members</p>
              </div>
            </div>

            {profile?.role === "super_admin" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #e0e7ff)', color: '#3b82f6', boxShadow: '0 8px 32px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={18} />
                <span>Add Church</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <motion.div layout className="flex flex-col lg:flex-row gap-8 items-start">
        {/* ═══════════════ DETAILS PANEL ═══════════════ */}
        <AnimatePresence>
          {selectedChurch && (
            <motion.div
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full lg:w-[420px] order-1 lg:sticky lg:top-6 z-10"
            >
              <div className="rounded-[2rem] p-7 md:p-8 relative overflow-hidden" style={d.detailPanel}>
                {/* Holographic top border */}
                <div className="absolute top-0 left-0 w-full h-1 rounded-t-[2rem]" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }}></div>

                <div className="absolute top-0 right-0 p-4 flex items-center gap-2 z-20">
                  {profile?.role === "super_admin" && (
                    <>
                      <button
                        onClick={() => {
                          setEditingChurch(selectedChurch);
                          setNewChurch({
                            name: selectedChurch.name,
                            location: selectedChurch.location || "",
                            map_link: selectedChurch.map_link || ""
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2.5 rounded-xl transition-all duration-200 text-blue-400 hover:text-blue-600" style={d.editButton}
                        title="Edit Church"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteChurchClick(selectedChurch)}
                        className="p-2.5 rounded-xl transition-all duration-200 text-red-400 hover:text-red-600" style={d.deleteButton}
                        title="Delete Church"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedChurch(null)}
                    className="p-2.5 rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-600" style={d.subtleButton}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}>
                  <Building className="text-blue-600" size={30} />
                </div>

                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight mb-2 pr-28">
                  {selectedChurch.name}
                </h2>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-6 font-semibold rounded-xl inline-flex px-3.5 py-2" style={d.locationBadge}>
                  <MapPin size={15} className="text-blue-500" />
                  <span>{selectedChurch.location || "No location specified"}</span>
                </div>

                {selectedChurch.map_link && (
                  <motion.a
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    href={selectedChurch.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-7 flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold transition-all group text-sm"
                    style={d.mapsButton}
                  >
                    <Map size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>View on Google Maps</span>
                    <ExternalLink size={14} className="opacity-40" />
                  </motion.a>
                )}

                {loadingStats ? (
                  <div className="flex justify-center py-12">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin"></div>
                    </div>
                  </div>
                ) : churchStats ? (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="p-5 rounded-2xl relative overflow-hidden group"
                        style={d.statBlue}
                      >
                        <div className="absolute -right-3 -top-3 text-blue-200/40 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                          <Users size={56} />
                        </div>
                        <h3 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] mb-1">Members</h3>
                        <p className="text-3xl font-black text-blue-950 dark:text-blue-50 relative z-10">
                          {selectedChurch.members && selectedChurch.members[0] ? selectedChurch.members[0].count : 0}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="p-5 rounded-2xl relative overflow-hidden group"
                        style={d.statPurple}
                      >
                        <div className="absolute -right-3 -top-3 text-purple-200/40 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                          <Shield size={56} />
                        </div>
                        <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.15em] mb-1">Departments</h3>
                        <p className="text-3xl font-black text-purple-950 dark:text-purple-50 relative z-10">
                          {churchStats.deptCount}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="p-5 rounded-2xl relative overflow-hidden group col-span-2"
                        style={d.statIndigo}
                      >
                        <div className="absolute -right-2 -bottom-4 text-indigo-200/30 transform group-hover:scale-110 transition-transform duration-300">
                          <BookOpen size={72} />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={14} className="text-indigo-500" />
                          <h3 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em]">Total Servants</h3>
                        </div>
                        <p className="text-3xl font-black text-indigo-950 dark:text-indigo-50 relative z-10">
                          {churchStats.departments.reduce((acc, curr) => acc + curr.servantCount, 0)}
                        </p>
                      </motion.div>
                    </div>

                    {/* Department List */}
                    <div>
                      <h3 className="text-[11px] font-bold text-gray-900 mb-4 px-1 uppercase tracking-[0.15em] flex items-center gap-2">
                        <Shield size={14} className="text-blue-500" />
                        Ministry Breakdown
                      </h3>
                      {churchStats.departments.length === 0 ? (
                        <div className="text-center py-8 rounded-2xl text-gray-500 dark:text-gray-400 text-sm font-medium" style={d.emptyInner}>
                          No departments found.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {churchStats.departments.map((dept, idx) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.05 }}
                              key={idx}
                              className="p-4 rounded-xl flex justify-between items-center hover:shadow-md transition-all group cursor-default"
                              style={d.listItem}
                            >
                              <span className="font-bold text-gray-700 dark:text-gray-400 group-hover:text-blue-700 transition-colors text-sm">
                                {dept.name}
                              </span>
                              <span className="text-blue-600 px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(59,130,246,0.08)' }}>
                                {dept.servantCount} Servants
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Failed to load data.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════ MAIN LIST ═══════════════ */}
        <motion.div layout className="flex-1 order-2">
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 relative"
          >
            <div
              className="p-1.5 rounded-2xl flex items-center transition-all duration-300"
              style={d.searchBar(searchFocused)}
            >
              <div className="pl-4 pr-2">
                <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <input
                type="text"
                placeholder="Search branches by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-xl hover:bg-blue-50 transition-colors"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 border-t-blue-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building size={18} className="text-blue-400" />
                </div>
              </div>
            </div>
          ) : filteredChurches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 rounded-[2rem]"
              style={d.emptyState}
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={d.emptyIcon}>
                <Building className="h-10 w-10 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No churches found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                We couldn't find any churches matching your search. Try adjusting your query.
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              transition={{
                layout: {
                  type: "spring",
                  stiffness: 400,
                  damping: 40,
                  mass: 1,
                  delay: 0
                }
              }}
              className="flex flex-col gap-3"
            >
              <AnimatePresence>
                {filteredChurches.map((church, index) => (
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
                        duration: 0.3,
                        type: "spring",
                        stiffness: 400,
                        damping: 40,
                        mass: 1,
                        delay: 0
                      }
                    }}
                    key={church.id}
                    onClick={() => handleChurchClick(church)}
                    whileHover={{ scale: 1.005, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)' }}
                    className="group cursor-pointer relative overflow-hidden rounded-2xl flex items-center p-4 gap-4 transition-all border border-transparent hover:shadow-lg"
                    style={{
                      ...(selectedChurch?.id === church.id ? d.cardActive : d.card),
                      borderColor: selectedChurch?.id === church.id
                        ? (isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                    }}
                  >
                    {/* Active indicator bar */}
                    {selectedChurch?.id === church.id && (
                      <motion.div
                        layoutId="activeChurchBar"
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #ec4899)' }}
                      />
                    )}

                    {/* Icon */}
                    <div className="shrink-0 pl-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedChurch?.id === church.id ? 'text-white' : 'text-blue-600 group-hover:text-white'}`}
                        style={{
                          background: selectedChurch?.id === church.id
                            ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                            : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                          boxShadow: selectedChurch?.id === church.id ? '0 8px 24px rgba(59,130,246,0.3)' : 'none',
                        }}
                      >
                        <Building size={20} />
                      </div>
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 transition-colors leading-tight group-hover:text-blue-600">
                        {church.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                        <MapPin size={12} className="shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="truncate max-w-[200px]">{church.location || "No location specified"}</span>
                        {church.map_link && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-md shrink-0 ml-1" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }} title="Map link available">
                            <Map size={10} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mr-4 hidden sm:flex">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                          {church.members && church.members[0] ? church.members[0].count : 0}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Members</span>
                      </div>
                    </div>

                    {/* Arrow/Indicator */}
                    <div className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors pr-2">
                      {selectedChurch?.id === church.id ? (
                        <div className="bg-blue-500 text-white rounded-full p-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* ═══════════════ ADD CHURCH MODAL ═══════════════ */}
      <AnimatePresence>
        {
          isModalOpen && (
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
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }}></div>

                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Add Church</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Register a new branch location</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors" style={d.subtleButton}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddChurch} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Church Name</label>
                    <input
                      type="text"
                      required
                      value={newChurch.name}
                      onChange={(e) => setNewChurch({ ...newChurch, name: e.target.value })}
                      className="w-full px-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      style={d.formInput}
                      placeholder="e.g. Guenet Addis Ababa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Location</label>
                    <input
                      type="text"
                      value={newChurch.location}
                      onChange={(e) => setNewChurch({ ...newChurch, location: e.target.value })}
                      className="w-full px-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      style={d.formInput}
                      placeholder="e.g. Bole, Addis Ababa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Map Link (Google Maps URL)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Map size={18} />
                      </div>
                      <input
                        type="url"
                        value={newChurch.map_link}
                        onChange={(e) => setNewChurch({ ...newChurch, map_link: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        style={d.formInput}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                    <p className="mt-2 ml-1 text-[11px] text-gray-500 font-medium">
                      Paste a map link to help people find this church.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6" style={d.modalFooterBorder}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={submitting || !hasAddChanges}
                      className="px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 8px 24px rgba(59,130,246,0.25)' }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Add Church</span>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* ═══════════════ EDIT CHURCH MODAL ═══════════════ */}
      <AnimatePresence>
        {
          isEditModalOpen && editingChurch && (
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
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }}></div>

                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Edit Church</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Update details for this branch</p>
                  </div>
                  <button
                    onClick={() => { setIsEditModalOpen(false); setEditingChurch(null); setNewChurch({ name: "", location: "", map_link: "" }); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors" style={d.subtleButton}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleEditChurch} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Church Name</label>
                    <input
                      type="text"
                      required
                      value={newChurch.name}
                      onChange={(e) => setNewChurch({ ...newChurch, name: e.target.value })}
                      className="w-full px-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      style={d.formInput}
                      placeholder="e.g. Guenet Addis Ababa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Location</label>
                    <input
                      type="text"
                      value={newChurch.location}
                      onChange={(e) => setNewChurch({ ...newChurch, location: e.target.value })}
                      className="w-full px-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      style={d.formInput}
                      placeholder="e.g. Bole, Addis Ababa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">Map Link (Google Maps URL)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Map size={18} />
                      </div>
                      <input
                        type="url"
                        value={newChurch.map_link}
                        onChange={(e) => setNewChurch({ ...newChurch, map_link: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        style={d.formInput}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6" style={d.modalFooterBorder}>
                    <button
                      type="button"
                      onClick={() => { setIsEditModalOpen(false); setEditingChurch(null); setNewChurch({ name: "", location: "", map_link: "" }); }}
                      className="px-6 py-3 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={submitting || !hasEditChanges}
                      className="px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Update Church</span>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
        type={confirmType}
      />

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </motion.div >
  );
}
