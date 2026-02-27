import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Loader2,
  Mail,
  Building,
  Shield,
  X,
  Edit2,
  Save,
  ShieldOff,
  RefreshCw,
  Users,
  Map,
  Sparkles,
  Flame,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Church, Profile, Department } from "../types";
import toast from "react-hot-toast";
import { invokeSupabaseFunction } from "../utils/supabaseFunctions";
import { useAuth } from "../context/AuthContext";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ChangeRoleModal from "../components/ChangeRoleModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

interface Servant extends Profile {
  email?: string;
  churches?: {
    name: string;
    map_link?: string | null;
  } | null;
  profile_departments?: {
    departments: {
      id: string;
      name: string;
    } | null;
  }[];
}

export default function Servants() {
  const { profile } = useAuth();
  const [servants, setServants] = useState<Servant[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServant, setEditingServant] = useState<Servant | null>(null);
  const [changeRoleUser, setChangeRoleUser] = useState<Servant | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    department_ids: [] as string[],
  });

  useEffect(() => {
    if (profile) {
      fetchData();
      if (profile.church_id) {
        setFormData((prev) => ({ ...prev, church_id: profile.church_id! }));
        fetchDepartments(profile.church_id);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (editingServant) {
      const deptIds =
        (editingServant.profile_departments
          ?.map((pd) => pd.departments?.id)
          .filter(Boolean) as string[]) || [];
      setFormData({
        full_name: editingServant.full_name,
        email: editingServant.email || "",
        password: "",
        church_id: editingServant.church_id || "",
        department_ids: deptIds,
      });
      if (editingServant.church_id) {
        fetchDepartments(editingServant.church_id);
      }
    } else {
      setFormData({
        full_name: "",
        email: "",
        password: "",
        church_id: profile?.church_id || "",
        department_ids: [],
      });
    }
  }, [editingServant, profile, isModalOpen]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchServants(),
      profile?.role === "super_admin" ? fetchChurches() : null,
    ]);
    setLoading(false);
  };

  const fetchChurches = async () => {
    const { data } = await supabase.from("churches").select("*").order("name");
    if (data) setChurches(data);
  };

  const fetchDepartments = async (churchId: string) => {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .eq("church_id", churchId)
      .order("name");
    if (data) setDepartments(data);
  };

  const fetchServants = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select(`*, churches ( name, map_link ), profile_departments ( departments ( id, name ) )`)
        .eq("role", "servant")
        .order("created_at", { ascending: false });

      if (profile?.role === "pastor" && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === "PGRST200") {
          await fetchServantsLegacy();
          return;
        }
        throw error;
      }

      setServants((data as any) || []);
    } catch (error) {
      console.error("Error fetching servants (new schema):", error);
      await fetchServantsLegacy();
    }
  };

  const fetchServantsLegacy = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select(`*, churches ( name, map_link ), departments ( name )`)
        .eq("role", "servant")
        .order("created_at", { ascending: false });

      if (profile?.role === "pastor" && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setServants((data as any) || []);
    } catch (error) {
      console.error("Error fetching servants (legacy):", error);
      toast.error("Failed to load servants");
    }
  };

  const handleChurchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const churchId = e.target.value;
    setFormData({ ...formData, church_id: churchId, department_ids: [] });
    if (churchId) {
      await fetchDepartments(churchId);
    } else {
      setDepartments([]);
    }
  };

  const handleBlockToggleClick = (servant: Servant) => {
    const isBlocking = !servant.is_blocked;
    setConfirmTitle(isBlocking ? "Block Servant" : "Unblock Servant");
    setConfirmMessage(
      `Are you sure you want to ${isBlocking ? "block" : "unblock"} ${servant.full_name}? ${isBlocking ? "They will lose access to the system." : "They will regain access to the system."}`
    );
    setConfirmType(isBlocking ? "danger" : "info");
    setConfirmButtonText(isBlocking ? "Block" : "Unblock");
    setConfirmAction(() => () => toggleBlockStatus(servant));
    setConfirmOpen(true);
  };

  const toggleBlockStatus = async (servant: Servant) => {
    try {
      const newStatus = !servant.is_blocked;
      const { error } = await supabase.from("profiles").update({ is_blocked: newStatus }).eq("id", servant.id);
      if (error) throw error;

      await logActivity(
        newStatus ? "BLOCK" : "UNBLOCK",
        "SERVANT",
        `${newStatus ? "Blocked" : "Unblocked"} servant ${servant.full_name}`,
        servant.id,
        { old: { is_blocked: servant.is_blocked }, new: { is_blocked: newStatus } }
      );

      toast.success(`Servant ${newStatus ? "blocked" : "unblocked"} successfully`);
      fetchServants();
    } catch (error: any) {
      console.error("Error updating servant status:", error);
      toast.error(error.message || "Failed to update status");
    }
    setConfirmOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role === "super_admin" && !editingServant) {
      toast.error("Super admins cannot register servants directly");
      return;
    }

    try {
      setSubmitting(true);
      let servantId = "";

      if (editingServant) {
        if (!formData.full_name) {
          toast.error("Full name is required");
          return;
        }

        const updates: any = { full_name: formData.full_name, department_id: null };
        if (profile?.role === "super_admin") {
          updates.church_id = formData.church_id;
        }

        const { error } = await supabase.from("profiles").update(updates).eq("id", editingServant.id);
        if (error) throw error;

        servantId = editingServant.id;

        const oldChurch = churches.find(c => c.id === editingServant.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === (profile?.role === "super_admin" ? formData.church_id : editingServant.church_id))?.name || oldChurch;
        const oldDepts = editingServant.profile_departments?.map(pd => pd.departments?.name).filter(Boolean).join(", ") || "None";
        const newDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).join(", ") || "None";

        const logOld = { full_name: editingServant.full_name, church: oldChurch, departments: oldDepts };
        const logNew = { full_name: formData.full_name, church: newChurch, departments: newDepts };
        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity("UPDATE", "SERVANT", `Updated servant ${formData.full_name}`, editingServant.id, diff);
        }
        toast.success("Servant updated successfully");
      } else {
        if (!formData.full_name || !formData.email || !formData.password || !formData.church_id) {
          toast.error("Full name, email, password and church are required");
          return;
        }

        const { data: responseData } = await invokeSupabaseFunction("create-user", {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: "servant",
            church_id: formData.church_id,
            department_id: null,
          },
        });

        if (responseData?.error) {
          throw new Error(responseData.error);
        }

        servantId = responseData.user.id;
        const churchName = churches.find(c => c.id === formData.church_id)?.name || "Unknown";
        const selectedDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).join(", ") || "None";

        await logActivity("CREATE", "SERVANT", `Registered new servant ${formData.full_name}`, servantId, {
          email: formData.email,
          full_name: formData.full_name,
          church: churchName,
          departments: selectedDepts
        });

        toast.success("Servant registered successfully");
      }

      if (servantId) {
        const { error: deleteError } = await supabase.from("profile_departments").delete().eq("profile_id", servantId);
        if (deleteError) throw deleteError;

        if (formData.department_ids.length > 0) {
          const assignments = formData.department_ids.map((deptId) => ({
            profile_id: servantId,
            department_id: deptId,
          }));
          const { error: insertError } = await supabase.from("profile_departments").insert(assignments);
          if (insertError) throw insertError;
        }
      }

      setEditingServant(null);
      setIsModalOpen(false);
      fetchServants();
    } catch (error: any) {
      console.error("Error saving servant:", error);
      toast.error(error.message || "Failed to save servant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (servant: Servant) => {
    setEditingServant(servant);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this servant? This action cannot be undone.")) return;
    try {
      const servantToDelete = servants.find((s) => s.id === id);
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;

      await logActivity("DELETE", "SERVANT", `Deleted servant ${servantToDelete?.full_name || "Unknown"}`, id,
        servantToDelete ? { full_name: servantToDelete.full_name, church: servantToDelete.churches?.name } : null
      );
      toast.success("Servant deleted successfully");
      fetchServants();
    } catch (error: any) {
      console.error("Error deleting servant:", error);
      toast.error(error.message || "Failed to delete servant");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingServant(null);
  };

  const filteredServants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return servants;
    return servants.filter((servant) => {
      const deptNames =
        servant.profile_departments?.map((pd) => pd.departments?.name?.toLowerCase()).filter(Boolean).join(" ") || "";
      return (
        (servant.full_name && servant.full_name.toLowerCase().includes(query)) ||
        (servant.email && servant.email.toLowerCase().includes(query)) ||
        (servant.churches?.name && servant.churches.name.toLowerCase().includes(query)) ||
        deptNames.includes(query)
      );
    });
  }, [servants, searchQuery]);

  const hasChanges = useMemo(() => {
    if (!editingServant) {
      return !!(formData.full_name || formData.email || formData.password || formData.church_id || formData.department_ids.length > 0);
    }

    const currentDeptIds = (editingServant.profile_departments?.map((pd) => pd.departments?.id).filter(Boolean) as string[]) || [];
    const deptsChanged =
      formData.department_ids.length !== currentDeptIds.length ||
      !formData.department_ids.every(id => currentDeptIds.includes(id));

    return (
      formData.full_name !== (editingServant.full_name || "") ||
      formData.church_id !== (editingServant.church_id || "") ||
      deptsChanged
    );
  }, [formData, editingServant]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #431407 0%, #7c2d12 40%, #c2410c 70%, #f97316 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #fb923c, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #fbbf24, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #f97316, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.3), rgba(251,191,36,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Flame size={24} className="text-orange-200" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fdba74' }}>
                <Sparkles size={10} className="inline mr-1" /> Ministry Team
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fdba74 50%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Servants Directory
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-orange-200/60 max-w-lg text-sm md:text-base font-medium"
            >
              Manage church servants, department assignments, and access levels.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{servants.length}</p>
                <p className="text-[10px] font-bold text-orange-300/60 uppercase tracking-wider">Servants</p>
              </div>
            </div>

            {profile?.role !== "super_admin" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #ffedd5)', color: '#ea580c', boxShadow: '0 8px 32px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={18} />
                <span>Register Servant</span>
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
            border: searchFocused ? '1.5px solid rgba(249,115,22,0.3)' : '1.5px solid rgba(0,0,0,0.06)',
            boxShadow: searchFocused ? '0 8px 32px rgba(249,115,22,0.1), 0 0 0 4px rgba(249,115,22,0.05)' : '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div className="pl-4 pr-2">
            <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-orange-500' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search servants by name, assigned church, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 mr-2 text-gray-400 hover:text-orange-500 rounded-xl hover:bg-orange-50 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ SERVANT CARDS GRID ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-orange-100 border-t-orange-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame size={18} className="text-orange-400" />
            </div>
          </div>
        </div>
      ) : filteredServants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <Users className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No servants found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Try adjusting your search or register a new servant.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredServants.map((servant, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.04, type: "spring", stiffness: 150 }}
                key={servant.id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-[1.5rem] flex flex-col transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}
              >
                <div className={`h-1 ${servant.is_blocked ? 'bg-red-500' : ''}`} style={!servant.is_blocked ? { background: 'linear-gradient(90deg, #f97316, #f59e0b, #eab308)' } : {}}></div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-8 -mt-8 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, #f97316, transparent)' }}></div>

                  <div className="flex items-start justify-between mb-4 mt-1">
                    <div className="relative">
                      {servant.avatar_url ? (
                        <img
                          src={servant.avatar_url}
                          alt={servant.full_name || "Servant"}
                          className={`w-14 h-14 rounded-2xl object-cover shadow-sm transition-all duration-300 ${servant.is_blocked ? "grayscale-[0.8] opacity-60 scale-95" : ""}`}
                          style={{ border: servant.is_blocked ? '2px solid #fca5a5' : '2px solid rgba(249,115,22,0.2)' }}
                        />
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${servant.is_blocked ? "grayscale scale-95" : "group-hover:scale-105"}`}
                          style={{
                            background: servant.is_blocked ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                            color: servant.is_blocked ? '#fca5a5' : '#f97316'
                          }}
                        >
                          <User size={28} />
                        </div>
                      )}
                      {servant.is_blocked ? (
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
                        onClick={() => handleBlockToggleClick(servant)}
                        className={`p-2 rounded-lg transition-colors ${servant.is_blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}
                        title={servant.is_blocked ? "Unblock Servant" : "Block Servant"}
                      >
                        {servant.is_blocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                      {profile?.role === "super_admin" && (
                        <button
                          onClick={() => setChangeRoleUser(servant)}
                          className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Change Role"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      {profile?.role !== "super_admin" && (
                        <button
                          onClick={() => handleEdit(servant)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Servant"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-lg font-black leading-tight mb-1 ${servant.is_blocked ? "text-gray-500" : "text-gray-900 group-hover:text-orange-600 transition-colors"}`}>
                      {servant.full_name}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md mb-3 inline-block" style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c' }}>
                      Servant
                    </span>

                    <div className="rounded-xl p-3 mt-2 space-y-2" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Building size={14} className={servant.churches ? "text-orange-500" : "text-gray-400"} />
                          {servant.churches ? (
                            <span className="text-gray-700 truncate text-xs font-semibold">{servant.churches.name}</span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No Branch Assigned</span>
                          )}
                        </div>
                        {servant.churches?.map_link && (
                          <a
                            href={servant.churches.map_link}
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
                      {servant.profile_departments && servant.profile_departments.length > 0 && (
                        <div className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                          <Shield size={13} className="text-purple-500 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {servant.profile_departments.map((pd) => (
                              <span key={pd.departments?.id} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.15)' }}>
                                {pd.departments?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Change Role Modal */}
      <ChangeRoleModal
        isOpen={!!changeRoleUser}
        onClose={() => setChangeRoleUser(null)}
        user={changeRoleUser}
        onSuccess={fetchServants}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
        type={confirmType}
        confirmText={confirmButtonText}
      />

      {/* ═══════════════ ADD/EDIT SERVANT MODAL ═══════════════ */}
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
              className="w-full max-w-md p-8 relative overflow-hidden rounded-[2rem] max-h-[90vh] overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px)', boxShadow: '0 25px 80px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.9)' }}
            >
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b, #eab308)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingServant ? "Edit Servant" : "Register Servant"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage servant profile</p>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                      style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                      placeholder="e.g. Abebe Kebede"
                    />
                  </div>
                </div>

                {!editingServant && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                          style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                          placeholder="servant@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Temporary Password</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                          <Shield size={18} />
                        </div>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                          style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                          placeholder="Min. 6 characters"
                        />
                      </div>
                      <PasswordStrengthMeter password={formData.password} />
                    </div>
                  </>
                )}

                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Assign Branch</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                        <Building size={18} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={handleChurchChange}
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 flex justify-between">
                    <span>Assign Departments</span>
                    {formData.department_ids.length > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.15)' }}>
                        {formData.department_ids.length} Selected
                      </span>
                    )}
                  </label>
                  <div className="rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2" style={{ background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.06)' }}>
                    {departments.length === 0 ? (
                      <p className="text-sm font-medium text-gray-500 italic text-center py-4">
                        No departments available. Select a church first.
                      </p>
                    ) : (
                      departments.map((dept) => (
                        <div key={dept.id} className="flex items-center gap-3 p-2.5 hover:bg-white rounded-xl transition-colors" style={{ border: formData.department_ids.includes(dept.id) ? '1.5px solid rgba(249,115,22,0.2)' : '1.5px solid transparent' }}>
                          <input
                            type="checkbox"
                            id={`dept-${dept.id}`}
                            checked={formData.department_ids.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({ ...prev, department_ids: [...prev.department_ids, dept.id] }));
                              } else {
                                setFormData((prev) => ({ ...prev, department_ids: prev.department_ids.filter((id) => id !== dept.id) }));
                              }
                            }}
                            className="rounded-md border-gray-300 text-orange-500 focus:ring-orange-500 w-5 h-5"
                          />
                          <label htmlFor={`dept-${dept.id}`} className="text-sm font-bold text-gray-700 cursor-pointer select-none flex-1">
                            {dept.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

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
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 8px 24px rgba(249,115,22,0.25)' }}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        {editingServant ? <Save size={18} /> : <Plus size={18} />}
                        <span>{editingServant ? "Save Changes" : "Register Servant"}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
