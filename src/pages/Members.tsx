import React, { useEffect, useState } from "react";
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
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { springPresets, containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants } from "../utils/animations";
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
  const [viewingMember, setViewingMember] = useState<MemberWithDetails | null>(
    null
  );

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">(
    "danger"
  );

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
            name
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

      // Apply ordering after filtering
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
    setConfirmMessage(
      "Are you sure you want to delete this member? This action cannot be undone."
    );
    setConfirmType("danger");
    setConfirmAction(() => () => deleteMember(id));
    setConfirmOpen(true);
  };

  const deleteMember = async (id: string) => {
    const loadingToast = toast.loading("Deleting member...");
    // Find the member to get their name for logging
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

  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email &&
        member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (member.phone && member.phone.includes(searchQuery)) ||
      (member.departments?.name && member.departments.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canEdit = profile?.role === "pastor" || profile?.role === "servant";
  // Super Admin cannot edit members. Servants can edit if in their department (RLS handles this), Pastors can edit all in their church.

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] p-8 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              Members Directory
            </h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Manage and view all church members, contact details, and engagements.
            </p>
          </div>
          {profile?.role !== "super_admin" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddMember}
              className="flex items-center justify-center gap-2 bg-white text-[#4B9BDC] px-6 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold shrink-0"
            >
              <Plus size={20} />
              <span>Add Member</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-8 flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all max-w-3xl">
        <div className="pl-4 pr-2 text-gray-400">
          <Search size={22} className="text-[#4B9BDC]" />
        </div>
        <input
          type="text"
          placeholder="Search members by name, email, phone, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
        />
        <button className="flex items-center justify-center gap-2 px-4 py-2 mr-1 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors font-medium text-sm hidden md:flex">
          <Filter size={16} className="text-[#4B9BDC]" />
          <span>Filter</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#4B9BDC]" size={40} />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No members found
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            We couldn't find any members matching your search criteria. You can add a new member to the directory.
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredMembers.map((member, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={member.id}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-teal-200 transition-all duration-300 group relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 to-emerald-400"></div>

                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="relative">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.full_name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 shadow-sm border-teal-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                        <span className="text-2xl font-bold uppercase">
                          {member.full_name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <button
                      onClick={() => setViewingMember(member)}
                      className="nav-button p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEditMember(member)}
                          className="nav-button p-2 text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member.id)}
                          className="nav-button p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold leading-tight mb-1 text-gray-900 group-hover:text-teal-700 transition-colors">
                    {member.full_name}
                  </h3>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-4 inline-block">
                    Member
                  </span>

                  <div className="space-y-3 mt-1">
                    {/* Contact Info */}
                    <div className="space-y-2">
                      {member.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                            <Mail size={12} />
                          </div>
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                            <Phone size={12} />
                          </div>
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {!member.email && !member.phone && (
                        <div className="text-sm text-gray-400 italic pl-1">No contact info</div>
                      )}
                    </div>

                    {/* Organization Info */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Building size={14} className={member.churches ? "text-teal-500" : "text-gray-400"} />
                        {member.churches ? (
                          <span className="text-gray-700 truncate">{member.churches.name}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No Branch</span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                        <Briefcase size={14} className={member.departments ? "text-emerald-500 mt-0.5" : "text-gray-400"} />
                        {member.departments ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-200/50">
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
            ))}
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

