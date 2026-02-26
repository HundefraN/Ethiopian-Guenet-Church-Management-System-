import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  Users, Plus, Phone, Calendar, Trash2, Search, Eye,
  ArrowUpRight, UserPlus, Mail, Filter, ChevronDown, Sparkles, BarChart3
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { logActivity } from "../utils/activityLogger";
import { springPresets, containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants, interactivePresets } from "../utils/animations";

// Animated counter using high-performance springs
function AnimatedNumber({ value }: { value: number }) {
  const springValue = useSpring(0, { stiffness: 60, damping: 20 });
  const displayValue = useTransform(springValue, (current) => Math.floor(current));

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span>{displayValue}</motion.span>;
}

export default function ServantDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (profile?.department_id) { fetchMembers(); }
    else { setLoading(false); }
  }, [profile?.department_id]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("department_id", profile?.department_id)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load members"); }
    else if (data) { setMembers(data); }
    setLoading(false);
  };

  const deleteMember = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    const memberToDelete = members.find((m) => m.id === id);
    const loadingToast = toast.loading("Deleting member...");
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (!error) {
      await logActivity(
        "DELETE",
        "MEMBER",
        `Deleted member ${memberToDelete?.full_name || "Unknown"} from department`,
        id,
        memberToDelete ? { full_name: memberToDelete.full_name, phone: memberToDelete.phone } : null
      );
      fetchMembers();
      toast.success("Member deleted successfully", { id: loadingToast });
    }
    else { toast.error(error.message, { id: loadingToast }); }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !searchQuery || m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone?.includes(searchQuery) || m.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [members, searchQuery, statusFilter]);

  // Compute stats from data
  const activeCount = members.filter(m => m.status === "Active").length;
  const recentCount = members.filter(m => {
    const created = new Date(m.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created >= thirtyDaysAgo;
  }).length;

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-7 max-w-7xl mx-auto pb-10">

      {/* ═══════════ Hero Banner ═══════════ */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>

        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-emerald-300/15 to-transparent rounded-full blur-3xl -mt-16 -mr-16" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-full">
                <Sparkles size={12} className="text-emerald-200" />
                <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Ministry Dashboard</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Your Department
            </h1>
            <p className="text-emerald-200/70 font-medium max-w-lg text-sm">
              Manage members in your ministry. Register, search, and track department members.
            </p>
          </div>
          <button
            onClick={() => navigate("/members/add")}
            className="flex items-center gap-3 px-6 py-3.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-2xl hover:bg-white/25 active:scale-95 font-bold transition-all shadow-lg shrink-0"
          >
            <UserPlus size={20} />
            Register Member
          </button>
        </div>
      </motion.div>

      {/* ═══════════ Stats Row ═══════════ */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: members.length, icon: Users, gradient: "from-emerald-500 to-teal-500" },
          { label: "Active", value: activeCount, icon: BarChart3, gradient: "from-blue-500 to-cyan-500" },
          { label: "New (30d)", value: recentCount, icon: ArrowUpRight, gradient: "from-violet-500 to-purple-500" },
          { label: "Filtered", value: filteredMembers.length, icon: Filter, gradient: "from-amber-500 to-orange-500" },
        ].map((card, i) => (
          <motion.div key={i} variants={itemVariants}
            className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-0.5 transition-all">
            <div className="absolute -top-4 -right-4 opacity-[0.04]"><card.icon size={70} /></div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-3 shadow-md`}>
              <card.icon size={18} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tabular-nums"><AnimatedNumber value={card.value} /></h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ Search & Filter ═══════════ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#4B9BDC] focus:ring-4 focus:ring-[#4B9BDC]/10 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#4B9BDC] focus:ring-4 focus:ring-[#4B9BDC]/10 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Transfer">Transfer</option>
            <option value="Death">Deceased</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* ═══════════ Members List ═══════════ */}
      <motion.div variants={itemVariants} className="bg-white rounded-[1.5rem] border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 md:px-8 py-5 border-b border-gray-100/60 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Department Members</h2>
              <p className="text-xs text-gray-400 font-medium">
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} {searchQuery || statusFilter !== "all" ? '(filtered)' : ''}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-sm">Loading members...</p>
          </div>
        ) : !profile?.department_id ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-red-400" size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Not Assigned</h3>
            <p className="text-gray-400 text-sm">You are not currently assigned to a department.</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-300" size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {searchQuery || statusFilter !== "all" ? "No matching members" : "No members yet"}
            </h3>
            <p className="text-gray-400 text-sm">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters." : "Register new members to get started."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {filteredMembers.map((member) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-4 px-6 md:px-8 py-4 hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {member.photo ? (
                      <img src={member.photo} alt={member.full_name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-sm font-black text-emerald-600 ring-2 ring-white shadow-sm">
                        {member.full_name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900 truncate">{member.full_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                        member.status === 'Transfer' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                        {member.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {member.phone}
                        </span>
                      )}
                      {member.email && (
                        <span className="flex items-center gap-1 hidden sm:flex">
                          <Mail size={11} /> {member.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {format(new Date(member.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigate(`/members/edit/${member.id}`)}
                      className="p-2.5 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" title="Edit">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => deleteMember(member.id)}
                      className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
