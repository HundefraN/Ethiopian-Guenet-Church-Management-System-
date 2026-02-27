import React, { useState, useEffect } from "react";
import { X, Building, User, Users, Check, ArrowRight } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Profile, Church, Department } from "../types";
import toast from "react-hot-toast";
import { logActivity } from "../utils/activityLogger";

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile | null;
  onSuccess: () => void;
}

export default function ChangeRoleModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ChangeRoleModalProps) {
  const [role, setRole] = useState<"pastor" | "servant">("servant");
  const [churchId, setChurchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [churches, setChurches] = useState<Church[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // If the user's current role is super_admin, we default to pastor for the change
      const initialRole =
        user.role === "super_admin" ? "pastor" : (user.role as any);
      setRole(initialRole);
      setChurchId(user.church_id || "");
      setDepartmentId(user.department_id || "");
      fetchChurches();
      if (user.church_id) {
        fetchDepartments(user.church_id);
      }
    }
  }, [isOpen, user]);

  const fetchChurches = async () => {
    const { data } = await supabase.from("churches").select("*").order("name");
    if (data) setChurches(data);
  };

  const fetchDepartments = async (cId: string) => {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .eq("church_id", cId)
      .order("name");
    if (data) setDepartments(data);
  };

  const handleChurchChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newChurchId = e.target.value;
    setChurchId(newChurchId);
    setDepartmentId("");
    if (newChurchId) {
      await fetchDepartments(newChurchId);
    } else {
      setDepartments([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (role === "servant" && !churchId) {
      toast.error("Church is required for Servants");
      return;
    }

    try {
      setSubmitting(true);

      const updates: any = {
        role,
        church_id: churchId || null,
        department_id: role === "servant" ? departmentId || null : null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      await logActivity(
        "ROLE_CHANGE",
        "USER",
        `Changed role of ${user.full_name} from ${user.role} to ${role}`,
        user.id,
        {
          old: {
            role: user.role,
            church_id: user.church_id,
            department_id: user.department_id,
          },
          new: updates,
        }
      );

      toast.success(`User role updated to ${role}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasChanges = user ? (
    role !== user.role ||
    churchId !== (user.church_id || "") ||
    departmentId !== (user.department_id || "")
  ) : false;

  return (
    <div className="fixed inset-0 bg-white/5 dark:bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-2xl transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-md shadow-2xl border border-white/50 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-gray-100/50 dark:border-gray-800/50 flex justify-between items-center bg-gradient-to-r from-gray-50/80 dark:from-gray-950/80 to-white dark:to-gray-900">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Change User Role
            </h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              Update permissions and access levels
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">
              Select New Assignment
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Pastor Option */}
              <button
                type="button"
                onClick={() => setRole("pastor")}
                className={`group relative flex flex-col items-center justify-center p-5 rounded-[24px] border-2 transition-all duration-300 ${role === "pastor"
                  ? "border-guenet-green bg-guenet-green/5 dark:bg-guenet-green/10 shadow-lg shadow-guenet-green/10"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:border-guenet-green/30 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md text-gray-500"
                  }`}
              >
                {role === "pastor" && (
                  <div className="absolute top-3 right-3 bg-guenet-green text-white p-1 rounded-full animate-in zoom-in duration-300">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl mb-3 transition-colors duration-300 ${role === "pastor" ? "bg-guenet-green text-white" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 group-hover:text-guenet-green"
                    }`}
                >
                  <User size={28} />
                </div>
                <span
                  className={`text-sm font-bold tracking-tight transition-colors ${role === "pastor" ? "text-guenet-green" : "text-gray-600 dark:text-gray-400"
                    }`}
                >
                  Pastor
                </span>
                <p className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 font-medium">Church Lead</p>
              </button>

              {/* Servant Option */}
              <button
                type="button"
                onClick={() => setRole("servant")}
                className={`group relative flex flex-col items-center justify-center p-5 rounded-[24px] border-2 transition-all duration-300 ${role === "servant"
                  ? "border-guenet-green bg-guenet-green/5 dark:bg-guenet-green/10 shadow-lg shadow-guenet-green/10"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:border-guenet-green/30 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md text-gray-500"
                  }`}
              >
                {role === "servant" && (
                  <div className="absolute top-3 right-3 bg-guenet-green text-white p-1 rounded-full animate-in zoom-in duration-300">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl mb-3 transition-colors duration-300 ${role === "servant" ? "bg-guenet-green text-white" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 group-hover:text-guenet-green"
                    }`}
                >
                  <Users size={28} />
                </div>
                <span
                  className={`text-sm font-bold tracking-tight transition-colors ${role === "servant" ? "text-guenet-green" : "text-gray-600 dark:text-gray-400"
                    }`}
                >
                  Servant
                </span>
                <p className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 font-medium">Dept Worker</p>
              </button>
            </div>
          </div>

          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
            <div>
              <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                Church Assignment
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 group-focus-within:text-guenet-green transition-colors">
                  <Building size={20} />
                </div>
                <select
                  required
                  value={churchId}
                  onChange={handleChurchChange}
                  className="form-select pl-12 h-14 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                >
                  <option value="">Select Church</option>
                  {churches.map((church) => (
                    <option key={church.id} value={church.id}>
                      {church.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {role === "servant" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                  Department (Optional)
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 group-focus-within:text-guenet-green transition-colors">
                    <Users size={20} />
                  </div>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="form-select pl-12 h-14 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-all active:scale-95 translate-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !hasChanges}
              className="flex-2 group h-12 bg-guenet-green text-white rounded-2xl hover:brightness-110 transition-all font-bold shadow-lg shadow-guenet-green/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 px-8"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Changes</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
