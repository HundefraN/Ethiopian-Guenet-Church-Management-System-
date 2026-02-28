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
  X,
  Edit2,
  Shield,
  ShieldOff,
  RefreshCw,
  Save,
  Map,
  Sparkles,
  Crown,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Church, Profile, Member } from "../types";
import toast from "react-hot-toast";
import { invokeSupabaseFunction } from "../utils/supabaseFunctions";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ChangeRoleModal from "../components/ChangeRoleModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";

interface Pastor extends Profile {
  email?: string;
  churches?: {
    name: string;
    map_link?: string | null;
  } | null;
}

export default function Pastors() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const d = ds(isDark);
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPastor, setEditingPastor] = useState<Pastor | null>(null);
  // Member selection states
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  const [changeRoleUser, setChangeRoleUser] = useState<Pastor | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const { pathname } = useLocation();

  // Reset states on route change (fixes pop back bug)
  useEffect(() => {
    setConfirmOpen(false);
    setIsModalOpen(false);
    setChangeRoleUser(null);
  }, [pathname]);

  const filteredDropdownMembers = useMemo(() => {
    let list = members;
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      list = members.filter((m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 30); // show up to 30 to allow scrolling
  }, [members, memberSearchQuery]);

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
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPastors(), fetchChurches(), fetchMembers()]);
    setLoading(false);
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase.from("members").select("*").order("full_name");
      if (error) throw error;
      setMembers((data as Member[]) || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
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
      toast.error(t('pastors.messages.loadError'));
    }
  };

  const handleBlockToggleClick = (pastor: Pastor) => {
    const isBlocking = !pastor.is_blocked;
    setConfirmTitle(isBlocking ? t('pastors.actions.block') : t('pastors.actions.unblock'));
    setConfirmMessage(
      t('pastors.messages.blockConfirmPrefix', { action: (isBlocking ? t('common.block') : t('common.unblock')).toLowerCase(), name: pastor.full_name }) + " " + (isBlocking ? t('pastors.messages.blockWarning') : t('pastors.messages.unblockWarning'))
    );
    setConfirmType(isBlocking ? "danger" : "info");
    setConfirmButtonText(isBlocking ? t('common.block') : t('common.unblock'));
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

      toast.success(t('pastors.messages.' + (newStatus ? 'blockSuccess' : 'unblockSuccess')));
      fetchPastors();
    } catch (error: any) {
      console.error("Error updating pastor status:", error);
      toast.error(error.message || t('common.error'));
    }
    setConfirmOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPastor) {
      if (!formData.full_name) {
        toast.error(t('pastors.messages.nameRequired'));
        return;
      }

      try {
        setSubmitting(true);
        const updates: any = {
          full_name: formData.full_name,
          church_id: formData.church_id || null,
        };

        const oldChurch = churches.find(c => c.id === editingPastor.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === updates.church_id)?.name || "No Branch Assigned";

        const logOld = { full_name: editingPastor.full_name, church_id: editingPastor.church_id, church: oldChurch };
        const logNew = { full_name: formData.full_name, church_id: updates.church_id, church: newChurch };

        const diff = getObjectDiff(logOld, logNew);

        if (!diff) {
          toast.error(t('common.noChanges'));
          setSubmitting(false);
          return;
        }

        const dbUpdates: any = {};
        if ('full_name' in diff.new) dbUpdates.full_name = diff.new.full_name;
        if ('church_id' in diff.new) dbUpdates.church_id = diff.new.church_id;

        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase
            .from("profiles")
            .update(dbUpdates)
            .eq("id", editingPastor.id);

          if (error) throw error;
        }

        const changedFields = Object.keys(diff.new).filter(k => k !== 'church_id').join(", ");
        const details = `Updated pastor "${editingPastor.full_name}" (Changed: ${changedFields})`;

        await logActivity("UPDATE", "PASTOR", details, editingPastor.id, diff);

        toast.success(t('pastors.messages.updateSuccess'));
        setEditingPastor(null);
        setIsModalOpen(false);
        fetchPastors();
      } catch (error: any) {
        console.error("Error updating pastor:", error);
        toast.error(t('pastors.messages.updateError'));
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error(t('pastors.messages.detailsRequired'));
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

        toast.success(t('pastors.messages.registerSuccess'));
        setFormData({ full_name: "", email: "", password: "", church_id: "" });
        setIsModalOpen(false);
        fetchPastors();
      } catch (error: any) {
        console.error("Error creating pastor:", error);
        toast.error(error.message || t('common.error'));
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
    setSelectedMember(null);
    setIsMemberDropdownOpen(false);
    setMemberSearchQuery("");
    setFormData({ full_name: "", email: "", password: "", church_id: "" });
    setIsManualEntry(false);
    setIsModalOpen(true);
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      ...formData,
      full_name: member.full_name,
      email: member.email || formData.email,
      church_id: member.church_id || formData.church_id,
    });
    setIsMemberDropdownOpen(false);
    setMemberSearchQuery("");
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
                <Crown size={24} className="text-blue-100" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#7EC8F2' }}>
                <Sparkles size={10} className="inline mr-1" /> {t('pastors.labels.leadership')}
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #7EC8F2 50%, #4B9BDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {t('pastors.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-blue-100/70 max-w-lg text-sm md:text-base font-medium"
            >
              {t('pastors.subtitle')}
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
                <Crown size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{pastors.length}</p>
                <p className="text-[10px] font-bold text-blue-200/70 uppercase tracking-wider">{t('sidebar.pastors')}</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #ffffff, #e8f1fa)', color: '#3178B5', boxShadow: '0 8px 32px rgba(49,120,181,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
            >
              <Plus size={18} />
              <span>{t('pastors.registerPastor')}</span>
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
            placeholder={t('pastors.searchPlaceholder')}
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

      {/* ═══════════════ PASTOR CARDS GRID ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 border-t-[#4B9BDC] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Crown size={18} className="text-[#4B9BDC]" />
            </div>
          </div>
        </div>
      ) : filteredPastors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={d.emptyState}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={d.emptyIcon}>
            <User className="h-10 w-10 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('pastors.messages.noPastors')}</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {t('pastors.messages.noPastorsSub')}
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {filteredPastors.map((pastor, index) => (
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
                key={pastor.id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative overflow-hidden rounded-[1.5rem] flex flex-col"
                style={d.card}
              >
                <div className={`h-1 ${pastor.is_blocked ? 'bg-red-500' : ''}`} style={!pastor.is_blocked ? { background: 'linear-gradient(90deg, #3178B5, #4B9BDC, #7EC8F2)' } : {}}></div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-8 -mt-8 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)' }}></div>

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
                            background: pastor.is_blocked ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : (isDark ? 'rgba(75,155,220,0.12)' : 'linear-gradient(135deg, #f2f8fd, #e8f1fa)'),
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
                        onClick={() => handleBlockToggleClick(pastor)}
                        className={`p-2 rounded-lg transition-colors ${pastor.is_blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}
                        title={pastor.is_blocked ? t('pastors.actions.unblock') : t('pastors.actions.block')}
                      >
                        {pastor.is_blocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                      <button
                        onClick={() => setChangeRoleUser(pastor)}
                        className="p-2 text-[#4B9BDC] hover:text-[#3178B5] hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('pastors.actions.changeRole')}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(pastor)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('pastors.edit')}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-lg font-black leading-tight mb-1 ${pastor.is_blocked ? "text-gray-500" : "text-gray-900 dark:text-gray-100 group-hover:text-[#3178B5] transition-colors"}`}>
                      {pastor.full_name}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md mb-3 inline-block" style={{ background: 'rgba(75,155,220,0.08)', color: '#3178B5' }}>
                      {t('pastors.pastor')}
                    </span>

                    <div className="rounded-xl p-3 mt-2 space-y-2" style={d.infoBox}>
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Building size={14} className={pastor.churches ? "text-[#4B9BDC]" : "text-gray-500 dark:text-gray-400"} />
                          {pastor.churches ? (
                            <span className="text-gray-700 dark:text-gray-400 truncate text-xs font-semibold">{pastor.churches.name}</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 italic text-xs dark:text-gray-500">{t('common.noBranchAssigned')}</span>
                          )}
                        </div>
                        {pastor.churches?.map_link && (
                          <a
                            href={pastor.churches.map_link}
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
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ═══════════════ MODAL ═══════════════ */}
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
                    {editingPastor ? t('pastors.edit') : t('pastors.register')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('pastors.labels.manageProfile')}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors" style={d.subtleButton}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">
                    {editingPastor ? t('pastors.form.fullName') : (isManualEntry ? t('pastors.form.fullName') : t('pastors.form.fullName') + " (Select Member)")}
                  </label>

                  {editingPastor || isManualEntry ? (
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
                        placeholder={t('pastors.form.namePlaceholder')}
                      />
                      {!editingPastor && isManualEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualEntry(false);
                            setFormData({ ...formData, full_name: "" });
                            setSelectedMember(null);
                          }}
                          className="mt-2 text-xs font-bold text-[#4B9BDC] hover:text-[#3178B5] transition-colors ml-1"
                        >
                          {t('common.roles.MEMBER')} {t('common.search')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                        className="w-full flex items-center justify-between pl-4 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-left shadow-sm"
                        style={{ ...d.formInput, borderColor: isMemberDropdownOpen ? '#4B9BDC' : 'transparent', outline: isMemberDropdownOpen ? '2px solid rgba(75,155,220,0.2)' : 'none' }}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <User size={18} className="text-[#4B9BDC] shrink-0" />
                          <span className={selectedMember ? "text-gray-900 dark:text-gray-100 truncate" : "text-gray-400 truncate"}>
                            {selectedMember ? selectedMember.full_name : "Select a member..."}
                          </span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 shrink-0 ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isMemberDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-[110]"
                            onClick={() => setIsMemberDropdownOpen(false)}
                          />
                          <div className="absolute z-[120] w-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col pt-1">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                              <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={memberSearchQuery}
                                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                                  placeholder="Search by name or email..."
                                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B9BDC]/50 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                />
                              </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto custom-scrollbar pb-1">
                              {filteredDropdownMembers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                  No members found.
                                </div>
                              ) : (
                                filteredDropdownMembers.map((member) => {
                                  const church = churches.find(c => c.id === member.church_id);
                                  const isSelected = selectedMember?.id === member.id;

                                  return (
                                    <div
                                      key={member.id}
                                      onClick={() => handleSelectMember(member)}
                                      className={`px-4 py-3 cursor-pointer flex flex-col transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${isSelected
                                        ? 'bg-blue-50/70 dark:bg-blue-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className={`font-bold ${isSelected ? 'text-[#4B9BDC]' : 'text-gray-900 dark:text-white'}`}>
                                          {member.full_name}
                                        </span>
                                        {church && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            {church.name}
                                          </span>
                                        )}
                                      </div>
                                      {member.email && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          {member.email}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {!isManualEntry && (
                        <button
                          type="button"
                          onClick={() => setIsManualEntry(true)}
                          className="mt-2 text-xs font-bold text-[#4B9BDC] hover:text-[#3178B5] transition-colors ml-1"
                        >
                          {t('pastors.form.chooseAnotherWay')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!editingPastor && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('pastors.form.email')}</label>
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
                          placeholder={t('pastors.form.emailPlaceholder')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('pastors.form.temporaryPassword')}</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                          <Shield size={18} />
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400"
                          style={d.formInput}
                          placeholder="••••••••"
                        />
                      </div>
                      <PasswordStrengthMeter password={formData.password} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 ml-1">{t('pastors.form.assignBranch')}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                      <Building size={18} />
                    </div>
                    <select
                      value={formData.church_id}
                      onChange={(e) => setFormData({ ...formData, church_id: e.target.value })}
                      className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100 appearance-none"
                      style={d.formInput}
                    >
                      <option value="" className="text-gray-500 dark:text-gray-400">{t('common.noBranchAssigned')}</option>
                      {churches.map((church) => (
                        <option key={church.id} value={church.id}>{church.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6" style={d.modalFooterBorder}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        {editingPastor ? <Save size={18} /> : <Plus size={18} />}
                        <span>{editingPastor ? t('common.save') : t('pastors.register')}</span>
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
