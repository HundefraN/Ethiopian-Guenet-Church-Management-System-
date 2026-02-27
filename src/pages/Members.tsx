import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Heart,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Member } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import MemberDetailsModal from "../components/MemberDetailsModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { logActivity } from "../utils/activityLogger";

interface MemberWithDetails extends Member {
  departments: {
    name: string;
  } | null;
  churches: {
    name: string;
  } | null;
}

export default function Members() {
  const { profile } = useAuth();
  const navigate = useNavigate();
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

      if (profile?.role === "pastor" && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      } else if (profile?.role === "servant") {
        if (profile.department_id) {
          query = query.eq("department_id", profile.department_id);
        } else if (profile.church_id) {
          query = query.eq("church_id", profile.church_id);
        }
      }

      const { data, error } = await query.order("full_name");

      if (error) throw error;

      setMembers((data as any) || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
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
    setConfirmTitle("Delete Member");
    setConfirmMessage("Are you sure you want to delete this member? This action cannot be undone.");
    setConfirmType("danger");
    setConfirmAction(() => () => deleteMember(id));
    setConfirmOpen(true);
  };

  const deleteMember = async (id: string) => {
    const loadingToast = toast.loading("Deleting member...");
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
      toast.success("Member deleted successfully", { id: loadingToast });
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
        member.full_name.toLowerCase().includes(query) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.phone && member.phone.includes(query)) ||
        (member.departments?.name &&
          member.departments.name.toLowerCase().includes(query)) ||
        (member.churches?.name &&
          member.churches.name.toLowerCase().includes(query))
    );
  }, [members, searchQuery]);

  const canEdit = profile?.role === "pastor" || profile?.role === "servant";

  // color for member initials
  const getInitialColor = (name: string) => {
    const colors = [
      ['#06b6d4', '#0891b2'], // cyan
      ['#8b5cf6', '#7c3aed'], // violet
      ['#ec4899', '#db2777'], // pink
      ['#f59e0b', '#d97706'], // amber
      ['#10b981', '#059669'], // emerald
      ['#3b82f6', '#2563eb'], // blue
      ['#ef4444', '#dc2626'], // red
      ['#14b8a6', '#0d9488'], // teal
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* ═══════════════ ULTRA HERO HEADER ═══════════════ */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-lg" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2b1d 40%, #134e4a 70%, #14b8a6 100%)' }}>
        {/* Animated mesh orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25 blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #2dd4bf, transparent)' }}></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 blur-[60px]" style={{ background: 'radial-gradient(circle, #34d399, transparent)', animation: 'orbFloat2 10s ease-in-out infinite' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-10 blur-[100px]" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', animation: 'orbFloat3 12s ease-in-out infinite' }}></div>

        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.3), rgba(52,211,153,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Heart size={24} className="text-teal-200" />
              </div>
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#5eead4' }}>
                <Sparkles size={10} className="inline mr-1" /> Community
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #5eead4 50%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Members Directory
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-teal-200/60 max-w-lg text-sm md:text-base font-medium"
            >
              View and manage all church members, their contact details, and ministry engagements.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #059669)' }}>
                <Users size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{members.length}</p>
                <p className="text-[10px] font-bold text-teal-300/60 uppercase tracking-wider">Total Members</p>
              </div>
            </div>

            {profile?.role !== "super_admin" && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddMember}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffffff, #d1fae5)', color: '#059669', boxShadow: '0 8px 32px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.8)' }}
              >
                <Plus size={18} />
                <span>Add Member</span>
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
            border: searchFocused ? '1.5px solid rgba(20,184,166,0.3)' : '1.5px solid rgba(0,0,0,0.06)',
            boxShadow: searchFocused ? '0 8px 32px rgba(20,184,166,0.1), 0 0 0 4px rgba(20,184,166,0.05)' : '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div className="pl-4 pr-2">
            <Search size={20} className={`transition-colors duration-200 ${searchFocused ? 'text-teal-500' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search members by name, email, phone, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 mr-2 text-gray-400 hover:text-teal-500 rounded-xl hover:bg-teal-50 transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══════════════ MEMBER CARDS GRID ═══════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Users size={18} className="text-teal-400" />
            </div>
          </div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-[2rem]"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <Users className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No members found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            We couldn't find any members matching your search criteria.
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          <AnimatePresence>
            {filteredMembers.map((member, index) => {
              const [c1, c2] = getInitialColor(member.full_name);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.03, type: "spring", stiffness: 150 }}
                  key={member.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="group relative overflow-hidden rounded-[1.5rem] flex flex-col transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Top gradient bar */}
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}></div>

                  <div className="p-5 flex flex-col flex-1">
                    {/* Hover glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-8 -mt-8 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${c1}, transparent)` }}></div>

                    <div className="flex items-start justify-between mb-4 mt-1">
                      <div className="relative">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.full_name}
                            className="w-14 h-14 rounded-2xl object-cover shadow-sm"
                            style={{ border: `2px solid ${c1}33` }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform"
                            style={{ background: `linear-gradient(135deg, ${c1}15, ${c1}25)`, color: c1 }}
                          >
                            <span className="text-xl font-black uppercase">
                              {member.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <button
                          onClick={() => setViewingMember(member)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="p-2 text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(member.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-black leading-tight mb-1 text-gray-900 group-hover:text-teal-700 transition-colors">
                        {member.full_name}
                      </h3>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md mb-3 inline-block" style={{ background: `${c1}10`, color: c1 }}>
                        Member
                      </span>

                      <div className="space-y-2.5 mt-2">
                        {member.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
                              <Mail size={11} className="text-gray-400" />
                            </div>
                            <span className="truncate text-xs font-medium">{member.email}</span>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
                              <Phone size={11} className="text-gray-400" />
                            </div>
                            <span className="text-xs font-medium">{member.phone}</span>
                          </div>
                        )}
                        {!member.email && !member.phone && (
                          <div className="text-xs text-gray-400 italic pl-1 font-medium">No contact info</div>
                        )}
                      </div>

                      {/* Organization Info */}
                      <div className="rounded-xl p-3 mt-4 space-y-2" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid rgba(0,0,0,0.04)' }}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building size={13} className={member.churches ? "text-teal-500" : "text-gray-400"} />
                          {member.churches ? (
                            <span className="text-gray-700 truncate text-xs font-semibold">{member.churches.name}</span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No Branch</span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                          <Briefcase size={13} className={member.departments ? "text-emerald-500 mt-0.5" : "text-gray-400"} />
                          {member.departments ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' }}>
                              {member.departments.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs mt-0.5">No Department</span>
                          )}
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

      {/* Member Details Modal */}
      {viewingMember && (
        <MemberDetailsModal
          member={viewingMember}
          onClose={() => setViewingMember(null)}
        />
      )}

      {/* Confirmation Dialog */}
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
