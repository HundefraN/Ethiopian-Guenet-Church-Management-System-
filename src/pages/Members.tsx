import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  Plus,
  Filter,
  Mail,
  Phone,
  Loader2,
  Edit2,
  Trash2,
  Eye,
  User,
  Users,
  Building,
  Briefcase,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Member } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import MemberDetails from "../components/MemberDetails";
import MasterDetailLayout from "../components/common/MasterDetailLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { logActivity } from "../utils/activityLogger";
import { getMemberColors } from "../utils/memberColors";
import { calculateProfileCompletion } from "../utils/memberCompletion";

interface MemberWithDetails extends Member {
  departments: {
    name: string;
    id?: string;
  } | null;
  churches: {
    name: string;
    map_link?: string;
  } | null;
  isProfile?: boolean;
  role?: string;
}

export default function Members() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const d = ds(isDark);
  const navigate = useNavigate();
  const { id } = useParams();
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingMember, setViewingMember] = useState<MemberWithDetails | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");

  useEffect(() => {
    if (profile) {
      fetchMembers();
    }
  }, [profile]);

  useEffect(() => {
    if (id && members.length > 0) {
      const m = members.find((m) => m.id === id);
      if (m) {
        setViewingMember(m);
      }
    } else if (!id) {
      setViewingMember(null);
    }
  }, [id, members]);

  // Reset confirm dialog on route change (fixes pop back bug)
  useEffect(() => {
    setConfirmOpen(false);
  }, [id]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      let query = supabase.from("members").select(`
          *,
          departments (
            name
          ),
          churches (
            name,
            map_link
          )
        `);

      let rolesToFetch = ["pastor", "servant"];
      if (profile?.role === "servant") {
        rolesToFetch = ["pastor"]; // Servants shouldn't watch other servants
      }

      let profilesQuery = supabase.from("profiles").select(`
          id, full_name, role, church_id, department_id, avatar_url, email,
          departments ( name ),
          churches ( name, map_link ),
          profile_departments ( departments ( id, name ) )
        `).in("role", rolesToFetch);

      if ((profile?.role === "pastor" || profile?.role === "servant") && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
        profilesQuery = profilesQuery.eq("church_id", profile.church_id);
      }

      const [membersRes, profilesRes] = await Promise.all([query.order("full_name"), profilesQuery]);

      if (membersRes.error) throw membersRes.error;
      if (profilesRes.error) {
        console.error("Error fetching profiles as members:", profilesRes.error);
      }

      const regularMembers = (membersRes.data as any[]) || [];
      const fetchedProfiles = (profilesRes.data as any[]) || [];

      const memberEmails = new Set(regularMembers.map((m: any) => m.email?.toLowerCase()).filter(Boolean));

      const profileMembers = fetchedProfiles
        .filter((p: any) => !memberEmails.has(p.email?.toLowerCase()))
        .map((p: any) => ({
          id: p.id,
          church_id: p.church_id || '',
          department_id: p.department_id || p.profile_departments?.[0]?.departments?.id || null,
          full_name: p.full_name || 'Unknown',
          phone: null,
          email: p.email || null,
          photo: p.avatar_url || undefined,
          churches: p.churches || null,
          departments: p.departments || p.profile_departments?.[0]?.departments || null,
          role: p.role,
          isProfile: true,
          status: "Active"
        } as unknown as MemberWithDetails));

      let allMembers = [...regularMembers, ...profileMembers];
      allMembers.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setMembers(allMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error(t("members.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: MemberWithDetails) => {
    navigate(`/members/edit/${member.id}`);
  };

  const handleAddMember = () => {
    navigate("/members/add");
  };

  const handleDeleteClick = (id: string) => {
    setConfirmTitle(t("members.messages.deleteConfirmTitle"));
    setConfirmMessage(t("members.messages.deleteConfirmMsg"));
    setConfirmType("danger");
    setConfirmAction(() => () => deleteMember(id));
    setConfirmOpen(true);
  };

  const deleteMember = async (id: string) => {
    const loadingToast = toast.loading(t("members.messages.deleting"));
    const memberToDelete = members.find((m) => m.id === id);
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) {
      await logActivity(
        "DELETE",
        "MEMBER",
        `Deleted member ${memberToDelete?.full_name || "Unknown"}`,
        id,
        memberToDelete ? { full_name: memberToDelete.full_name, church: memberToDelete.churches?.name, department: memberToDelete.departments?.name } : null
      );
      toast.success(t("members.messages.deleteSuccess"), { id: loadingToast });
      fetchMembers();
    } else {
      toast.error(error.message, { id: loadingToast });
    }
    setConfirmOpen(false);
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (member) =>
        (member.full_name && member.full_name.toLowerCase().includes(query)) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.phone && member.phone.includes(query)) ||
        (profile?.role !== "servant" && member.departments?.name &&
          member.departments.name.toLowerCase().includes(query)) ||
        (member.churches?.name &&
          member.churches.name.toLowerCase().includes(query))
    );
  }, [members, searchQuery]);

  const canEdit = profile?.role === "pastor" || profile?.role === "servant";

  return (
    <MasterDetailLayout
      isOpen={!!id}
      onClose={() => navigate("/members")}
      detail={<MemberDetails member={viewingMember} />}
      title={viewingMember?.full_name || t("members.detailsTitle")}
      actions={
        viewingMember && canEdit && (
          !viewingMember.isProfile ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEditMember(viewingMember)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDeleteClick(viewingMember.id)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(viewingMember.role === 'pastor' ? '/pastors' : '/servants')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Manage Profile"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 pb-10"
      >
        {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-xl" style={{ background: 'linear-gradient(135deg, #0c1929 0%, #173254 40%, #3178B5 70%, #4B9BDC 100%)' }}>
          {/* Animated mesh orbs */}
          <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 rounded-full opacity-25 blur-[50px] sm:blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #7EC8F2, transparent)' }}></div>
          <div className="absolute bottom-0 left-0 w-32 sm:w-60 h-32 sm:h-60 rounded-full opacity-20 blur-[40px] sm:blur-[60px]" style={{ background: 'radial-gradient(circle, #4B9BDC, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
          <div className="absolute top-1/2 left-1/3 w-36 sm:w-72 h-36 sm:h-72 rounded-full opacity-10 blur-[60px] sm:blur-[100px]" style={{ background: 'radial-gradient(circle, #3178B5, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

          <div className="relative z-10 flex flex-col gap-3 sm:gap-4 md:gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Title Section */}
            <div className="text-white flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 md:mb-3 flex-wrap"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(126,200,242,0.3), rgba(75,155,220,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Users size={16} className="text-blue-100 sm:w-5 sm:h-5" />
                </div>
                <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#7EC8F2' }}>
                  <Sparkles size={10} className="inline mr-1" /> {t("members.subtitle")}
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight mb-0.5 sm:mb-1.5 md:mb-2"
                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #7EC8F2 50%, #4B9BDC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {t("members.title")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-blue-100/70 max-w-md text-xs sm:text-sm font-medium hidden sm:block"
              >
                {t("members.description")}
              </motion.p>
            </div>

            {/* Stats + Action Widget Stack */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-col gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[200px]"
            >
              {/* Stats Row */}
              <div className="flex flex-row sm:flex-row lg:flex-col gap-2 sm:gap-2.5 w-full">
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 hover:bg-white/10 group/stat flex-1" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/stat:scale-110 shadow-lg" style={{ background: 'linear-gradient(135deg, #4B9BDC, #3178B5)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Users size={14} className="text-white sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-xl md:text-2xl font-black text-white leading-none tracking-tight">{members.length}</p>
                    <p className="text-[7px] sm:text-[9px] font-bold text-blue-200/80 uppercase tracking-widest mt-0.5 group-hover/stat:text-blue-100 transition-colors">{t("members.title")}</p>
                  </div>
                </div>
              </div>

              {profile?.role !== "super_admin" && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddMember}
                  className="flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shrink-0 w-full mt-0.5 sm:mt-1"
                  style={{ background: 'linear-gradient(135deg, #ffffff, #e8f1fa)', color: '#3178B5', boxShadow: '0 12px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                >
                  <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>{t("members.addBtn")}</span>
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
            className="p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex items-center transition-all duration-300 w-full max-w-3xl"
            style={{
              background: searchFocused ? (isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.95)') : (isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.8)'),
              backdropFilter: 'blur(20px)',
              border: searchFocused ? (isDark ? '1.5px solid rgba(75,155,220,0.4)' : '1.5px solid rgba(75,155,220,0.4)') : (isDark ? '1.5px solid rgba(75,155,220,0.12)' : '1.5px solid rgba(0,0,0,0.06)'),
              boxShadow: searchFocused ? (isDark ? '0 8px 32px rgba(0,0,0,0.3), 0 0 0 4px rgba(75,155,220,0.08)' : '0 8px 32px rgba(75,155,220,0.15), 0 0 0 4px rgba(75,155,220,0.05)') : (isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.03)'),
            }}
          >
            <div className="pl-3 sm:pl-4 pr-1.5 sm:pr-2">
              <Search size={18} className={`transition-colors duration-200 sm:w-5 sm:h-5 ${searchFocused ? 'text-[#4B9BDC]' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder={t("members.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full py-2.5 sm:py-3 pr-3 sm:pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1.5 sm:p-2 mr-1.5 sm:mr-2 text-gray-500 dark:text-gray-400 hover:text-[#4B9BDC] rounded-lg sm:rounded-xl hover:bg-blue-50 transition-colors"
                title="Clear search"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* ═══════════════ MEMBER CARDS LIST ═══════════════ */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-[3px] border-blue-100 border-t-[#4B9BDC] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Users size={18} className="text-[#4B9BDC]" />
              </div>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 rounded-[2rem]"
            style={d.emptyState}
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={d.emptyIcon}>
              <Users className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("members.noMembers")}</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              {searchQuery ? t("members.noResults") : t("members.description")}
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="flex flex-col gap-2 sm:gap-3">
            <AnimatePresence>
              {filteredMembers.map((member, index) => {
                const colors = getMemberColors(member.full_name);
                const completion = calculateProfileCompletion(member);
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
                    key={member.id}
                    onClick={() => navigate(`/members/${member.id}`)}
                    whileHover={{ scale: 1.005, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)' }}
                    className={`group relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl flex items-center p-2.5 sm:p-3 md:p-4 gap-2.5 sm:gap-3 md:gap-4 cursor-pointer transition-all border border-transparent shadow-sm hover:shadow-lg ${member.id === id ? 'ring-2' : ''}`}
                    style={{
                      ...d.card,
                      borderColor: member.id === id ? colors.accent : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                      background: member.id === id ? (isDark ? `${colors.light}` : `${colors.bg}`) : undefined,
                      boxShadow: member.id === id ? `0 8px 32px ${colors.border}` : undefined,
                      '--tw-ring-color': colors.accent
                    } as React.CSSProperties}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5" style={{ background: `linear-gradient(to bottom, ${colors.gradient[0]}, ${colors.gradient[1]})` }}></div>

                    {/* Avatar */}
                    <div className="shrink-0 pl-1 sm:pl-1.5 md:pl-2">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.full_name}
                          className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl object-cover shadow-sm ring-2 ring-offset-2 ring-transparent group-hover:ring-blue-100/50 transition-all"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner text-white font-bold text-sm sm:text-base md:text-lg"
                          style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})` }}
                        >
                          {(member.full_name || "?").charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#3178B5] transition-colors">
                          {member.full_name || t('common.unknown')}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {profile?.role === 'super_admin' ? (
                          member.churches?.name && (
                            <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                              <Building size={10} className="shrink-0 opacity-70 sm:w-3 sm:h-3" />
                              <span className="truncate max-w-[200px]">{member.churches.name}</span>
                            </div>
                          )
                        ) : (
                          <>
                            {member.email && (
                              <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                                <Mail size={10} className="shrink-0 opacity-70 sm:w-3 sm:h-3" />
                                <span className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="hidden sm:flex items-center gap-1.5 truncate">
                                <Phone size={12} className="shrink-0 opacity-70" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Completion Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700/50">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: completion >= 80 ? '#10b981' : completion >= 50 ? '#f59e0b' : '#ef4444' }}></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{completion}%</span>
                    </div>

                    {/* Chevron */}
                    <div className="flex items-center pl-1.5 sm:pl-2 border-l border-gray-100 dark:border-gray-800 ml-2">
                      <div className="text-gray-400 dark:text-gray-500 group-hover:text-[#4B9BDC] transition-colors ml-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5"><path d="m9 18 6-6-6-6" /></svg>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

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
