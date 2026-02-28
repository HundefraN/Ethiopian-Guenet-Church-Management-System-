import React, { useState, useRef, useMemo } from "react";
import ImageCropper from "../components/ImageCropper";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  User,
  Moon,
  Sun,
  Globe,
  AlertTriangle,
  Loader2,
  Upload,
  X,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Check,
  Info,
  Calendar,
} from "lucide-react";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import { motion, AnimatePresence, Variants } from "framer-motion";

export default function Settings() {
  const { profile, user, settings: globalSettings, refreshProfile, calendarType, updateCalendarType } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("General");
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    avatar_url: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Password strength calculation
  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\;'`~_+=-]/.test(newPassword),
    };
  }, [newPassword]);

  const strengthScore = useMemo(() => {
    return Object.values(passwordChecks).filter(Boolean).length;
  }, [passwordChecks]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (strengthScore < 4) {
      toast.error(t("settings.messages.strongerPassword"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t("settings.security.passwordMismatch"));
      return;
    }

    try {
      setChangingPassword(true);

      // Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      });
      if (signInError) {
        toast.error(t("settings.security.currentPasswordIncorrect") || "Current password is incorrect.");
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await logActivity("PASSWORD_CHANGE", "PROFILE", "Password changed from settings", profile.id);
      toast.success(t("settings.messages.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || t("settings.messages.failedChangePassword"));
    } finally {
      setChangingPassword(false);
    }
  };

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
      toast.error(t("settings.messages.imageOnly"));
      return;
    }

    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error(t("settings.messages.sizeLimit"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setCropImage(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    setFile(croppedFile);
    const objectUrl = URL.createObjectURL(croppedBlob);
    setPreview(objectUrl);
    setCropImage(null);
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

      const logOld = { full_name: profile.full_name, avatar_url: profile.avatar_url };
      const logNew = { full_name: formData.full_name, avatar_url: avatarUrl };

      const diff = getObjectDiff(logOld, logNew);

      if (!diff) {
        toast.error(t("common.noChanges"));
        setUpdating(false);
        return;
      }

      if (Object.keys(diff.new).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(diff.new)
          .eq("id", profile.id);

        if (error) throw error;
      }

      const changedFields = Object.keys(diff.new).join(", ");
      await logActivity("UPDATE", "PROFILE", `Updated profile (Changed: ${changedFields})`, profile.id, diff);

      toast.success(t("settings.messages.updateSuccess"));
      // Refresh the profile in context so sidebar/header updates immediately
      await refreshProfile();
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t("settings.messages.updateError"));
    } finally {
      setUpdating(false);
    }
  };

  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;
    return formData.full_name !== (profile.full_name || "") || file !== null;
  }, [formData, profile, file]);

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
        "TOGGLE",
        "SETTINGS",
        `${newStatus ? "Enabled" : "Disabled"} maintenance mode from settings`,
        globalSettings.id.toString(),
        {
          old: { is_maintenance_mode: !newStatus },
          new: { is_maintenance_mode: newStatus },
        }
      );

      toast.success(newStatus ? t("settings.messages.maintenanceEnabled") : t("settings.messages.maintenanceDisabled"));
      // Note: In a real app, you might need to refresh the global settings in context
      window.location.reload();
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(t("settings.messages.failedUpdate"));
    } finally {
      setUpdating(false);
    }
  };

  const tabs = [
    { id: "General", icon: SettingsIcon, label: t("settings.tabs.general") },
    { id: "Security", icon: Shield, label: t("settings.tabs.security") },
    { id: "Notifications", icon: Bell, label: t("settings.tabs.notifications") },
    { id: "Profile", icon: User, label: t("settings.tabs.profile") },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 },
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("settings.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("settings.subtitle")}
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
                ? "bg-[#4B9BDC]/10 text-[#4B9BDC] dark:bg-[#4B9BDC]/20"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Header section with gradient */}
                <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"></div>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    {t("settings.tabs.general")}
                  </h2>

                  <div className="space-y-8">
                    {/* Calendar Type Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 transition-colors">
                          <Calendar size={22} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{t("settings.calendar.label")}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t("settings.calendar.description")}
                          </div>
                        </div>
                      </div>
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
                        <button
                          onClick={() => updateCalendarType('gregorian')}
                          className={`relative px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${calendarType === 'gregorian'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                          {t("settings.calendar.gregorian")}
                        </button>
                        <button
                          onClick={() => updateCalendarType('ethiopian')}
                          className={`relative px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${calendarType === 'ethiopian'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-105'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                          {t("settings.calendar.ethiopian")}
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>

                    {/* Language Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 transition-colors">
                          <Globe size={22} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{t("settings.language.label")}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t("settings.language.description")}
                          </div>
                        </div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-gray-200 shadow-sm transition-all appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-700"
                      >
                        <option value="en">{t("settings.language.english")}</option>
                        <option value="am">{t("settings.language.amharic")}</option>
                        <option value="om">{t("settings.language.oromo")}</option>
                        <option value="ti">{t("settings.language.tigrinya")}</option>
                      </select>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>

                    {/* Appearance Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-all duration-500 ${isDark ? 'bg-indigo-500/10 text-indigo-400 rotate-[360deg]' : 'bg-purple-50 text-purple-600'}`}>
                          {isDark ? <Moon size={22} /> : <Sun size={22} />}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {t("settings.appearance.label")}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {isDark ? t("settings.appearance.light") : t("settings.appearance.dark")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className={`relative inline-flex h-8 w-[60px] items-center rounded-full transition-all duration-300 ${isDark
                          ? 'bg-indigo-600 shadow-lg shadow-indigo-500/25'
                          : 'bg-gray-300'
                          }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full shadow-md ${isDark
                            ? 'translate-x-[30px] bg-white'
                            : 'translate-x-1 bg-white'
                            }`}
                        >
                          <AnimatePresence mode="wait">
                            {isDark ? (
                              <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <Moon size={14} className="text-indigo-600" />
                              </motion.div>
                            ) : (
                              <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <Sun size={14} className="text-amber-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.span>
                      </button>
                    </div>

                    {profile?.role === "super_admin" && globalSettings && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 transition-colors">
                              <AlertTriangle size={22} />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {t("settings.maintenance.label")}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t("settings.maintenance.description")}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={toggleMaintenanceMode}
                            disabled={updating}
                            className={`relative inline-flex h-8 w-[60px] items-center rounded-full transition-all duration-300 ${globalSettings.is_maintenance_mode
                              ? "bg-red-500 shadow-lg shadow-red-500/25"
                              : "bg-gray-300 dark:bg-gray-700"
                              }`}
                          >
                            {updating ? (
                              <Loader2 className="animate-spin h-5 w-5 text-white mx-auto" />
                            ) : (
                              <motion.span
                                layout
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition ${globalSettings.is_maintenance_mode
                                  ? "translate-x-[30px]"
                                  : "translate-x-1"
                                  }`}
                              />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  {t("settings.profile.label")}
                </h2>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="flex flex-col items-center sm:flex-row gap-6 mb-8">
                    <div className="relative group">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-guenet-green/10 flex items-center justify-center text-2xl font-bold text-guenet-green border-4 border-white dark:border-gray-800 shadow-lg">
                          {formData.full_name?.charAt(0) || "U"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-guenet-green transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {profile.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {t(`common.roles.${profile.role.toLowerCase()}`)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                        {t("settings.profile.picture")}
                      </label>
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${dragActive
                          ? "border-guenet-green bg-guenet-green/5"
                          : "border-gray-200 dark:border-gray-700 hover:border-guenet-green/50 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                              <Upload size={20} />
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {t("settings.profile.upload")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t("settings.profile.uploadLimit")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                        {t("settings.profile.fullName")}
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-guenet-green/20 focus:border-guenet-green outline-none transition-all dark:text-gray-200"
                        placeholder={t("settings.profile.fullName")}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                        {t("settings.profile.role")}
                      </label>
                      <input
                        type="text"
                        value={t(`common.roles.${profile.role}`)}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 capitalize cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={updating || !hasProfileChanges}
                      className="flex items-center gap-2 px-6 py-2.5 bg-guenet-green text-white font-medium rounded-xl hover:bg-guenet-green/90 transition-all shadow-sm shadow-guenet-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>{t("settings.profile.saving")}</span>
                        </>
                      ) : (
                        <span>{t("settings.profile.save")}</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === "Security" && (
              <motion.div
                key="Security"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Password Change Card */}
                <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  {/* Decorative gradient top bar */}
                  <div className="h-1.5 bg-gradient-to-r from-[#4B9BDC] via-[#7EC8F2] to-[#4B9BDC]"></div>
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-gradient-to-br from-[#4B9BDC]/10 to-[#7EC8F2]/10 rounded-xl">
                        <Lock size={22} className="text-[#4B9BDC]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("settings.security.title")}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t("settings.security.subtitle")}</p>
                      </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-5">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">{t("settings.security.currentPassword")}</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-3 bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] outline-none transition-all text-sm dark:text-gray-200"
                            placeholder={t("settings.security.currentPassword")}
                          />
                          <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-600 transition-colors">
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">{t("settings.security.newPassword")}</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Shield size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-3 bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC] outline-none transition-all text-sm dark:text-gray-200"
                            placeholder={t("settings.security.newPassword")}
                          />
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-600 transition-colors">
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        {/* Password Strength Meter */}
                        <PasswordStrengthMeter password={newPassword} />
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">{t("settings.security.confirmPassword")}</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Check size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className={`block w-full pl-10 pr-10 py-3 bg-gray-50/50 dark:bg-gray-800 border rounded-xl focus:ring-2 outline-none transition-all text-sm dark:text-gray-200 ${confirmNewPassword.length > 0 && confirmNewPassword !== newPassword
                              ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                              : confirmNewPassword.length > 0 && confirmNewPassword === newPassword
                                ? "border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400"
                                : "border-gray-200 dark:border-gray-700 focus:ring-[#4B9BDC]/20 focus:border-[#4B9BDC]"
                              }`}
                            placeholder={t("settings.security.confirmPassword")}
                          />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-600 transition-colors">
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {confirmNewPassword.length > 0 && confirmNewPassword !== newPassword && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                            <Info size={12} /> {t("settings.security.passwordMismatch")}
                          </motion.p>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={changingPassword || strengthScore < 4 || newPassword !== confirmNewPassword || !currentPassword}
                          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#4B9BDC] to-[#3a85c2] text-white font-medium rounded-xl hover:from-[#3a85c2] hover:to-[#295b86] transition-all shadow-sm shadow-[#4B9BDC]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          {changingPassword ? (
                            <><Loader2 size={18} className="animate-spin" /><span>{t("settings.security.updating")}</span></>
                          ) : (
                            <><Shield size={18} /><span>{t("settings.security.updateBtn")}</span></>
                          )}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Security Tips Card */}
                <div className="bg-gradient-to-br from-[#4B9BDC]/5 to-[#7EC8F2]/5 dark:from-[#4B9BDC]/10 dark:to-[#7EC8F2]/10 rounded-2xl border border-[#4B9BDC]/10 dark:border-gray-800 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={18} className="text-[#4B9BDC]" />
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t("settings.security.tipsTitle")}</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    {(t("settings.security.tips") as any as string[]).map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#4B9BDC] shrink-0"></span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Notifications tab placeholder */}
            {activeTab === "Notifications" && (
              <motion.div
                key="Notifications"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white dark:bg-gray-900 p-12 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Bell className="text-gray-500 dark:text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("settings.notifications.title")}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t("settings.notifications.description")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <AnimatePresence>
        {cropImage && (
          <ImageCropper
            image={cropImage}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropImage(null)}
            aspect={1}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
