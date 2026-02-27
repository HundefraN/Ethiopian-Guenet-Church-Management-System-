import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Loader2,
  Mail,
  Building,
  X,
  Edit2,
  Shield,
  ShieldOff,
  RefreshCw,
  Save,
  Map,
  Sparkles,
  Crown,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Church, Profile } from "../types";
import toast from "react-hot-toast";
import { invokeSupabaseFunction } from "../utils/supabaseFunctions";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ChangeRoleModal from "../components/ChangeRoleModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

interface Pastor extends Profile {
  email?: string;
  churches?: {
    name: string;
    map_link?: string | null;
  } | null;
}

export default function Pastors() {
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPastor, setEditingPastor] = useState<Pastor | null>(null);
  const [changeRoleUser, setChangeRoleUser] = useState<Pastor | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirm");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    church_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPastors(), fetchChurches()]);
    setLoading(false);
  };

  const fetchChurches = async () => {
    const { data } = await supabase.from("churches").select("*").order("name");
    if (data) setChurches(data);
  };

  const fetchPastors = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, churches ( name, map_link )`)
        .eq("role", "pastor")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPastors((data as any) || []);
    } catch (error) {
      console.error("Error fetching pastors:", error);
      toast.error("Failed to load pastors");
    }
  };

  const handleBlockToggleClick = (pastor: Pastor) => {
    const isBlocking = !pastor.is_blocked;
    setConfirmTitle(isBlocking ? "Block Pastor" : "Unblock Pastor");
    setConfirmMessage(
      `Are you sure you want to ${isBlocking ? "block" : "unblock"} ${pastor.full_name}? ${isBlocking ? "They will lose access to the system." : "They will regain access to the system."}`
    );
    setConfirmType(isBlocking ? "danger" : "info");
    setConfirmButtonText(isBlocking ? "Block" : "Unblock");
    setConfirmAction(() => () => toggleBlockStatus(pastor));
    setConfirmOpen(true);
  };

  const toggleBlockStatus = async (pastor: Pastor) => {
    try {
      const newStatus = !pastor.is_blocked;
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: newStatus })
        .eq("id", pastor.id);

      if (error) throw error;

      await logActivity(
        newStatus ? "BLOCK" : "UNBLOCK",
        "PASTOR",
        `${newStatus ? "Blocked" : "Unblocked"} pastor ${pastor.full_name}`,
        pastor.id,
        { old: { is_blocked: !newStatus }, new: { is_blocked: newStatus } }
      );

      toast.success(`Pastor ${newStatus ? "blocked" : "unblocked"} successfully`);
      fetchPastors();
    } catch (error: any) {
      console.error("Error updating pastor status:", error);
      toast.error(error.message || "Failed to update status");
    }
    setConfirmOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPastor) {
      if (!formData.full_name) {
        toast.error("Full name is required");
        return;
      }

      try {
        setSubmitting(true);
        const updates: any = {
          full_name: formData.full_name,
          church_id: formData.church_id || null,
        };

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", editingPastor.id);

        if (error) throw error;

        const details = editingPastor.full_name !== formData.full_name
          ? `Renamed pastor "${editingPastor.full_name}" to "${formData.full_name}"`
          : `Updated pastor ${formData.full_name}`;

        const oldChurch = churches.find(c => c.id === editingPastor.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === formData.church_id)?.name || "No Branch Assigned";

        const logOld = { full_name: editingPastor.full_name, church: oldChurch };
        const logNew = { full_name: formData.full_name, church: newChurch };

        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity("UPDATE", "PASTOR", details, editingPastor.id, diff);
        }

        toast.success("Pastor updated successfully");
        setEditingPastor(null);
        setIsModalOpen(false);
        fetchPastors();
      } catch (error: any) {
        console.error("Error updating pastor:", error);
        toast.error("Failed to update pastor");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error("Full name, email and password are required");
        return;
      }

      try {
        setSubmitting(true);

        const { data: responseData } = await invokeSupabaseFunction("create-user", {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: "pastor",
            church_id: formData.church_id || null,
          },
        });

        if (responseData?.error) {
          throw new Error(responseData.error);
        }

        const churchName = churches.find(c => c.id === formData.church_id)?.name || "No Branch Assigned";

        await logActivity("CREATE", "PASTOR", `Registered new pastor ${formData.full_name}`, responseData?.user?.id || null, {
          email: formData.email,
          full_name: formData.full_name,
          church: churchName,
        });

        toast.success("Pastor registered successfully");
        setFormData({ full_name: "", email: "", password: "", church_id: "" });
        setIsModalOpen(false);
        fetchPastors();
      } catch (error: any) {
        console.error("Error creating pastor:", error);
        toast.error(error.message || "Failed to register pastor");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const openEditModal = (pastor: Pastor) => {
    setEditingPastor(pastor);
    setFormData({
      full_name: pastor.full_name || "",
      email: "",
      password: "",
      church_id: pastor.church_id || "",
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingPastor(null);
    setFormData({ full_name: "", email: "", password: "", church_id: "" });
    setIsModalOpen(true);
  };

  const filteredPastors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pastors;
    return pastors.filter(
      (pastor) =>
        (pastor.full_name && pastor.full_name.toLowerCase().includes(query)) ||
        (pastor.email && pastor.email.toLowerCase().includes(query)) ||
        (pastor.churches?.name && pastor.churches.name.toLowerCase().includes(query))
    );
  }, [pastors, searchQuery]);

  const hasChanges = useMemo(() => {
    if (!editingPastor) {
      return !!(formData.full_name || formData.email || formData.password || formData.church_id);
    }
    return (
      formData.full_name !== (editingPastor.full_name || "") ||
      formData.church_id !== (editingPastor.church_id || "")
    );
  }, [formData, editingPastor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.3), rgba(167,139,250,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Crown size={24} className="text-indigo-200" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#a5b4fc' }}>
                <Sparkles size={10} className="inline mr-1" /> Leadership
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Pastors Directory
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-indigo-200/60 max-w-lg text-sm md:text-base font-medium"
            >
              Manage church leadership, pastoral assignments, and account access globally.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <Crown size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{pastors.length}</p>
                <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-wider">Pastors</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #ffffff, #e0e7ff)', color: '#4f46e5', boxShadow: '0 8px 32px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
            >
              <Plus size={18} />
              <span>Register Pastor</span>
            </motion.button>
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
            border: searchFocused ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid rgba(0,0,0,0.06)',
            boxShadow: searchFocused ? '0 8px 32px rgba(99,102,241,0.1), 0 0 0 4px rgba(99,102,241,0.05)' : '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div className="pl-4 pr-2">
            <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-indigo-500' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search pastors by name or assigned church..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 mr-2 text-gray-400 hover:text-indigo-500 rounded-xl hover:bg-indigo-50 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ PASTOR CARDS GRID ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-indigo-100 border-t-indigo-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Crown size={18} className="text-indigo-400" />
            </div>
          </div>
        </div>
      ) : filteredPastors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <User className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No pastors found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Try adjusting your search or register a new pastor.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredPastors.map((pastor, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.04, type: "spring", stiffness: 150 }}
                key={pastor.id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-[1.5rem] flex flex-col transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div className={`h-1 ${pastor.is_blocked ? 'bg-red-500' : ''}`} style={!pastor.is_blocked ? { background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' } : {}}></div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Hover glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-8 -mt-8 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}></div>

                  <div className="flex items-start justify-between mb-4 mt-1">
                    <div className="relative">
                      {pastor.avatar_url ? (
                        <img
                          src={pastor.avatar_url}
                          alt={pastor.full_name || "Pastor"}
                          className={`w-14 h-14 rounded-2xl object-cover shadow-sm transition-all duration-300 ${pastor.is_blocked ? "grayscale-[0.8] opacity-60 scale-95" : ""}`}
                          style={{ border: pastor.is_blocked ? '2px solid #fca5a5' : '2px solid rgba(99,102,241,0.2)' }}
                        />
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${pastor.is_blocked ? "grayscale scale-95" : "group-hover:scale-105"}`}
                          style={{
                            background: pastor.is_blocked ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                            color: pastor.is_blocked ? '#fca5a5' : '#6366f1'
                          }}
                        >
                          <User size={28} />
                        </div>
                      )}
                      {pastor.is_blocked ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -left-1.5 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 uppercase tracking-tight ring-2 ring-white"
                          style={{ background: '#ef4444' }}
                        >
                          Blocked
                        </motion.div>
                      ) : (
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-sm" style={{ background: '#10b981' }} title="Active">
                          <Shield size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <button
                        onClick={() => handleBlockToggleClick(pastor)}
                        className={`p-2 rounded-lg transition-colors ${pastor.is_blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}
                        title={pastor.is_blocked ? "Unblock Pastor" : "Block Pastor"}
                      >
                        {pastor.is_blocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                      <button
                        onClick={() => setChangeRoleUser(pastor)}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Change Role"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(pastor)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Pastor"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-lg font-black leading-tight mb-1 ${pastor.is_blocked ? "text-gray-500" : "text-gray-900 group-hover:text-indigo-700 transition-colors"}`}>
                      {pastor.full_name}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md mb-3 inline-block" style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5' }}>
                      Pastor
                    </span>

                    <div className="rounded-xl p-3 mt-2" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Building size={14} className={pastor.churches ? "text-indigo-500" : "text-gray-400"} />
                          {pastor.churches ? (
                            <span className="text-gray-700 truncate text-xs font-semibold">{pastor.churches.name}</span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No Branch Assigned</span>
                          )}
                        </div>
                        {pastor.churches?.map_link && (
                          <a
                            href={pastor.churches.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg transition-colors shrink-0"
                            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
                            title="View on Map"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Map size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ═══════════════ MODAL ═══════════════ */}
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
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingPastor ? "Edit Pastor" : "Register Pastor"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage leadership profile</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors" style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                      placeholder="e.g. Pastor Yohannes"
                    />
                  </div>
                </div>

                {!editingPastor && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                          style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                          placeholder="pastor@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Temporary Password</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                          <Shield size={18} />
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                          style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                          placeholder="••••••••"
                        />
                      </div>
                      <PasswordStrengthMeter password={formData.password} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Assign Branch (Optional)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                      <Building size={18} />
                    </div>
                    <select
                      value={formData.church_id}
                      onChange={(e) => setFormData({ ...formData, church_id: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 appearance-none"
                      style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                    >
                      <option value="" className="text-gray-400">No Branch Assigned</option>
                      {churches.map((church) => (
                        <option key={church.id} value={church.id}>{church.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        {editingPastor ? <Save size={18} /> : <Plus size={18} />}
                        <span>{editingPastor ? "Update" : "Register"}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {changeRoleUser && (
        <ChangeRoleModal
          user={changeRoleUser}
          isOpen={!!changeRoleUser}
          onClose={() => setChangeRoleUser(null)}
          onSuccess={() => {
            setChangeRoleUser(null);
            fetchPastors();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
        type={confirmType}
        confirmText={confirmButtonText}
      />
    </motion.div>
  );
}
