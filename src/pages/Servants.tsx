import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
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
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";

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
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const d = ds(isDark);
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
  const { pathname } = useLocation();

  // Reset states on route change (fixes pop back bug)
  useEffect(() => {
    setConfirmOpen(false);
    setIsModalOpen(false);
    setChangeRoleUser(null);
  }, [pathname]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");
  const [confirmButtonText, setConfirmButtonText] = useState(t('common.confirm'));

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
        fetchMembers(profile.church_id);
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
      setSelectedMemberId("");
    }
  }, [editingServant, profile, isModalOpen]);

  const fetchMembers = async (churchId: string) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("church_id", churchId)
        .order("full_name");
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

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

      if ((profile?.role === "pastor" || profile?.role === "servant") && profile.church_id) {
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

      if ((profile?.role === "pastor" || profile?.role === "servant") && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setServants((data as any) || []);
    } catch (error) {
      console.error("Error fetching servants (legacy):", error);
      toast.error(t('servants.messages.loadError'));
    }
  };

  const handleChurchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const churchId = e.target.value;
    setFormData({ ...formData, church_id: churchId, department_ids: [] });
    setSelectedMemberId("");
    if (churchId) {
      await fetchDepartments(churchId);
      await fetchMembers(churchId);
    } else {
      setDepartments([]);
      setMembers([]);
    }
  };

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const memberId = e.target.value;
    setSelectedMemberId(memberId);
    if (memberId) {
      const member = members.find(m => m.id === memberId);
      if (member) {
        setFormData(prev => ({
          ...prev,
          full_name: member.full_name,
          email: member.email || "",
          department_ids: member.department_id ? [member.department_id] : prev.department_ids,
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, full_name: "", email: "" }));
    }
  };

  const handleBlockToggleClick = (servant: Servant) => {
    const isBlocking = !servant.is_blocked;
    setConfirmTitle(isBlocking ? t('servants.actions.block') : t('servants.actions.unblock'));
    setConfirmMessage(
      `${t('servants.messages.blockConfirmPrefix').replace('{{action}}', isBlocking ? t('common.block').toLowerCase() : t('common.unblock').toLowerCase()).replace('{{name}}', servant.full_name)} ${isBlocking ? t('servants.messages.blockWarning') : t('servants.messages.unblockWarning')}`
    );
    setConfirmType(isBlocking ? "danger" : "info");
    setConfirmButtonText(isBlocking ? t('servants.actions.block') : t('servants.actions.unblock'));
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
        (newStatus ? t('activity.actions.BLOCK') : t('activity.actions.UNBLOCK')) + ` ${t('servants.servant').toLowerCase()} ${servant.full_name}`,
        servant.id,
        { old: { is_blocked: servant.is_blocked }, new: { is_blocked: newStatus } }
      );

      toast.success(`${t('servants.servant')} ${newStatus ? t('common.blocked').toLowerCase() : t('common.unblocked').toLowerCase()} ${t('common.successfully').toLowerCase()}`);
      fetchServants();
    } catch (error: any) {
      console.error("Error updating servant status:", error);
      toast.error(error.message || t('common.error'));
    }
    setConfirmOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role === "super_admin" && !editingServant) {
      toast.error(t('servants.messages.superAdminForbidden'));
      return;
    }

    try {
      setSubmitting(true);
      let servantId = "";

      if (editingServant) {
        if (!formData.full_name) {
          toast.error(t('servants.messages.nameRequired'));
          return;
        }

        const oldChurch = churches.find(c => c.id === editingServant.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === (profile?.role === "super_admin" ? formData.church_id : editingServant.church_id))?.name || oldChurch;
        const oldDepts = editingServant.profile_departments?.map(pd => pd.departments?.name).filter(Boolean).sort().join(", ") || t('common.noBranchAssigned'); // Using a key that roughly means "None"
        const newDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).sort().join(", ") || t('common.noBranchAssigned');

        const logOld: any = { full_name: editingServant.full_name, departments: oldDepts };
        const logNew: any = { full_name: formData.full_name, departments: newDepts };

        if (profile?.role === "super_admin") {
          logOld.church_id = editingServant.church_id;
          logOld.church = oldChurch;
          logNew.church_id = formData.church_id;
          logNew.church = newChurch;
        }

        const diff = getObjectDiff(logOld, logNew);

        if (!diff) {
          toast.error(t('common.noChanges'));
          setSubmitting(false);
          return;
        }

        const dbUpdates: any = { department_id: null };
        if ('full_name' in diff.new) dbUpdates.full_name = diff.new.full_name;
        if ('church_id' in diff.new) dbUpdates.church_id = diff.new.church_id;

        const { error } = await supabase.from("profiles").update(dbUpdates).eq("id", editingServant.id);
        if (error) throw error;

        servantId = editingServant.id;

        const changedFields = Object.keys(diff.new).filter(k => k !== 'church_id').join(", ");
        await logActivity("UPDATE", "SERVANT", t('activity.actions.UPDATE') + ` ${t('servants.servant').toLowerCase()} "${editingServant.full_name}" (Changed: ${changedFields})`, editingServant.id, diff);
        toast.success(t('servants.messages.updateSuccess'));
      } else {
        if (!editingServant && !selectedMemberId && profile?.role !== "super_admin") {
          toast.error(t('servants.messages.selectMember'));
          return;
        }

        if (!formData.full_name || !formData.email || !formData.password || !formData.church_id) {
          toast.error(t('servants.messages.detailsRequired'));
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
        const selectedDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).join(", ") || t('common.noBranchAssigned');

        await logActivity("CREATE", "SERVANT", t('activity.actions.CREATE') + ` ${t('servants.servant').toLowerCase()} ${formData.full_name}`, servantId, {
          email: formData.email,
          full_name: formData.full_name,
          church: churchName,
          departments: selectedDepts
        });

        toast.success(t('servants.messages.registerSuccess'));
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
      toast.error(error.message || t('servants.messages.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (servant: Servant) => {
    setEditingServant(servant);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('servants.confirmDeleteMsg'))) return;
    try {
      const servantToDelete = servants.find((s) => s.id === id);
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;

      await logActivity("DELETE", "SERVANT", t('activity.actions.DELETE') + ` ${t('servants.servant').toLowerCase()} ${servantToDelete?.full_name || "Unknown"}`, id,
        servantToDelete ? { full_name: servantToDelete.full_name, church: servantToDelete.churches?.name } : null
      );
      toast.success(t('servants.messages.deleteSuccess'));
      fetchServants();
    } catch (error: any) {
      console.error("Error deleting servant:", error);
      toast.error(error.message || t('servants.messages.deleteError'));
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
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #0c1929 0%, #173254 40%, #3178B5 70%, #4B9BDC 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #7EC8F2, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #3178B5, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(126,200,242,0.3), rgba(75,155,220,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Flame size={24} className="text-blue-100" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#7EC8F2' }}>
                <Sparkles size={10} className="inline mr-1" /> {t('dashboard.ministryTeam')}
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #7EC8F2 50%, #4B9BDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {t('servants.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-blue-100/70 max-w-lg text-sm md:text-base font-medium"
            >
              {t('servants.subtitle')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4B9BDC, #3178B5)' }}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{servants.length}</p>
                <p className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider">{t('sidebar.servants')}</p>
              </div>
            </div>

            {profile?.role === "pastor" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #e8f1fa)', color: '#3178B5', boxShadow: '0 8px 32px rgba(49,120,181,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={18} />
                <span>{t('servants.registerServant')}</span>
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
            placeholder={t('servants.searchPlaceholder')}
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
              title={t('common.clearSearch')}
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
            <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 border-t-[#4B9BDC] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame size={18} className="text-[#4B9BDC]" />
            </div>
          </div>
        </div>
      ) : filteredServants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={d.emptyState}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={d.emptyIcon}>
            <Users className="h-10 w-10 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('servants.messages.noResults')}</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {t('common.tryAdjusting')}
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredServants.map((servant, index) => (
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
                key={servant.id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-[1.5rem] flex flex-col"

                style={d.card}
              >
                <div className={`h-1 ${servant.is_blocked ? 'bg-red-500' : ''}`} style={!servant.is_blocked ? { background: 'linear-gradient(90deg, #3178B5, #4B9BDC, #7EC8F2)' } : {}}></div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-8 -mt-8 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)' }}></div>

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
                            background: servant.is_blocked ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : (isDark ? 'rgba(75,155,220,0.12)' : 'linear-gradient(135deg, #f2f8fd, #e8f1fa)'),
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
                          {t('common.blocked')}
                        </motion.div>
                      ) : (
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-sm" style={{ background: '#10b981' }} title={t('common.active')}>
                          <Shield size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 p-1 rounded-xl" style={d.actionPill}>
                      <button
                        onClick={() => handleBlockToggleClick(servant)}
                        className={`p-2 rounded-lg transition-colors ${servant.is_blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}
                        title={servant.is_blocked ? t('servants.actions.unblock') : t('servants.actions.block')}
                      >
                        {servant.is_blocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                      {profile?.role === "super_admin" && (
                        <button
                          onClick={() => setChangeRoleUser(servant)}
                          className="p-2 text-[#4B9BDC] hover:text-[#3178B5] hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('servants.actions.changeRole')}
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      {profile?.role === "pastor" && (
                        <button
                          onClick={() => handleEdit(servant)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('servants.editServant')}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-lg font-black leading-tight mb-1 ${servant.is_blocked ? "text-gray-500" : "text-gray-900 dark:text-gray-100 group-hover:text-[#3178B5] transition-colors"}`}>
                      {servant.full_name}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md mb-3 inline-block" style={{ background: 'rgba(75,155,220,0.08)', color: '#3178B5' }}>
                      {t('servants.servant')}
                    </span>

                    <div className="rounded-xl p-3 mt-2 space-y-2" style={d.infoBox}>
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Building size={14} className={servant.churches ? "text-[#4B9BDC]" : "text-gray-500 dark:text-gray-400"} />
                          {servant.churches ? (
                            <span className="text-gray-700 dark:text-gray-400 truncate text-xs font-semibold">{servant.churches.name}</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 italic text-xs dark:text-gray-500">{t('servants.messages.noBranchAssigned')}</span>
                          )}
                        </div>
                        {servant.churches?.map_link && (
                          <a
                            href={servant.churches.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg transition-colors shrink-0"
                            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
                            title={t('dashboard.activity.viewOnMap')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Map size={12} />
                          </a>
                        )}
                      </div>
                      {servant.profile_departments && servant.profile_departments.length > 0 && (
                        <div className="flex items-start gap-2 pt-2" style={d.innerBorder}>
                          <Shield size={13} className="text-[#4B9BDC] mt-0.5" />
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
      {isModalOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[200] p-4"
            style={d.modalOverlay}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md p-8 relative overflow-hidden rounded-[2rem] max-h-[90vh] overflow-y-auto"
              style={d.modalContent}
            >
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #3178B5, #4B9BDC, #7EC8F2)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                    {editingServant ? t('servants.editServant') : t('servants.registerServant')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('servants.servantSubtitle')}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors" style={d.subtleButton}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('servants.details.assignBranch')}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                        <Building size={18} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={handleChurchChange}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 appearance-none"
                        style={d.formInput}
                      >
                        <option value="" disabled className="text-gray-500 dark:text-gray-400">{t('servants.details.selectBranch')}</option>
                        {churches.map((church) => (
                          <option key={church.id} value={church.id}>{church.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {editingServant ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('servants.details.fullName')}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        style={d.formInput}
                        placeholder={t('members.form.fullNamePlaceholder')}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('servants.details.selectMember')}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                        <User size={18} />
                      </div>
                      <select
                        required
                        value={selectedMemberId}
                        onChange={handleMemberSelect}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 appearance-none"
                        style={d.formInput}
                      >
                        <option value="" disabled>{t('servants.details.selectMemberPlaceholder')}</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Fallback full name input if you still want to allow overrides or not strictly bound to members */}
                  </div>
                )}

                {!editingServant && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('servants.details.email')}</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                          style={d.formInput}
                          placeholder={t('members.form.emailPlaceholder')}
                        />
                      </div>
                      {selectedMemberId && members.find(m => m.id === selectedMemberId)?.email && formData.email === members.find(m => m.id === selectedMemberId)?.email && (
                        <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium ml-1 flex items-start gap-1">
                          <span className="text-lg leading-none">&bull;</span> {t('servants.messages.usingMemberEmail')}
                        </p>
                      )}
                      {selectedMemberId && !members.find(m => m.id === selectedMemberId)?.email && !formData.email && (
                        <p className="mt-1.5 text-xs text-amber-600 font-medium ml-1 flex items-start gap-1">
                          <span className="text-lg leading-none">&bull;</span> {t('servants.messages.provideEmail')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('servants.details.temporaryPassword')}</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                          <Shield size={18} />
                        </div>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                          style={d.formInput}
                          placeholder={t('servants.details.passwordPlaceholder')}
                        />
                      </div>
                      <PasswordStrengthMeter password={formData.password} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1 flex justify-between">
                    <span>{t('servants.details.assignDepartments')}</span>
                    {formData.department_ids.length > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(75,155,220,0.08)', color: '#3178B5', border: '1px solid rgba(249,115,22,0.15)' }}>
                        {formData.department_ids.length} {t('common.selected')}
                      </span>
                    )}
                  </label>
                  <div className="rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2" style={d.checkboxArea}>
                    {departments.length === 0 ? (
                      <p className="text-sm font-medium text-gray-500 italic text-center py-4">
                        {t('servants.messages.noDepartmentsSelectBranch')}
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
                            className="rounded-md border-gray-300 text-[#4B9BDC] focus:ring-orange-500 w-5 h-5"
                          />
                          <label htmlFor={`dept-${dept.id}`} className="text-sm font-bold text-gray-700 dark:text-gray-400 cursor-pointer select-none flex-1">
                            {dept.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6" style={d.modalFooterBorder}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    {t('common.cancel')}
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
                        {editingServant ? <Save size={18} /> : <Plus size={18} />}
                        <span>{editingServant ? t('common.save') : t('servants.registerServant')}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
