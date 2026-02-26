import React, { useState, useEffect } from "react";
import { X, Shield, Building, User, Users } from "lucide-react";
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
  const [role, setRole] = useState<"super_admin" | "pastor" | "servant">(
    "servant"
  );
  const [churchId, setChurchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [churches, setChurches] = useState<Church[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setRole(user.role);
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
        church_id: role === "super_admin" ? null : churchId || null,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Change User Role
            </h2>
            <p className="text-sm text-gray-500">
              Update permissions and access
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRole("super_admin")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  role === "super_admin"
                    ? "border-guenet-green bg-guenet-green/5 text-guenet-green"
                    : "border-gray-200 hover:border-guenet-green/30 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <Shield size={24} className="mb-2" />
                <span className="text-xs font-medium">Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("pastor")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  role === "pastor"
                    ? "border-guenet-green bg-guenet-green/5 text-guenet-green"
                    : "border-gray-200 hover:border-guenet-green/30 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <User size={24} className="mb-2" />
                <span className="text-xs font-medium">Pastor</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("servant")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  role === "servant"
                    ? "border-guenet-green bg-guenet-green/5 text-guenet-green"
                    : "border-gray-200 hover:border-guenet-green/30 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <Users size={24} className="mb-2" />
                <span className="text-xs font-medium">Servant</span>
              </button>
            </div>
          </div>

          {role !== "super_admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Church Assignment
              </label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  required
                  value={churchId}
                  onChange={handleChurchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-guenet-green/20 focus:border-guenet-green"
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
          )}

          {role === "servant" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department (Optional)
              </label>
              <div className="relative">
                <Users
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-guenet-green/20 focus:border-guenet-green"
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

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-guenet-green text-white rounded-xl hover:bg-guenet-green/90 transition-colors font-medium shadow-sm shadow-guenet-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
