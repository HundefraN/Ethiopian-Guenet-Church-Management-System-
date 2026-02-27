import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Loader2,
  Mail,
  Phone,
  Building,
  X,
  Edit2,
  Shield,
  ShieldOff,
  UserX,
  RefreshCw,
  Save,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Church, Profile } from "../types";
import toast from "react-hot-toast";
import { invokeSupabaseFunction } from "../utils/supabaseFunctions";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ChangeRoleModal from "../components/ChangeRoleModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import { springPresets, containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants } from "../utils/animations";

interface Pastor extends Profile {
  email?: string; // Email is not in Profile type but returned by join or we need to fetch it
  churches?: {
    name: string;
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

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">(
    "danger"
  );
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
        .select(
          `
          *,
          churches (
            name
          )
        `
        )
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
        {
          old: { is_blocked: !newStatus },
          new: { is_blocked: newStatus },
        }
      );

      toast.success(
        `Pastor ${newStatus ? "blocked" : "unblocked"} successfully`
      );
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
      // Update existing pastor
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

        // Resolve church names for logging
        const oldChurch = churches.find(c => c.id === editingPastor.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === formData.church_id)?.name || "No Branch Assigned";

        const logOld = { full_name: editingPastor.full_name, church: oldChurch };
        const logNew = { full_name: formData.full_name, church: newChurch };

        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity(
            "UPDATE",
            "PASTOR",
            details,
            editingPastor.id,
            diff
          );
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
      // Create new pastor
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error("Full name, email and password are required");
        return;
      }

      try {
        setSubmitting(true);

        const { data: responseData } = await invokeSupabaseFunction(
          "create-user",
          {
            body: {
              email: formData.email,
              password: formData.password,
              full_name: formData.full_name,
              role: "pastor",
              church_id: formData.church_id || null,
            },
          }
        );

        if (responseData?.error) {
          throw new Error(responseData.error);
        }

        const churchName = churches.find(c => c.id === formData.church_id)?.name || "No Branch Assigned";

        await logActivity(
          "CREATE",
          "PASTOR",
          `Registered new pastor ${formData.full_name}`,
          responseData?.user?.id || null,
          {
            email: formData.email,
            full_name: formData.full_name,
            church: churchName,
          }
        );

        toast.success("Pastor registered successfully");
        setFormData({
          full_name: "",
          email: "",
          password: "",
          church_id: "",
        });
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
      email: "", // Cannot edit email easily
      password: "", // Cannot edit password easily
      church_id: pastor.church_id || "",
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingPastor(null);
    setFormData({
      full_name: "",
      email: "",
      password: "",
      church_id: "",
    });
    setIsModalOpen(true);
  };

  const filteredPastors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pastors;
    return pastors.filter(
      (pastor) =>
        (pastor.full_name &&
          pastor.full_name.toLowerCase().includes(query)) ||
        (pastor.email &&
          pastor.email.toLowerCase().includes(query)) ||
        (pastor.churches?.name &&
          pastor.churches.name.toLowerCase().includes(query))
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
              Pastors Directory
            </h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Manage church pastors, leadership assignments, and account access globally.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-white text-[#4B9BDC] px-6 py-3 rounded-xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold shrink-0"
          >
            <Plus size={20} />
            <span>Register Pastor</span>
          </button>
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-8 flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all max-w-3xl">
        <div className="pl-4 pr-2 text-gray-400">
          <Search size={22} className="text-[#4B9BDC]" />
        </div>
        <input
          type="text"
          placeholder="Search pastors by name or assigned church..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-2 mr-2 text-gray-400 hover:text-[#4B9BDC] rounded-full hover:bg-gray-100 transition-colors"
            title="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#4B9BDC]" size={40} />
        </div>
      ) : filteredPastors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No pastors found
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            We couldn't find any pastors matching your search. Try adjusting your query or register a new pastor.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredPastors.map((pastor) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={pastor.id}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-200 transition-all duration-150 group relative overflow-hidden flex flex-col"
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 ${pastor.is_blocked ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`}></div>

                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="relative">
                    {pastor.avatar_url ? (
                      <img
                        src={pastor.avatar_url}
                        alt={pastor.full_name || "Pastor"}
                        className={`w-16 h-16 rounded-2xl object-cover border-2 shadow-sm transition-all duration-300 ${pastor.is_blocked ? "border-red-300 grayscale-[0.8] opacity-60 scale-95" : "border-indigo-100"}`}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${pastor.is_blocked ? "bg-red-50 text-red-300 grayscale scale-95" : "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"}`}
                      >
                        <User size={32} />
                      </div>
                    )}
                    {pastor.is_blocked ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 uppercase tracking-tighter ring-2 ring-white"
                      >
                        Blocked
                      </motion.div>
                    ) : (
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-sm" title="Active Account">
                        <Shield size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150 z-10 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <button
                      onClick={() => handleBlockToggleClick(pastor)}
                      className={`nav-button p-2 rounded-lg transition-colors ${pastor.is_blocked
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-red-500 hover:bg-red-50"
                        }`}
                      title={
                        pastor.is_blocked ? "Unblock Pastor" : "Block Pastor"
                      }
                    >
                      {pastor.is_blocked ? (
                        <Shield size={16} />
                      ) : (
                        <ShieldOff size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setChangeRoleUser(pastor)}
                      className="nav-button p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Change Role"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(pastor)}
                      className="nav-button p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Pastor"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className={`text-xl font-bold leading-tight mb-1 ${pastor.is_blocked ? "text-gray-500" : "text-gray-900 group-hover:text-indigo-700 transition-colors"}`}>
                    {pastor.full_name}
                  </h3>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-4 inline-block">
                    Pastor
                  </span>

                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-2 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building size={16} className={pastor.churches ? "text-indigo-500" : "text-gray-400"} />
                      {pastor.churches ? (
                        <span className="text-gray-700 truncate">{pastor.churches.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">No Branch Assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-[#4B9BDC]"></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingPastor ? "Edit Pastor" : "Register Pastor"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage leadership profile</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="e.g. Pastor Yohannes"
                    />
                  </div>
                </div>

                {!editingPastor && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                          <Mail size={20} />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                          placeholder="pastor@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                        Temporary Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                          <Shield size={20} />
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Assign Branch (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                      <Building size={20} />
                    </div>
                    <select
                      value={formData.church_id}
                      onChange={(e) =>
                        setFormData({ ...formData, church_id: e.target.value })
                      }
                      className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-900 appearance-none"
                    >
                      <option value="" className="text-gray-400">No Branch Assigned</option>
                      {churches.map((church) => (
                        <option key={church.id} value={church.id}>
                          {church.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-[#4B9BDC] text-white font-bold rounded-xl hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    {submitting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        {editingPastor ? <Save size={20} /> : <Plus size={20} />}
                        <span>{editingPastor ? "Update" : "Register"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Role Modal */}
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

