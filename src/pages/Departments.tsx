import React, { useEffect, useState, useMemo } from "react";
import {
  Shield,
  Search,
  Plus,
  Users,
  Calendar,
  Loader2,
  X,
  Edit2,
  Trash2,
  Save,
  Building,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Department, Church } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import ConfirmDialog from "../components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

interface DepartmentWithDetails extends Department {
  churches: {
    name: string;
  } | null;
  members: { count: number }[];
  profile_departments: { count: number }[];
}

export default function Departments() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithDetails[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithDetails | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "", church_id: "" });
  const [submitting, setSubmitting] = useState(false);

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
      fetchDepartments();
      if (profile.role === "super_admin") {
        fetchChurches();
      }
    }
  }, [profile]);

  // Reset form when modal opens/closes or editing changes
  useEffect(() => {
    if (editingDept) {
      setFormData({
        name: editingDept.name,
        church_id: editingDept.church_id || "",
      });
    } else {
      setFormData({
        name: "",
        church_id:
          profile?.role === "super_admin" ? "" : profile?.church_id || "",
      });
    }
  }, [editingDept, profile, isModalOpen]);

  const fetchChurches = async () => {
    const { data } = await supabase.from("churches").select("*").order("name");
    if (data) setChurches(data);
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      // Try fetching with new structure
      let query = supabase.from("departments").select(`
          *,
          churches (
            name
          ),
          members:members(count),
          profile_departments(count)
        `);

      if (
        (profile?.role === "pastor" || profile?.role === "servant") &&
        profile.church_id
      ) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query.order("name");

      if (error) {
        if (error.code === "PGRST200") {
          console.warn("New schema not found, falling back to legacy query");
          await fetchDepartmentsLegacy();
          return;
        }
        throw error;
      }

      setDepartments((data as any) || []);
    } catch (error) {
      console.error("Error fetching departments (new schema):", error);
      await fetchDepartmentsLegacy();
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsLegacy = async () => {
    try {
      let query = supabase.from("departments").select(`
          *,
          churches (
            name
          ),
          members:members(count)
        `);

      if (
        (profile?.role === "pastor" || profile?.role === "servant") &&
        profile.church_id
      ) {
        query = query.eq("church_id", profile.church_id);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;

      setDepartments((data as any) || []);
    } catch (error) {
      console.error("Error fetching departments (legacy):", error);
      toast.error("Failed to load departments");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }
    if (!formData.church_id) {
      toast.error("Church is required");
      return;
    }

    try {
      setSubmitting(true);

      if (editingDept) {
        // Update existing department
        const { error } = await supabase
          .from("departments")
          .update({ name: formData.name, church_id: formData.church_id })
          .eq("id", editingDept.id);

        if (error) throw error;

        // Find church names for logging
        const oldChurch = churches.find(c => c.id === editingDept.church_id)?.name || "Unknown";
        const newChurch = churches.find(c => c.id === formData.church_id)?.name || "Unknown";

        const logOld = { name: editingDept.name, church: oldChurch };
        const logNew = { name: formData.name, church: newChurch };

        const diff = getObjectDiff(logOld, logNew);

        if (diff) {
          await logActivity(
            "UPDATE",
            "DEPARTMENT",
            `Updated department ${formData.name}`,
            editingDept.id,
            diff
          );
        }
        toast.success("Department updated successfully");
      } else {
        // Create new department
        const { data, error } = await supabase
          .from("departments")
          .insert([formData])
          .select()
          .single();

        if (error) throw error;

        const churchName = churches.find(c => c.id === formData.church_id)?.name || "Unknown";

        await logActivity(
          "CREATE",
          "DEPARTMENT",
          `Added new department ${formData.name}`,
          data.id,
          { ...formData, church: churchName }
        );
        toast.success("Department added successfully");
      }

      setEditingDept(null);
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast.error(error.message || "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept: DepartmentWithDetails) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmTitle("Delete Department");
    setConfirmMessage(
      "Are you sure you want to delete this department? This action cannot be undone."
    );
    setConfirmType("danger");
    setConfirmAction(() => () => deleteDepartment(id));
    setConfirmOpen(true);
  };

  const deleteDepartment = async (id: string) => {
    try {
      // Find the department to get its name for logging
      const deptToDelete = departments.find((d) => d.id === id);
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);
      if (error) throw error;

      await logActivity(
        "DELETE",
        "DEPARTMENT",
        `Deleted department "${deptToDelete?.name || "Unknown"}" from ${deptToDelete?.churches?.name || "Unknown church"}`,
        id,
        deptToDelete ? { name: deptToDelete.name, church: deptToDelete.churches?.name } : null
      );
      toast.success("Department deleted successfully");
      fetchDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast.error(error.message || "Failed to delete department");
    }
    setConfirmOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
  };

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(query) ||
        (dept.churches?.name &&
          dept.churches.name.toLowerCase().includes(query))
    );
  }, [departments, searchQuery]);

  const hasChanges = useMemo(() => {
    if (!editingDept) {
      return !!(formData.name && formData.church_id);
    }
    return (
      formData.name !== (editingDept.name || "") ||
      formData.church_id !== (editingDept.church_id || "")
    );
  }, [formData, editingDept]);

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
              Departments Directory
            </h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Manage church departments, ministries, and view detailed statistics.
            </p>
          </div>
          {profile?.role !== "super_admin" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-[#4B9BDC] px-6 py-3 rounded-xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold shrink-0"
            >
              <Plus size={20} />
              <span>Add Department</span>
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
          placeholder="Search ministries and departments by name or church branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-2 mr-2 text-gray-400 hover:text-purple-500 rounded-full hover:bg-gray-100 transition-colors"
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
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No departments found
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            We couldn't find any departments matching your search. Try adjusting your query.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredDepartments.map((dept) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={dept.id}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-purple-200 transition-all duration-150 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-50/50 blur-3xl -mr-10 -mt-10 transition-all duration-200 group-hover:bg-purple-100/60 z-0"></div>

                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="w-14 h-14 bg-purple-50/80 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-150 shadow-sm">
                    <Shield size={28} />
                  </div>
                  {profile?.role !== "super_admin" && profile?.role === "pastor" && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="p-2.5 text-blue-400 hover:text-white hover:bg-blue-500 rounded-xl transition-colors shadow-sm bg-white border border-gray-100"
                        title="Edit Department"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dept.id)}
                        className="p-2.5 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors shadow-sm bg-white border border-gray-100"
                        title="Delete Department"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors leading-tight">
                    {dept.name}
                  </h3>

                  {dept.churches && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-6">
                      <Building size={14} className="text-gray-400" />
                      <p className="truncate">{dept.churches.name}</p>
                    </div>
                  )}

                  <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                          <Users size={12} />
                        </div>
                      </div>
                      <span className="text-xl font-black text-gray-900 ml-1">
                        {(dept.profile_departments?.[0]?.count || 0) + (dept.members?.[0]?.count || 0)}
                      </span>
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-600">Weekly</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add/Edit Department Modal */}
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-[#1A365D]"></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingDept ? "Edit Ministry" : "Add Ministry"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage department profiles</p>
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
                    Department Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                      <Shield size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                      placeholder="e.g. Worship Team"
                    />
                  </div>
                </div>

                {profile?.role === "super_admin" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                      Assign to Branch
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                        <Building size={20} />
                      </div>
                      <select
                        required
                        value={formData.church_id}
                        onChange={(e) =>
                          setFormData({ ...formData, church_id: e.target.value })
                        }
                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-900 appearance-none"
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
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-[#1A365D] text-white font-bold rounded-xl hover:shadow-[0_8px_20px_rgba(147,51,234,0.3)] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {editingDept ? <Save size={20} /> : <Plus size={20} />}
                        <span>
                          {editingDept ? "Save Changes" : "Create Department"}
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

