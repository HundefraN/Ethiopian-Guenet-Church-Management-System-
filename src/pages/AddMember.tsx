import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ImageCropper from "../components/ImageCropper";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Calendar, MapPin, Briefcase, Phone, Mail, Heart, Shield,
  BookOpen, Users, Save, ArrowLeft, Upload, X, CheckCircle, Globe,
  Plus, Trash2, FileText, DollarSign, ChevronRight, Loader2
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { logActivity, getObjectDiff } from "../utils/activityLogger";
import { invokeSupabaseFunction } from "../utils/supabaseFunctions";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ds } from "../utils/darkStyles";
import { useMediaQuery } from "../hooks/useMediaQuery";

// --- Schema Definition ---
const memberSchema = z.object({
  photo: z.any().optional(),
  full_name: z.string().min(2, "Full name is required"),
  dob: z.string().optional().nullable(),
  place_of_birth: z.string().optional().nullable(),
  mother_tongue: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  salvation_date: z.string().optional().nullable(),
  salvation_place: z.string().optional().nullable(),
  previous_church: z.string().optional().nullable(),
  reason_for_coming: z.string().optional().nullable(),
  faith: z.string().optional().nullable(),
  field_of_study: z.string().optional().nullable(),
  educational_level: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  workplace_address: z.string().optional().nullable(),
  income_amount: z.string().optional().nullable(),
  marital_status: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional().nullable(),
  spouse_name: z.string().optional().nullable(),
  marriage_date: z.string().optional().nullable(),
  marriage_place: z.string().optional().nullable(),
  children: z.array(z.object({
    name: z.string(), gender: z.string(), age: z.string(), education: z.string(), faith: z.string()
  })).optional(),
  additional_family_info: z.string().optional().nullable(),
  living_situation: z.string().optional().nullable(),
  service_type: z.string().optional().nullable(),
  service_duration: z.string().optional().nullable(),
  service_responsibility: z.string().optional().nullable(),
  current_service: z.string().optional().nullable(),
  spiritual_gift: z.string().optional().nullable(),
  future_service: z.string().optional().nullable(),
  additional_service_info: z.string().optional().nullable(),
  fellowship_start_date: z.string().optional().nullable(),
  fellowship_name: z.string().optional().nullable(),
  fellowship_responsibility: z.string().optional().nullable(),
  fellowship_mentor: z.string().optional().nullable(),
  fellowship_leader: z.string().optional().nullable(),
  additional_fellowship_info: z.string().optional().nullable(),
  member_signature: z.string().optional().nullable(),
  form_filled_date: z.string().optional().nullable(),
  fellowship_leader_signature: z.string().optional().nullable(),
  zone_rep_signature: z.string().optional().nullable(),
  middle_sector_rep_signature: z.string().optional().nullable(),
  status: z.enum(["Active", "Death", "Transfer"]),
  department_id: z.string().optional().nullable(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

export default function AddMember() {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const SECTIONS = React.useMemo(() => [
    { id: 'personal', title: t('members.form.sections.personal'), icon: User, color: 'from-blue-500 to-cyan-400' },
    { id: 'spiritual', title: t('members.form.sections.spiritual'), icon: Heart, color: 'from-purple-500 to-pink-400' },
    { id: 'education', title: t('members.form.sections.education'), icon: Briefcase, color: 'from-amber-500 to-orange-400' },
    { id: 'family', title: t('members.form.sections.family'), icon: Users, color: 'from-rose-500 to-pink-400' },
    { id: 'service', title: t('members.form.sections.service'), icon: BookOpen, color: 'from-teal-500 to-emerald-400' },
    { id: 'fellowship', title: t('members.form.sections.fellowship'), icon: Globe, color: 'from-indigo-500 to-blue-400' },
    { id: 'signatures', title: t('members.form.sections.signatures'), icon: CheckCircle, color: 'from-slate-600 to-slate-400' },
  ], [t]);

  const d = ds(isDark);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [activeSection, setActiveSection] = useState('personal');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isDeptMenuOpen, setIsDeptMenuOpen] = useState(false);
  const deptMenuRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Servant Promoton State
  const [isMakeServantModalOpen, setIsMakeServantModalOpen] = useState(false);
  const [promoteToServant, setPromoteToServant] = useState(false);
  const [servantPassword, setServantPassword] = useState("");
  const [makingServant, setMakingServant] = useState(false);

  const { register, control, handleSubmit, watch, setValue, trigger, reset, formState: { errors, isDirty } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      children: [],
      status: "Active",
      marital_status: "Single",
      full_name: "",
      photo: undefined,
      form_filled_date: new Date().toISOString().split('T')[0]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "children" });

  useEffect(() => {
    const fetchDepartments = async () => {
      if (profile?.church_id || profile?.role === "super_admin") {
        let query = supabase.from("departments").select("*").order("name");
        if (profile?.role !== "super_admin") {
          query = query.eq("church_id", profile.church_id);
        }
        const { data } = await query;
        if (data) setDepartments(data);
      }
    };
    fetchDepartments();

    if (profile?.role === "super_admin" && isEditing) {
      toast.error(t('common.unauthorized'));
      navigate("/members");
      return;
    }
    if (isEditing && id) {
      const fetchMember = async () => {
        setLoadingMember(true);
        try {
          const { data, error } = await supabase.from("members").select("*").eq("id", id).single();
          if (error) throw error;
          if (data) {
            const formattedData = Object.keys(data).reduce((acc: any, key) => {
              acc[key] = (data[key] === null || data[key] === undefined) ? "" : data[key];
              return acc;
            }, {});
            formattedData.income_amount = data.income_amount ? String(data.income_amount) : "";
            formattedData.children = Array.isArray(data.children) ? data.children : [];
            if (data.photo) { setPhotoPreview(data.photo); formattedData.photo = data.photo; }
            else { formattedData.photo = undefined; }
            setInitialData(formattedData);
            reset(formattedData);
          }
        } catch (error) {
          console.error("Error fetching member:", error);
          toast.error(t('members.messages.loadError'));
          navigate("/members");
        } finally { setLoadingMember(false); }
      };
      fetchMember();
    } else {
      const draft = localStorage.getItem("member_draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          reset(parsed);
          toast.success(t('members.draftRestored'), { icon: "📝" });
        }
        catch (e) { console.error("Failed to parse draft", e); }
      } else if (profile?.department_id) {
        // Set default department for new members if not editing
        setValue("department_id", profile.department_id);
      }
    }
  }, [id, isEditing, navigate, reset, setValue, profile]);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((section) => {
      const el = sectionRefs.current[section.id];
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
              setActiveSection(section.id);
            }
          });
        },
        { threshold: 0.3, root: null }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [loadingMember]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptMenuRef.current && !deptMenuRef.current.contains(event.target as Node)) {
        setIsDeptMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  const saveDraft = () => {
    const data = watch();
    localStorage.setItem("member_draft", JSON.stringify(data));
    toast.success(t('members.draftSaved'));
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error(t('settings.messages.imageOnly')); return; }
    const reader = new FileReader();
    reader.onload = (e) => setCropImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "member_photo.jpg", { type: "image/jpeg" });
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(croppedBlob);
    setValue("photo", croppedFile, { shouldDirty: true });
    setCropImage(null);
  };

  const onSubmit = async (data: MemberFormValues) => {
    if (!isEditing && promoteToServant) {
      if (!data.email) {
        toast.error(t('members.messages.emailRequiredServant'));
        return;
      }
      if (servantPassword.length < 6) {
        toast.error(t('members.messages.passwordMinLength'));
        return;
      }
    }

    const loadingToast = toast.loading(isEditing ? t('members.messages.updatingMember') : t('members.messages.registeringMember'));
    setUploading(true);
    try {
      let photoUrl = null;
      if (data.photo instanceof File) {
        const fileExt = data.photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `members/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, data.photo);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        photoUrl = publicUrl;
      } else if (typeof data.photo === 'string') { photoUrl = data.photo; }

      const payload = {
        ...data, photo: photoUrl,
        church_id: profile?.church_id,
        department_id: data.department_id || null,
        income_amount: data.income_amount && !isNaN(parseFloat(data.income_amount)) ? parseFloat(data.income_amount) : null,
        dob: data.dob || null, salvation_date: data.salvation_date || null,
        marriage_date: data.marriage_date || null, fellowship_start_date: data.fellowship_start_date || null,
        form_filled_date: data.form_filled_date || null,
      };

      if (isEditing && id) {
        // Calculate differences to log and update only changed data
        const diff = initialData ? getObjectDiff(initialData, payload) : null;

        if (!diff) {
          toast.success(t('members.messages.noChanges'), { id: loadingToast });
          setUploading(false);
          return;
        }

        if (Object.keys(diff.new).length > 0) {
          const { error } = await supabase.from("members").update(diff.new).eq("id", id);
          if (error) throw error;
        }

        const changedFields = Object.keys(diff.new).join(", ");
        await logActivity(
          "UPDATE",
          "MEMBER",
          t('members.messages.addedNewMemberLog').replace("Added", "Updated").replace("{{name}}", data.full_name) + ` (Changed: ${changedFields})`,
          id,
          diff
        );

        toast.success(t('members.messages.updateSuccess'), { id: loadingToast });
      } else {
        const { data: newMember, error } = await supabase.from("members").insert([payload]).select().single();
        if (error) throw error;

        let servantCreatedMsg = "";
        if (promoteToServant) {
          const { data: responseData } = await invokeSupabaseFunction("create-user", {
            body: {
              email: data.email,
              password: servantPassword,
              full_name: data.full_name,
              role: "servant",
              church_id: profile?.church_id,
              department_id: data.department_id || null,
            },
          });
          if (responseData?.error) {
            toast.error(t('members.messages.servantAccountError').replace("{{error}}", responseData.error), { id: loadingToast });
          } else {
            const servantId = responseData.user?.id || responseData?.id;
            await logActivity("CREATE", "SERVANT", t('members.messages.promotingMemberLog').replace("{{name}}", data.full_name), servantId || null, {
              email: data.email,
              source: "Member Registration"
            });
            servantCreatedMsg = t('members.messages.servantCreatedLog');
          }
        }

        // For creation, we log the whole payload but maybe exclude some internal things
        const logPayload = { ...payload };
        delete logPayload.photo; // Don't log base64 or large URLs if possible, or keep it if it's just a URL

        await logActivity("CREATE", "MEMBER", t('members.messages.addedNewMemberLog').replace("{{name}}", data.full_name), newMember.id, logPayload);
        toast.success(t('members.messages.deleteSuccess').replace("deleted", "registered") + servantCreatedMsg, { id: loadingToast });
        localStorage.removeItem("member_draft");
      }
      navigate("/members");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save member", { id: loadingToast });
    } finally { setUploading(false); }
  };

  const handleMakeServant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData) return;

    const email = watch("email");
    if (!email) {
      toast.error(t('members.messages.emailRequiredServantRegister'));
      return;
    }

    if (servantPassword.length < 6) {
      toast.error(t('members.messages.passwordMinLength'));
      return;
    }

    setMakingServant(true);
    const loadingToast = toast.loading(t('members.messages.creatingServantAccount'));

    try {
      const { data: responseData } = await invokeSupabaseFunction("create-user", {
        body: {
          email: email,
          password: servantPassword,
          full_name: watch("full_name") || initialData.full_name,
          role: "servant",
          church_id: profile?.church_id || initialData.church_id,
          department_id: watch("department_id") || initialData.department_id || null,
        },
      });

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      const servantId = responseData.user?.id || responseData?.id;

      let churchName = t('members.messages.thisChurch');
      if (profile?.role === "pastor" && profile.church_id) {
        churchName = t('members.messages.thisChurch');
      }

      await logActivity("CREATE", "SERVANT", t('members.messages.promotingMemberLog').replace("{{name}}", watch("full_name") || initialData.full_name), servantId || null, {
        email: email,
        member_id: id,
        source: "Member Promotion"
      });

      toast.success(t('members.messages.promoteSuccess'), { id: loadingToast });
      setIsMakeServantModalOpen(false);
      setServantPassword("");
    } catch (error: any) {
      console.error("Error creating servant:", error);
      toast.error(error.message || t('members.messages.promoteError'), { id: loadingToast });
    } finally {
      setMakingServant(false);
    }
  };

  if (loadingMember) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#4B9BDC] h-12 w-12 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('activity.loading')}</p>
        </div>
      </div>
    );
  }

  const maritalStatus = watch("marital_status");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="min-h-screen pb-20"
    >
      {/* Floating Sticky Header (Desktop) */}
      {isDesktop && (
        <div className="sticky top-4 md:top-6 z-20 w-full mb-8">
          <div className="w-full backdrop-blur-2xl border shadow-[0_8px_32px_rgba(75,155,220,0.12)] rounded-2xl md:rounded-[2rem] transition-all duration-300" style={d.modalContent}>
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2.5 rounded-xl text-gray-500 transition-all hover:scale-105 active:scale-95 border border-transparent"
                  style={d.iconBox}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none overflow-hidden">
                    {isEditing ? t('members.editBtn') : t('members.addBtn')}
                  </h1>
                  <p className="text-[10px] md:text-xs text-blue-500 font-bold uppercase tracking-wider mt-1 opacity-80">
                    {isEditing ? t('dashboard.actions.viewAddMembers') : t('login.empoweringMinistry')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isEditing) {
                      setIsMakeServantModalOpen(true);
                    } else {
                      setPromoteToServant(!promoteToServant);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${promoteToServant ? 'bg-[#4B9BDC] text-white border-[#4B9BDC]' : 'bg-[#4B9BDC]/10 text-[#4B9BDC] hover:bg-[#4B9BDC]/20 border-[#4B9BDC]/20'}`}
                >
                  <Shield size={16} />
                  <span>{promoteToServant ? t('members.form.registeringAsServant') : t('members.form.setAsServant')}</span>
                </button>
                {!isEditing && (
                  <button onClick={saveDraft} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-semibold transition-colors px-4 py-2.5 rounded-xl border" style={d.card}>
                    <Save size={16} /> {t('members.saveDraft')}
                  </button>
                )}
                <button
                  onClick={handleSubmit(onSubmit)}
                  disabled={uploading || (isEditing ? (!isDirty && !(watch("photo") instanceof File)) : !watch("full_name"))}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] text-white rounded-xl hover:scale-105 active:scale-95 font-bold shadow-[0_4px_16px_rgba(75,155,220,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  <span>{isEditing ? t('common.updating') : t('common.save')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Header (Portal) */}
      {!isDesktop && createPortal(
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="min-w-0 flex flex-col">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {isEditing ? t('members.editBtn') : t('members.addBtn')}
                </h1>
                {isEditing && (
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider truncate opacity-80">
                    {t('members.messages.updateRecords')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (isEditing) {
                    setIsMakeServantModalOpen(true);
                  } else {
                    setPromoteToServant(!promoteToServant);
                  }
                }}
                className={`p-2 rounded-xl transition-all border ${promoteToServant ? 'bg-[#4B9BDC] text-white border-[#4B9BDC]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent'}`}
                title={promoteToServant ? t('members.form.registeringAsServant') : t('members.form.setAsServant')}
              >
                <Shield size={20} className={promoteToServant ? "fill-current" : ""} />
              </button>

              {!isEditing && (
                <button
                  onClick={saveDraft}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={t('members.saveDraft')}
                >
                  <Save size={20} />
                </button>
              )}

              <button
                onClick={handleSubmit(onSubmit)}
                disabled={uploading || (isEditing ? (!isDirty && !(watch("photo") instanceof File)) : !watch("full_name"))}
                className="p-2 bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                title={isEditing ? t('members.editBtn') : t('members.addBtn')}
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28">
            <nav className="space-y-1.5">
              {SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150 group ${isActive
                      ? 'shadow-[0_4px_20px_rgba(0,0,0,0.06)] scale-[1.02]'
                      : ''
                      }`}
                    style={isActive ? d.card : {}}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${isActive
                      ? `bg-gradient-to-br ${section.color} text-white shadow-md`
                      : 'text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-800'
                      }`}
                      style={!isActive ? d.iconBox : {}}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold block truncate transition-colors ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {section.title}
                      </span>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-[#4B9BDC]' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t('members.form.step')} {index + 1} {t('members.form.of')} {SECTIONS.length}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="w-1.5 h-8 bg-gradient-to-b from-[#4B9BDC] to-[#7EC8F2] rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Progress */}
            <div className="mt-6 px-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.analytics.growthAnalytics')}</span>
                <span className="text-[#4B9BDC] font-bold">
                  {Math.round(((SECTIONS.findIndex(s => s.id === activeSection) + 1) / SECTIONS.length) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={d.iconBox}>
                <motion.div
                  className="h-full bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((SECTIONS.findIndex(s => s.id === activeSection) + 1) / SECTIONS.length) * 100}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 min-w-0 space-y-6" ref={scrollContainerRef}>

          {/* ═══════════ 1. Personal Information ═══════════ */}
          <div ref={(el) => { sectionRefs.current['personal'] = el; }} id="personal" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <User size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.personal')}</h2>
                  <p className="text-blue-100 text-xs font-medium">{t('login.signInSub')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-center mb-8">
                  <div className="relative group">
                    <div className={`w-28 h-28 rounded-2xl overflow-hidden border-[3px] border-white shadow-lg transition-transform group-hover:scale-105 ${!photoPreview && 'bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center'}`}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload size={28} className="text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] text-white p-2 rounded-xl cursor-pointer hover:scale-110 shadow-lg transition-transform">
                      <Plus size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="form-label">{t('members.form.fullName')} <span className="text-red-400">*</span></label>
                    <input {...register("full_name")} className="form-input" placeholder={t('members.form.fullNamePlaceholder')} />
                    {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label text-blue-700 flex items-center justify-between">
                      <span>{t('members.form.assignedDepartment')}</span>
                      {watch("department_id") && (
                        <button
                          type="button"
                          onClick={() => setValue("department_id", "", { shouldDirty: true })}
                          className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
                        >
                          {t('members.form.clearAssignment')}
                        </button>
                      )}
                    </label>
                    <div className="relative" ref={deptMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsDeptMenuOpen(!isDeptMenuOpen)}
                        style={d.searchBar(isDeptMenuOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 shadow-sm ${isDeptMenuOpen
                          ? "border-[#4B9BDC] ring-4 ring-[#4B9BDC]/10"
                          : "border-blue-100/50 hover:border-blue-200"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${watch("department_id") ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-400"
                            }`}>
                            <Shield size={20} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-bold truncate ${watch("department_id") ? (isDark ? "text-white" : "text-gray-900") : "text-gray-500 dark:text-gray-400"
                              }`}>
                              {departments.find(d => d.id === watch("department_id"))?.name || t('members.form.chooseDept')}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none mt-0.5">
                              {watch("department_id") ? t('members.form.currentlyAssigned') : t('members.form.noDeptAssigned')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isDeptMenuOpen ? "rotate-90" : ""
                            }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isDeptMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute left-0 right-0 top-full mt-2 z-50 bg-white/95 backdrop-blur-xl border border-blue-100 rounded-3xl shadow-[0_20px_50px_rgba(75,155,220,0.15)] overflow-hidden"
                          >
                            <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => {
                                  setValue("department_id", "", { shouldDirty: true });
                                  setIsDeptMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${!watch("department_id")
                                  ? "bg-blue-50 text-blue-700 font-bold"
                                  : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
                                  }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!watch("department_id") ? "bg-blue-100" : "bg-gray-100"}`}>
                                  <Users size={16} />
                                </div>
                                <div>
                                  <p className="text-sm">{t('members.form.noDept')}</p>
                                  <p className="text-[9px] opacity-70">{t('members.form.genCongregation')}</p>
                                </div>
                              </button>

                              <div className="h-px bg-gray-50 my-1 mx-2" />

                              {departments.length === 0 ? (
                                <div className="p-4 text-center">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t('members.form.noDeptsConfigured')}</p>
                                </div>
                              ) : (
                                departments.map((dept) => {
                                  const isSelected = watch("department_id") === dept.id;
                                  return (
                                    <button
                                      key={dept.id}
                                      type="button"
                                      onClick={() => {
                                        setValue("department_id", dept.id, { shouldDirty: true });
                                        setIsDeptMenuOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left mb-0.5 transition-all ${isSelected
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                                        : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                                        }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-white/20" : "bg-blue-50 text-blue-400"}`}>
                                        <Briefcase size={16} />
                                      </div>
                                      <span className="text-sm font-semibold">{dept.name}</span>
                                      {isSelected && <CheckCircle size={14} className="ml-auto" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t('members.form.dob')}</label>
                    <input type="date" {...register("dob")} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">{t('members.form.placeOfBirth')}</label>
                    <input {...register("place_of_birth")} className="form-input" placeholder={t('members.form.placeOfBirthPlaceholder')} />
                  </div>
                  <div>
                    <label className="form-label">{t('members.form.motherTongue')}</label>
                    <input {...register("mother_tongue")} className="form-input" placeholder={t('members.form.motherTonguePlaceholder')} />
                  </div>
                  <div>
                    <label className="form-label">{t('members.form.phoneNumber')}</label>
                    <input {...register("phone")} className="form-input" placeholder={t('members.form.phonePlaceholder')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">{t('login.email')} {promoteToServant && !isEditing && <span className="text-red-400">*</span>}</label>
                    <input type="email" {...register("email")} className="form-input" placeholder={t('members.form.emailPlaceholder')} />
                    {errors.email && <p className="form-error">{errors.email.message}</p>}
                  </div>
                  {promoteToServant && !isEditing && (
                    <div className="md:col-span-2">
                      <label className="form-label">{t('members.form.tempPassword')} <span className="text-red-400">*</span></label>
                      <input
                        type="password"
                        value={servantPassword}
                        onChange={(e) => setServantPassword(e.target.value)}
                        className="form-input"
                        placeholder={t('members.form.passwordTip')}
                      />
                      <div className="mt-2 text-xs text-gray-500 font-medium">{t('members.form.passwordNote')}</div>
                      {servantPassword && <PasswordStrengthMeter password={servantPassword} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 2. Spiritual Life ═══════════ */}
          <div ref={(el) => { sectionRefs.current['spiritual'] = el; }} id="spiritual" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Heart size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.spiritual')}</h2>
                  <p className="text-purple-100 text-xs font-medium">{t('login.description')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">{t('members.form.salvationInfo')}</label><input type="date" {...register("salvation_date")} className="form-input" /></div>
                  <div><label className="form-label">{t('members.form.placeOfBirth')}</label><input {...register("salvation_place")} className="form-input" placeholder={t('members.form.salvationPlacePlaceholder')} /></div>
                  <div className="md:col-span-2"><label className="form-label">{t('members.form.previousChurch')}</label><input {...register("previous_church")} className="form-input" placeholder={t('members.form.prevChurchPlaceholder')} /></div>
                  <div className="md:col-span-2"><label className="form-label">{t('members.form.reasonForComing')}</label><input {...register("reason_for_coming")} className="form-input" placeholder={t('members.form.reasonPlaceholder')} /></div>
                  <div className="md:col-span-2"><label className="form-label">{t('members.form.faith')}</label><textarea {...register("faith")} className="form-input !h-auto" rows={4} placeholder={t('members.form.faithPlaceholder')} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 3. Education & Work ═══════════ */}
          <div ref={(el) => { sectionRefs.current['education'] = el; }} id="education" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Briefcase size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.education')}</h2>
                  <p className="text-amber-100 text-xs font-medium">{t('dashboard.stats.activeMinistries')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">{t('members.form.fieldOfStudy')}</label><input {...register("field_of_study")} className="form-input" placeholder={t('members.form.fieldOfStudyPlaceholder')} /></div>
                  <div>
                    <label className="form-label">{t('members.form.educationalLevel')}</label>
                    <select {...register("educational_level")} className="form-select">
                      <option value="">{t('members.form.selectLevel')}</option>
                      <option value="High School">{t('members.form.highSchool')}</option>
                      <option value="Diploma">{t('members.form.diploma')}</option>
                      <option value="Bachelor's">{t('members.form.bachelors')}</option>
                      <option value="Master's">{t('members.form.masters')}</option>
                      <option value="PhD">{t('members.form.phd')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{t('members.form.employmentStatus')}</label>
                    <select {...register("employment_status")} className="form-select">
                      <option value="">{t('members.form.selectStatus')}</option>
                      <option value="Employed">{t('members.form.employed')}</option>
                      <option value="Self-Employed">{t('members.form.selfEmployed')}</option>
                      <option value="Unemployed">{t('members.form.unemployed')}</option>
                      <option value="Student">{t('members.form.student')}</option>
                      <option value="Retired">{t('members.form.retired')}</option>
                    </select>
                  </div>
                  <div><label className="form-label">{t('members.form.workplaceAddress')}</label><input {...register("workplace_address")} className="form-input" placeholder={t('members.form.workplacePlaceholder')} /></div>
                  <div>
                    <label className="form-label">{t('members.form.monthlyIncome')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-semibold">{t('members.form.currency')}</span>
                      <input type="number" {...register("income_amount")} className="form-input !pl-14" placeholder={t('members.form.incomePlaceholder')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 4. Family Status ═══════════ */}
          <div ref={(el) => { sectionRefs.current['family'] = el; }} id="family" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-rose-500 to-pink-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.family')}</h2>
                  <p className="text-rose-100 text-xs font-medium">{t('members.form.additionalFamilyInfo')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">{t('members.form.maritalStatus.status')}</label>
                    <select {...register("marital_status")} className="form-select">
                      <option value="Single">{t('members.form.maritalStatus.single')}</option>
                      <option value="Married">{t('members.form.maritalStatus.married')}</option>
                      <option value="Divorced">{t('members.form.maritalStatus.divorced')}</option>
                      <option value="Widowed">{t('members.form.maritalStatus.widowed')}</option>
                    </select>
                  </div>
                  {maritalStatus === "Single" && (
                    <div><label className="form-label">{t('members.form.livingSituation')}</label><input {...register("living_situation")} className="form-input" placeholder={t('members.form.livingSituationPlaceholder')} /></div>
                  )}
                  {maritalStatus === "Married" && (
                    <>
                      <div><label className="form-label">{t('members.form.spouseName')}</label><input {...register("spouse_name")} className="form-input" /></div>
                      <div><label className="form-label">{t('members.form.marriageInfo')}</label><input type="date" {...register("marriage_date")} className="form-input" /></div>
                      <div><label className="form-label">{t('members.form.placeOfBirth')}</label><input {...register("marriage_place")} className="form-input" /></div>
                    </>
                  )}
                </div>

                {/* Children section */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-base font-bold text-gray-800">{t('members.form.childrenInfo')}</h3>
                    <button type="button" onClick={() => append({ name: "", gender: "", age: "", education: "", faith: "" })}
                      className="text-sm bg-[#4B9BDC]/10 text-[#4B9BDC] px-4 py-2 rounded-xl hover:bg-[#4B9BDC]/20 font-semibold flex items-center gap-1.5 transition-colors">
                      <Plus size={16} /> {t('members.addChild')}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <motion.div key={field.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-xl relative border" style={d.emptyInner}>
                        <button type="button" onClick={() => remove(index)}
                          className="absolute -top-2 -right-2 bg-white text-red-400 p-1.5 rounded-full shadow-sm hover:bg-red-50 border border-gray-200 transition-colors">
                          <X size={12} />
                        </button>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <input {...register(`children.${index}.name`)} className="form-input" placeholder={t('members.form.fullName')} />
                          <select {...register(`children.${index}.gender`)} className="form-select">
                            <option value="">{t('common.gender.label')}</option>
                            <option value="Male">{t('common.gender.male')}</option>
                            <option value="Female">{t('common.gender.female')}</option>
                          </select>
                          <input {...register(`children.${index}.age`)} className="form-input" placeholder={t('members.form.age')} />
                          <input {...register(`children.${index}.education`)} className="form-input" placeholder={t('members.form.educationalLevel')} />
                          <input {...register(`children.${index}.faith`)} className="form-input" placeholder={t('members.form.faith')} />
                        </div>
                      </motion.div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-8 bg-gray-50/60 rounded-xl border-2 border-dashed border-gray-200">
                        <Users size={24} className="text-gray-500 dark:text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('members.noResults')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 5. Service History ═══════════ */}
          <div ref={(el) => { sectionRefs.current['service'] = el; }} id="service" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-teal-500 to-emerald-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BookOpen size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.service')}</h2>
                  <p className="text-teal-100 text-xs font-medium">{t('dashboard.stats.servingLeaders')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">{t('members.form.serviceType')}</label><input {...register("service_type")} className="form-input" placeholder={t('members.form.serviceTypePlaceholder')} /></div>
                  <div><label className="form-label">{t('members.form.serviceDuration')}</label><input {...register("service_duration")} className="form-input" placeholder={t('members.form.serviceDurationPlaceholder')} /></div>
                  <div><label className="form-label">{t('members.form.serviceResponsibility')}</label><input {...register("service_responsibility")} className="form-input" placeholder={t('members.form.serviceResponsibilityPlaceholder')} /></div>
                  <div><label className="form-label">{t('members.form.currentServiceInfo')}</label><input {...register("current_service")} className="form-input" placeholder={t('members.form.currentServicePlaceholder')} /></div>
                  <div className="md:col-span-2"><label className="form-label">{t('members.form.spiritualGiftInfo')}</label><input {...register("spiritual_gift")} className="form-input" placeholder={t('members.form.spiritualGiftPlaceholder')} /></div>
                  <div className="md:col-span-2"><label className="form-label">{t('members.form.futureService')}</label><textarea {...register("future_service")} className="form-input !h-auto" rows={3} placeholder={t('members.form.futureServicePlaceholder')} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 6. Fellowship ═══════════ */}
          <div ref={(el) => { sectionRefs.current['fellowship'] = el; }} id="fellowship" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-indigo-500 to-blue-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Globe size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.fellowship')}</h2>
                  <p className="text-indigo-100 text-xs font-medium">{t('members.form.additionalFellowshipInfo')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">{t('members.form.fellowshipStartTime')}</label><input type="date" {...register("fellowship_start_date")} className="form-input" /></div>
                  <div><label className="form-label">{t('members.form.fellowshipName')}</label><input {...register("fellowship_name")} className="form-input" /></div>
                  <div><label className="form-label">{t('members.form.fellowshipResponsibility')}</label><input {...register("fellowship_responsibility")} className="form-input" /></div>
                  <div><label className="form-label">{t('members.form.fellowshipMemberType')}</label><input {...register("fellowship_leader")} className="form-input" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 7. Review & Sign ═══════════ */}
          <div ref={(el) => { sectionRefs.current['signatures'] = el; }} id="signatures" className="scroll-mt-28">
            <div className="backdrop-blur-xl rounded-[1.5rem] border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden" style={d.card}>
              <div className="bg-gradient-to-r from-slate-600 to-slate-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <CheckCircle size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('members.form.sections.signatures')}</h2>
                  <p className="text-slate-200 text-xs font-medium">{t('members.form.memberSignature')}</p>
                </div>
              </div>
              <div className="p-8">
                <div className="p-5 rounded-xl mb-6 text-blue-700 dark:text-blue-300 text-sm font-medium border flex items-start gap-3" style={d.emptyInner}>
                  <FileText size={20} className="shrink-0 mt-0.5" />
                  <p>{t('members.form.reviewMsg')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">{t('members.form.memberSignature')}</label>
                    <input {...register("member_signature")} className="form-input italic" placeholder={t('members.form.memberSignature')} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{t('members.form.memberSignature')}</p>
                  </div>
                  <div>
                    <label className="form-label">{t('dashboard.stats.total')}</label>
                    <input type="date" {...register("form_filled_date")} className="form-input" />
                  </div>
                </div>

                {/* Final CTA */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={uploading || (isEditing ? (!isDirty && !(watch("photo") instanceof File)) : !watch("full_name"))}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] font-bold text-lg shadow-[0_8px_30px_rgba(75,155,220,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={22} /> : <CheckCircle size={22} />}
                    {isEditing ? t('members.editBtn') : t('members.addBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ MAKE SERVANT MODAL ═══════════════ */}
      <AnimatePresence>
        {isMakeServantModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={d.modalOverlay}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md p-8 relative overflow-hidden rounded-[2rem] shadow-2xl"
              style={d.modalContent}
            >
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: 'linear-gradient(90deg, #3178B5, #4B9BDC, #7EC8F2)' }}></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('servants.changeRole')}</h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{t('servants.messages.selectMember')} {watch("full_name")}</p>
                </div>
                <button
                  onClick={() => setIsMakeServantModalOpen(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {!watch("email") ? (
                <div className="p-4 rounded-xl border text-sm font-semibold flex gap-3" style={d.emptyInner}>
                  <Shield className="shrink-0 mt-0.5" size={18} style={{ color: '#ef4444' }} />
                  <p className="text-red-600 dark:text-red-400">{t('members.form.noEmailError')}</p>
                </div>
              ) : (
                <form onSubmit={handleMakeServant} className="space-y-5">
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-300 font-medium mb-4">
                    Creating an account for <strong>{watch("email")}</strong>. They will use this email and the password below to log in as a servant.
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t('members.form.tempPassword')}</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B9BDC]">
                        <Shield size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        value={servantPassword}
                        onChange={(e) => setServantPassword(e.target.value)}
                        className="w-full pl-12 pr-5 py-3.5 border-0 rounded-2xl focus:outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                        style={{ background: '#f8fafc', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)' }}
                        placeholder={t('members.form.passwordTip')}
                      />
                    </div>
                    {/* Reusing existing PasswordStrengthMeter if it is imported */}
                    <PasswordStrengthMeter password={servantPassword} />
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsMakeServantModalOpen(false)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={makingServant || !servantPassword || servantPassword.length < 6}
                      className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#4B9BDC] to-[#7EC8F2] shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                      {makingServant ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                      {t('common.confirm')}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
