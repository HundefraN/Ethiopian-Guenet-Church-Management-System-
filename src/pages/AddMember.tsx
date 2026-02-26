import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  User, Calendar, MapPin, Briefcase, Phone, Mail, Heart,
  BookOpen, Users, Save, ArrowLeft, Upload, X, CheckCircle, Globe,
  Plus, Trash2, FileText, DollarSign, ChevronRight, Loader2
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { logActivity } from "../utils/activityLogger";

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
});

export type MemberFormValues = z.infer<typeof memberSchema>;

const SECTIONS = [
  { id: 'personal', title: 'Personal Info', icon: User, color: 'from-blue-500 to-cyan-400' },
  { id: 'spiritual', title: 'Spiritual Life', icon: Heart, color: 'from-purple-500 to-pink-400' },
  { id: 'education', title: 'Education & Work', icon: Briefcase, color: 'from-amber-500 to-orange-400' },
  { id: 'family', title: 'Family Status', icon: Users, color: 'from-rose-500 to-pink-400' },
  { id: 'service', title: 'Service History', icon: BookOpen, color: 'from-teal-500 to-emerald-400' },
  { id: 'fellowship', title: 'Fellowship', icon: Globe, color: 'from-indigo-500 to-blue-400' },
  { id: 'signatures', title: 'Review & Sign', icon: CheckCircle, color: 'from-slate-600 to-slate-400' },
];

export default function AddMember() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [activeSection, setActiveSection] = useState('personal');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
    if (profile?.role === "super_admin" && isEditing) {
      toast.error("Super Admins cannot edit member data.");
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
              acc[key] = data[key] === null ? "" : data[key];
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
          toast.error("Failed to load member details");
          navigate("/members");
        } finally { setLoadingMember(false); }
      };
      fetchMember();
    } else {
      const draft = localStorage.getItem("member_draft");
      if (draft) {
        try { const parsed = JSON.parse(draft); reset(parsed); toast.success("Draft restored"); }
        catch (e) { console.error("Failed to parse draft", e); }
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
    toast.success("Draft saved successfully");
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error("Please upload an image file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setValue("photo", file);
  };

  const onSubmit = async (data: MemberFormValues) => {
    const loadingToast = toast.loading(isEditing ? "Updating member..." : "Registering member...");
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
        department_id: profile?.department_id || null,
        income_amount: data.income_amount && !isNaN(parseFloat(data.income_amount)) ? parseFloat(data.income_amount) : null,
        dob: data.dob || null, salvation_date: data.salvation_date || null,
        marriage_date: data.marriage_date || null, fellowship_start_date: data.fellowship_start_date || null,
        form_filled_date: data.form_filled_date || null,
      };

      if (isEditing && id) {
        const { error } = await supabase.from("members").update(payload).eq("id", id);
        if (error) throw error;

        // Log with changes if we have initial data
        await logActivity(
          "UPDATE",
          "MEMBER",
          `Updated member ${data.full_name}`,
          id,
          initialData ? { old: initialData, new: payload } : payload
        );

        toast.success("Member updated successfully!", { id: loadingToast });
      } else {
        const { data: newMember, error } = await supabase.from("members").insert([payload]).select().single();
        if (error) throw error;
        await logActivity("CREATE", "MEMBER", `Added new member ${data.full_name}`, newMember.id, payload);
        toast.success("Member registered successfully!", { id: loadingToast });
        localStorage.removeItem("member_draft");
      }
      navigate("/members");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save member", { id: loadingToast });
    } finally { setUploading(false); }
  };

  if (loadingMember) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#4B9BDC] h-12 w-12 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading member details...</p>
        </div>
      </div>
    );
  }

  const maritalStatus = watch("marital_status");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pb-20"
    >
      {/* Floating Header */}
      <div className="sticky top-0 z-40 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-all hover:scale-105 active:scale-95">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{isEditing ? "Edit Member" : "New Member Registration"}</h1>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Fill in the sections below to complete registration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isEditing && (
                <button onClick={saveDraft} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#4B9BDC] font-semibold transition-colors bg-gray-50 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-gray-100">
                  <Save size={16} /> Save Draft
                </button>
              )}
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={uploading || (isEditing && !isDirty)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#4B9BDC] to-[#38bdf8] text-white rounded-xl hover:scale-105 active:scale-95 font-bold shadow-[0_4px_16px_rgba(75,155,220,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                <span>{isEditing ? "Update" : "Register"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-300 group ${isActive
                      ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100/80 scale-[1.02]'
                      : 'hover:bg-white/50'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive
                      ? `bg-gradient-to-br ${section.color} text-white shadow-md`
                      : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                      }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold block truncate transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                        {section.title}
                      </span>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-[#4B9BDC]' : 'text-gray-300'}`}>
                        Step {index + 1} of {SECTIONS.length}
                      </span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="w-1.5 h-8 bg-gradient-to-b from-[#4B9BDC] to-[#38bdf8] rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Progress */}
            <div className="mt-6 px-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400 font-medium">Progress</span>
                <span className="text-[#4B9BDC] font-bold">
                  {Math.round(((SECTIONS.findIndex(s => s.id === activeSection) + 1) / SECTIONS.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#4B9BDC] to-[#38bdf8] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((SECTIONS.findIndex(s => s.id === activeSection) + 1) / SECTIONS.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 min-w-0 space-y-6" ref={scrollContainerRef}>

          {/* ═══════════ 1. Personal Information ═══════════ */}
          <div ref={(el) => { sectionRefs.current['personal'] = el; }} id="personal" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <User size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Personal Information</h2>
                  <p className="text-blue-100 text-xs font-medium">Basic details about the member</p>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-center mb-8">
                  <div className="relative group">
                    <div className={`w-28 h-28 rounded-2xl overflow-hidden border-[3px] border-white shadow-lg transition-transform group-hover:scale-105 ${!photoPreview && 'bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center'}`}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload size={28} className="text-gray-300" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#4B9BDC] to-[#38bdf8] text-white p-2 rounded-xl cursor-pointer hover:scale-110 shadow-lg transition-transform">
                      <Plus size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="form-label">Full Name <span className="text-red-400">*</span></label>
                    <input {...register("full_name")} className="form-input" placeholder="e.g. Abebe Kebede" />
                    {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" {...register("dob")} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Place of Birth</label>
                    <input {...register("place_of_birth")} className="form-input" placeholder="City, Region" />
                  </div>
                  <div>
                    <label className="form-label">Mother Tongue</label>
                    <input {...register("mother_tongue")} className="form-input" placeholder="e.g. Amharic" />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input {...register("phone")} className="form-input" placeholder="+251..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Email Address</label>
                    <input type="email" {...register("email")} className="form-input" placeholder="member@example.com" />
                    {errors.email && <p className="form-error">{errors.email.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 2. Spiritual Life ═══════════ */}
          <div ref={(el) => { sectionRefs.current['spiritual'] = el; }} id="spiritual" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Heart size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Spiritual Life</h2>
                  <p className="text-purple-100 text-xs font-medium">Faith journey and background</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">Date of Salvation</label><input type="date" {...register("salvation_date")} className="form-input" /></div>
                  <div><label className="form-label">Place of Salvation</label><input {...register("salvation_place")} className="form-input" placeholder="City/Church" /></div>
                  <div className="md:col-span-2"><label className="form-label">Previous Church</label><input {...register("previous_church")} className="form-input" placeholder="Name of previous church" /></div>
                  <div className="md:col-span-2"><label className="form-label">Reason for Coming</label><input {...register("reason_for_coming")} className="form-input" placeholder="e.g. Transfer, New Believer" /></div>
                  <div className="md:col-span-2"><label className="form-label">Faith Declaration</label><textarea {...register("faith")} className="form-input !h-auto" rows={4} placeholder="Brief statement of faith..." /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 3. Education & Work ═══════════ */}
          <div ref={(el) => { sectionRefs.current['education'] = el; }} id="education" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Briefcase size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Education & Work</h2>
                  <p className="text-amber-100 text-xs font-medium">Academic and professional background</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">Field of Study</label><input {...register("field_of_study")} className="form-input" placeholder="e.g. Engineering" /></div>
                  <div>
                    <label className="form-label">Educational Level</label>
                    <select {...register("educational_level")} className="form-select">
                      <option value="">Select Level</option>
                      <option value="High School">High School</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's">Bachelor's Degree</option>
                      <option value="Master's">Master's Degree</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Employment Status</label>
                    <select {...register("employment_status")} className="form-select">
                      <option value="">Select Status</option>
                      <option value="Employed">Employed</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Student">Student</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                  <div><label className="form-label">Workplace Address</label><input {...register("workplace_address")} className="form-input" placeholder="Company/Organization" /></div>
                  <div>
                    <label className="form-label">Monthly Income</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">ETB</span>
                      <input type="number" {...register("income_amount")} className="form-input !pl-14" placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 4. Family Status ═══════════ */}
          <div ref={(el) => { sectionRefs.current['family'] = el; }} id="family" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-pink-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Family Status</h2>
                  <p className="text-rose-100 text-xs font-medium">Marital and family details</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Marital Status</label>
                    <select {...register("marital_status")} className="form-select">
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  {maritalStatus === "Married" && (
                    <>
                      <div><label className="form-label">Spouse Name</label><input {...register("spouse_name")} className="form-input" /></div>
                      <div><label className="form-label">Marriage Date</label><input type="date" {...register("marriage_date")} className="form-input" /></div>
                      <div><label className="form-label">Marriage Place</label><input {...register("marriage_place")} className="form-input" /></div>
                    </>
                  )}
                </div>

                {/* Children section */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-base font-bold text-gray-800">Children</h3>
                    <button type="button" onClick={() => append({ name: "", gender: "", age: "", education: "", faith: "" })}
                      className="text-sm bg-[#4B9BDC]/10 text-[#4B9BDC] px-4 py-2 rounded-xl hover:bg-[#4B9BDC]/20 font-semibold flex items-center gap-1.5 transition-colors">
                      <Plus size={16} /> Add Child
                    </button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <motion.div key={field.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50/80 p-5 rounded-xl relative border border-gray-100">
                        <button type="button" onClick={() => remove(index)}
                          className="absolute -top-2 -right-2 bg-white text-red-400 p-1.5 rounded-full shadow-sm hover:bg-red-50 border border-gray-200 transition-colors">
                          <X size={12} />
                        </button>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <input {...register(`children.${index}.name`)} className="form-input" placeholder="Name" />
                          <select {...register(`children.${index}.gender`)} className="form-select">
                            <option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option>
                          </select>
                          <input {...register(`children.${index}.age`)} className="form-input" placeholder="Age" />
                          <input {...register(`children.${index}.education`)} className="form-input" placeholder="Education" />
                          <input {...register(`children.${index}.faith`)} className="form-input" placeholder="Faith" />
                        </div>
                      </motion.div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-8 bg-gray-50/60 rounded-xl border-2 border-dashed border-gray-200">
                        <Users size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No children added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 5. Service History ═══════════ */}
          <div ref={(el) => { sectionRefs.current['service'] = el; }} id="service" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BookOpen size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Service History</h2>
                  <p className="text-teal-100 text-xs font-medium">Ministry involvement and gifts</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">Service Type</label><input {...register("service_type")} className="form-input" placeholder="e.g. Choir, Usher" /></div>
                  <div><label className="form-label">Duration</label><input {...register("service_duration")} className="form-input" placeholder="e.g. 2 years" /></div>
                  <div><label className="form-label">Responsibility</label><input {...register("service_responsibility")} className="form-input" placeholder="Role/Position" /></div>
                  <div><label className="form-label">Current Service</label><input {...register("current_service")} className="form-input" placeholder="Current ministry" /></div>
                  <div className="md:col-span-2"><label className="form-label">Spiritual Gift</label><input {...register("spiritual_gift")} className="form-input" placeholder="e.g. Teaching, Mercy" /></div>
                  <div className="md:col-span-2"><label className="form-label">Desired Future Service</label><textarea {...register("future_service")} className="form-input !h-auto" rows={3} placeholder="What area would you like to serve in?" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 6. Fellowship ═══════════ */}
          <div ref={(el) => { sectionRefs.current['fellowship'] = el; }} id="fellowship" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Globe size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Family Fellowship</h2>
                  <p className="text-indigo-100 text-xs font-medium">Fellowship group details</p>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="form-label">Start Date</label><input type="date" {...register("fellowship_start_date")} className="form-input" /></div>
                  <div><label className="form-label">Fellowship Name</label><input {...register("fellowship_name")} className="form-input" /></div>
                  <div><label className="form-label">Responsibility</label><input {...register("fellowship_responsibility")} className="form-input" /></div>
                  <div><label className="form-label">Leader</label><input {...register("fellowship_leader")} className="form-input" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ 7. Review & Sign ═══════════ */}
          <div ref={(el) => { sectionRefs.current['signatures'] = el; }} id="signatures" className="scroll-mt-28">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-400 px-8 py-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <CheckCircle size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Review & Sign</h2>
                  <p className="text-slate-200 text-xs font-medium">Confirm and submit</p>
                </div>
              </div>
              <div className="p-8">
                <div className="bg-blue-50/80 p-5 rounded-xl mb-6 text-blue-700 text-sm font-medium border border-blue-100/80 flex items-start gap-3">
                  <FileText size={20} className="shrink-0 mt-0.5" />
                  <p>Please review all information before signing. By signing below, you confirm that all details provided are accurate.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Member Signature</label>
                    <input {...register("member_signature")} className="form-input italic" placeholder="Type full name to sign" />
                    <p className="text-xs text-gray-400 mt-1.5 font-medium">This acts as your digital signature</p>
                  </div>
                  <div>
                    <label className="form-label">Date</label>
                    <input type="date" {...register("form_filled_date")} className="form-input" />
                  </div>
                </div>

                {/* Final CTA */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={uploading || (isEditing && !isDirty)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#4B9BDC] to-[#38bdf8] text-white rounded-2xl hover:scale-[1.02] active:scale-[0.98] font-bold text-lg shadow-[0_8px_30px_rgba(75,155,220,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={22} /> : <CheckCircle size={22} />}
                    {isEditing ? "Update Member Record" : "Complete Registration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav for section quick jump */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button key={section.id} onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-[#4B9BDC] text-white' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                <Icon size={14} />
                {section.title}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
