import React, { useState, useRef } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  User,
  Moon,
  Globe,
  AlertTriangle,
  Loader2,
  Upload,
  X,
  Edit2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { logActivity } from "../utils/activityLogger";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const { profile, settings: globalSettings } = useAuth();
  const [activeTab, setActiveTab] = useState("General");
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    avatar_url: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || "",
      });
      setPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      handleFile(selectedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleFile(selectedFile);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Check if file is an image
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const uploadAvatar = async (
    userId: string,
    file: File
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setUpdating(true);
      let avatarUrl = formData.avatar_url;

      if (file) {
        const uploadedUrl = await uploadAvatar(profile.id, file);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      await logActivity("UPDATE", "PROFILE", `Updated profile`, profile.id, {
        old: { full_name: profile.full_name, avatar_url: profile.avatar_url },
        new: { ...formData, avatar_url: avatarUrl },
      });

      toast.success("Profile updated successfully");
      // Note: Ideally we should update the context profile here, but for now user will see update on refresh
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!globalSettings) return;

    try {
      setUpdating(true);
      const newStatus = !globalSettings.is_maintenance_mode;

      const { error } = await supabase
        .from("global_settings")
        .update({ is_maintenance_mode: newStatus })
        .eq("id", globalSettings.id);

      if (error) throw error;

      await logActivity(
        "UPDATE",
        "SETTINGS",
        `Toggled maintenance mode to ${newStatus}`,
        globalSettings.id.toString(),
        {
          old: globalSettings.is_maintenance_mode,
          new: newStatus,
        }
      );

      toast.success(`Maintenance mode ${newStatus ? "enabled" : "disabled"}`);
      // Note: In a real app, you might need to refresh the global settings in context
      window.location.reload();
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setUpdating(false);
    }
  };

  const tabs = [
    { id: "General", icon: SettingsIcon, label: "General" },
    { id: "Security", icon: Shield, label: "Security" },
    { id: "Notifications", icon: Bell, label: "Notifications" },
    { id: "Profile", icon: User, label: "Profile" },
  ];

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

  const tabVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure application preferences
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div variants={itemVariants} className="w-full lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-3 text-sm font-medium ${activeTab === tab.id
                  ? "bg-guenet-green/10 text-guenet-green"
                  : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "General" && (
              <motion.div
                key="General"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  General Settings
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Globe size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Language</div>
                        <div className="text-sm text-gray-500">
                          Change interface language
                        </div>
                      </div>
                    </div>
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option>English</option>
                      <option>Amharic</option>
                      <option>Oromo</option>
                    </select>
                  </div>

                  <div className="h-px bg-gray-50"></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <Moon size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Appearance
                        </div>
                        <div className="text-sm text-gray-500">
                          Toggle dark mode
                        </div>
                      </div>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                      <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                    </button>
                  </div>

                  {profile?.role === "super_admin" && globalSettings && (
                    <>
                      <div className="h-px bg-gray-50"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <AlertTriangle size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              Maintenance Mode
                            </div>
                            <div className="text-sm text-gray-500">
                              Disable access for non-admins
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={toggleMaintenanceMode}
                          disabled={updating}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.is_maintenance_mode
                              ? "bg-guenet-green"
                              : "bg-gray-200"
                            }`}
                        >
                          {updating ? (
                            <Loader2 className="animate-spin h-4 w-4 text-white mx-auto" />
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${globalSettings.is_maintenance_mode
                                  ? "translate-x-6"
                                  : "translate-x-1"
                                }`}
                            />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "Profile" && profile && (
              <motion.div
                key="Profile"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  My Profile
                </h2>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="flex flex-col items-center sm:flex-row gap-6 mb-8">
                    <div className="relative group">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-guenet-green/10 flex items-center justify-center text-2xl font-bold text-guenet-green border-4 border-white shadow-lg">
                          {formData.full_name?.charAt(0) || "U"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-guenet-green transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900">
                        {profile.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {profile.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Profile Picture
                      </label>
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${dragActive
                            ? "border-guenet-green bg-guenet-green/5"
                            : "border-gray-200 hover:border-guenet-green/50 hover:bg-gray-50"
                          }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleChange}
                          className="hidden"
                        />

                        {file ? (
                          <div className="flex items-center gap-3 p-2 bg-guenet-green/10 rounded-lg">
                            <span className="text-sm font-medium text-guenet-green truncate max-w-[200px]">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                                setPreview(profile.avatar_url || null);
                              }}
                              className="text-guenet-green hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                              <Upload size={20} />
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              SVG, PNG, JPG or GIF (max. 5MB)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-guenet-green/20 focus:border-guenet-green outline-none transition-all"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Role
                      </label>
                      <input
                        type="text"
                        value={profile.role.replace("_", " ")}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 capitalize cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex items-center gap-2 px-6 py-2.5 bg-guenet-green text-white font-medium rounded-xl hover:bg-guenet-green/90 transition-all shadow-sm shadow-guenet-green/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {updating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab === "Security" || activeTab === "Notifications") && (
              <motion.div
                key="Placeholder"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <SettingsIcon className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
                <p className="text-gray-500 mt-2">
                  This settings panel is under development.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
