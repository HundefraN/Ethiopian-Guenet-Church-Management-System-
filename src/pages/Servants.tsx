import React, { useEffect, useState, useMemo } from "react";
import {
  User,
  Search,
  Plus,
  Loader2,
  Mail,
  Phone,
  Building,
  Shield,
  X,
  Edit2,
  Trash2,
  Save,
  ShieldOff,
  RefreshCw,
  Users,
  ExternalLink,
  Map,
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

interface Servant extends Profile {
  email?: string;
  churches?: {
    name: string;
    map_link?: string | null;
  } | null;
  // departments is now an array of objects from the junction table
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

  // Reset form when modal opens/closes or editing changes
  useEffect(() => {
    if (editingServant) {
      const deptIds =
        (editingServant.profile_departments
          ?.map((pd) => pd.departments?.id)
          .filter(Boolean) as string[]) || [];
      setFormData({
        full_name: editingServant.full_name,
        email: editingServant.email || "",
        password: "", // Password not populated for security
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
      // Try fetching with new structure (multiple departments)
      let query = supabase
        .from("profiles")
        .select(
          `
          *,
          churches (
            name,
            map_link
          ),
          profile_departments (
            departments (
              id,
              name
            )
          )
        `
        )
        .eq("role", "servant")
        .order("created_at", { ascending: false });

      if (profile?.role === "pastor" && profile.church_id) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query;

      if (error) {
        // If error is related to missing relation, fallback to old query
        if (error.code === "PGRST200") {
          // Relation not found or similar
          console.warn("New schema not found, falling back to legacy query");
          await fetchServantsLegacy();
          return;
        }
        throw error;
      }

      setServants((data as any) || []);
    } catch (error) {
      console.error("Error fetching servants (new schema):", error);
      // Fallback to legacy query if new query fails completely
      await fetchServantsLegacy();
    }
  };

  const fetchServantsLegacy = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select(
          `
          *,
          churches (
            name,
            map_link
          ),
          departments (
            name
          )
        `
        )
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

  const handleChurchChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
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
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: newStatus })
        .eq("id", servant.id);

      if (error) throw error;

      await logActivity(
        newStatus ? "BLOCK" : "UNBLOCK",
        "SERVANT",
        `${newStatus ? "Blocked" : "Unblocked"} servant ${servant.full_name}`,
        servant.id,
        {
          old: { is_blocked: servant.is_blocked },
          new: { is_blocked: newStatus },
        }
      );

      toast.success(
        `Servant ${newStatus ? "blocked" : "unblocked"} successfully`
      );
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
        // Update existing servant
        if (!formData.full_name) {
          toast.error("Full name is required");
          return;
        }

        const updates: any = {
          full_name: formData.full_name,
          // department_id is legacy, we can set it to null or the first one if we want backward compat,
          // but let's just keep it null or unchanged. I'll set it to null to encourage migration.
          department_id: null,
        };

        if (profile?.role === "super_admin") {
          updates.church_id = formData.church_id;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", editingServant.id);

        if (error) throw error;

        servantId = editingServant.id;

        // Resolve names for logging
        const oldChurch = churches.find(c => c.id === editingServant.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === (profile?.role === "super_admin" ? formData.church_id : editingServant.church_id))?.name || oldChurch;

        const oldDepts = editingServant.profile_departments?.map(pd => pd.departments?.name).filter(Boolean).join(", ") || "None";
        const newDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).join(", ") || "None";

        const logOld = {
          full_name: editingServant.full_name,
          church: oldChurch,
          departments: oldDepts
        };

        const logNew = {
          full_name: formData.full_name,
          church: newChurch,
          departments: newDepts
        };

        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity(
            "UPDATE",
            "SERVANT",
            `Updated servant ${formData.full_name}`,
            editingServant.id,
            diff
          );
        }
        toast.success("Servant updated successfully");
      } else {
        // Create new servant
        if (
          !formData.full_name ||
          !formData.email ||
          !formData.password ||
          !formData.church_id
        ) {
          toast.error("Full name, email, password and church are required");
          return;
        }

        const { data: responseData } = await invokeSupabaseFunction(
          "create-user",
          {
            body: {
              email: formData.email,
              password: formData.password,
              full_name: formData.full_name,
              role: "servant",
              church_id: formData.church_id,
              department_id: null, // Don't assign single department
            },
          }
        );

        if (responseData?.error) {
          throw new Error(responseData.error);
        }

        servantId = responseData.user.id;

        const churchName = churches.find(c => c.id === formData.church_id)?.name || "Unknown";
        const selectedDepts = departments.filter(d => formData.department_ids.includes(d.id)).map(d => d.name).join(", ") || "None";

        await logActivity(
          "CREATE",
          "SERVANT",
          `Registered new servant ${formData.full_name}`,
          servantId,
          {
            email: formData.email,
            full_name: formData.full_name,
            church: churchName,
            departments: selectedDepts
          }
        );

        toast.success("Servant registered successfully");
      }

      // Handle Department Assignments
      if (servantId) {
        // 1. Delete existing assignments
        const { error: deleteError } = await supabase
          .from("profile_departments")
          .delete()
          .eq("profile_id", servantId);

        if (deleteError) throw deleteError;

        // 2. Insert new assignments
        if (formData.department_ids.length > 0) {
          const assignments = formData.department_ids.map((deptId) => ({
            profile_id: servantId,
            department_id: deptId,
          }));

          const { error: insertError } = await supabase
            .from("profile_departments")
            .insert(assignments);

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
    if (
      !window.confirm(
        "Are you sure you want to delete this servant? This action cannot be undone."
      )
    )
      return;

    try {
      // Find the servant to get their name for logging
      const servantToDelete = servants.find((s) => s.id === id);
      // Since we don't have delete-user function exposed, we'll delete the profile.
      // Ideally this should trigger user deletion or be handled by an admin function.
      const { error } = await supabase.from("profiles").delete().eq("id", id);

      if (error) throw error;

      await logActivity(
        "DELETE",
        "SERVANT",
        `Deleted servant ${servantToDelete?.full_name || "Unknown"}`,
        id,
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
        servant.profile_departments
          ?.map((pd) => pd.departments?.name?.toLowerCase())
          .filter(Boolean)
          .join(" ") || "";

      return (
        (servant.full_name && servant.full_name.toLowerCase().includes(query)) ||
        (servant.email && servant.email.toLowerCase().includes(query)) ||
        (servant.churches?.name &&
          servant.churches.name.toLowerCase().includes(query)) ||
        deptNames.includes(query)
      );
    });
  }, [servants, searchQuery]);

  const hasChanges = useMemo(() => {
    if (!editingServant) {
      return !!(formData.full_name || formData.email || formData.password || formData.church_id || formData.department_ids.length > 0);
    }

    const currentDeptIds = (editingServant.profile_departments
      ?.map((pd) => pd.departments?.id)
      .filter(Boolean) as string[]) || [];

    const deptsChanged =
      formData.department_ids.length !== currentDeptIds.length ||
      !formData.department_ids.every(id => currentDeptIds.includes(id));

    return (
      formData.full_name !== (editingServant.full_name || "") ||
      formData.church_id !== (editingServant.church_id || "") ||
      deptsChanged
    );
  }, [formData, editingServant]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] p-8 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              Servants Directory
            </h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Manage church servants, department assignments, and access levels.
            </p>
          </div>
          {profile?.role !== "super_admin" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-[#4B9BDC] px-6 py-3 rounded-xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold shrink-0"
            >
              <Plus size={20} />
              <span>Register Servant</span>
            </button>
          )}
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-8 flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all max-w-3xl">
        <div className="pl-4 pr-2 text-gray-400">
          <Search size={22} className="text-[#4B9BDC]" />
        </div>
        <input
          type="text"
          placeholder="Search servants by name, assigned church, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-2 mr-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-gray-100 transition-colors"
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
      ) : filteredServants.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No servants found
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            We couldn't find any servants matching your search. Try adjusting your query or register a new servant.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredServants.map((servant) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={servant.id}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-orange-200 transition-all duration-150 group relative overflow-hidden flex flex-col"
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 ${servant.is_blocked ? 'bg-red-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`}></div>

                <div className="flex items-start justify-between mb-4 mt-2">
                  <div className="relative">
                    {servant.avatar_url ? (
                      <img
                        src={servant.avatar_url}
                        alt={servant.full_name || "Servant"}
                        className={`w-16 h-16 rounded-2xl object-cover border-2 shadow-sm transition-all duration-300 ${servant.is_blocked ? "border-red-300 grayscale-[0.8] opacity-60 scale-95" : "border-orange-100"}`}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${servant.is_blocked ? "bg-red-50 text-red-300 grayscale scale-95" : "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"}`}
                      >
                        <User size={32} />
                      </div>
                    )}
                    {servant.is_blocked ? (
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
                      onClick={() => handleBlockToggleClick(servant)}
                      className={`nav-button p-2 rounded-lg transition-colors ${servant.is_blocked
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-red-500 hover:bg-red-50"
                        }`}
                      title={
                        servant.is_blocked ? "Unblock Servant" : "Block Servant"
                      }
                    >
                      {servant.is_blocked ? (
                        <Shield size={16} />
                      ) : (
                        <ShieldOff size={16} />
                      )}
                    </button>
                    {profile?.role === "super_admin" && (
                      <button
                        onClick={() => setChangeRoleUser(servant)}
                        className="nav-button p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Change Role"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    {profile?.role !== "super_admin" && (
                      <button
                        onClick={() => handleEdit(servant)}
                        className="nav-button p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Servant"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className={`text-xl font-bold leading-tight mb-1 ${servant.is_blocked ? "text-gray-500" : "text-gray-900 group-hover:text-orange-600 transition-colors"}`}>
                    {servant.full_name}
                  </h3>
                  <span className="bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-4 inline-block">
                    Servant
                  </span>

                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <Building size={16} className={servant.churches ? "text-orange-500" : "text-gray-400"} />
                        {servant.churches ? (
                          <span className="text-gray-700 truncate">{servant.churches.name}</span>
                        ) : (
                          <span className="text-gray-400 italic">No Branch Assigned</span>
                        )}
                      </div>
                      {servant.churches?.map_link && (
                        <a
                          href={servant.churches.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
                          title="View on Map"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Map size={14} />
                        </a>
                      )}
                    </div>
                    {servant.profile_departments && servant.profile_departments.length > 0 && (
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                        <Shield size={16} className="text-purple-500 mt-0.5" />
                        <div className="flex flex-wrap gap-1 border-gray-200">
                          {servant.profile_departments.map((pd) => (
                            <span key={pd.departments?.id} className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                              {pd.departments?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Add/Edit Servant Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/10 backdrop-blur-2xl flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-[#1A365D]"></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingServant ? "Edit Servant" : "Register Servant"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage servant profile</p>
                </div>
                <button
                  onClick={handleCloseModal}
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
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="e.g. Abebe Kebede"
                    />
                  </div>
                </div>

                {!editingServant && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                          <Mail size={20} />
                        </div>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                          placeholder="servant@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                        Temporary Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                          <Shield size={20} />
                        </div>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                          placeholder="Min. 6 characters"
                        />
                      </div>
                    </div>
                  </>
                )}

                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                      Assign Branch
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400">
                        <Building size={20} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={handleChurchChange}
                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 appearance-none"
                      >
                        <option value="" disabled className="text-gray-400">Select a church layout...</option>
                        {churches.map((church) => (
                          <option key={church.id} value={church.id}>
                            {church.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 flex justify-between">
                    <span>Assign Departments</span>
                    {formData.department_ids.length > 0 && (
                      <span className="text-orange-600 text-[10px] font-black uppercase tracking-wider bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                        {formData.department_ids.length} Selected
                      </span>
                    )}
                  </label>
                  <div className="border border-gray-200 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                    {departments.length === 0 ? (
                      <p className="text-sm font-medium text-gray-500 italic text-center py-4">
                        No departments available. Select a church first.
                      </p>
                    ) : (
                      departments.map((dept) => (
                        <div key={dept.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors border-2 border-transparent focus-within:border-orange-200">
                          <input
                            type="checkbox"
                            id={`dept-${dept.id}`}
                            checked={formData.department_ids.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  department_ids: [
                                    ...prev.department_ids,
                                    dept.id,
                                  ],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  department_ids: prev.department_ids.filter(
                                    (id) => id !== dept.id
                                  ),
                                }));
                              }
                            }}
                            className="rounded-md border-gray-300 text-orange-500 focus:ring-orange-500 w-5 h-5 shadow-sm"
                          />
                          <label
                            htmlFor={`dept-${dept.id}`}
                            className="text-sm font-bold text-gray-700 cursor-pointer select-none flex-1"
                          >
                            {dept.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-[#1A365D] text-white font-bold rounded-xl hover:shadow-[0_8px_20px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {editingServant ? <Save size={20} /> : <Plus size={20} />}
                        <span>
                          {editingServant ? "Save Changes" : "Register Servant"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
