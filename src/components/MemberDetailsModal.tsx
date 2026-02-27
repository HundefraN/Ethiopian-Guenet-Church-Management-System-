import React from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  Heart,
  Briefcase,
  Users,
  BookOpen,
  FileText,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Building,
  Shield,
  ExternalLink,
  Map,
} from "lucide-react";
import { Member } from "../types";

interface MemberDetailsModalProps {
  member: any; // Allow for joined data
  onClose: () => void;
}

export default function MemberDetailsModal({
  member,
  onClose,
}: MemberDetailsModalProps) {
  if (!member) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-3 mb-5 border-b border-gray-100/50 pb-3">
      <div className="p-2 bg-gradient-to-br from-[#4B9BDC]/20 to-[#4B9BDC]/5 rounded-xl text-[#4B9BDC] shadow-inner">
        <Icon size={18} />
      </div>
      <h3 className="font-bold text-gray-800 tracking-tight">{title}</h3>
    </div>
  );

  const InfoItem = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value?: string | number | null;
    icon?: any;
  }) => {
    if (!value) return null;
    return (
      <div className="mb-4 group">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
          {label}
        </span>
        <div className="flex items-start gap-2 text-sm text-gray-700 font-semibold group-hover:text-[#4B9BDC] transition-colors">
          {Icon && <Icon size={16} className="mt-0.5 text-gray-400 shrink-0 group-hover:text-[#4B9BDC] transition-colors" />}
          <span>{value}</span>
        </div>
      </div>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-white/10 backdrop-blur-2xl"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden"
      >
        {/* Header - Glassmorphic floating */}
        <div className="relative px-8 py-6 flex items-start justify-between bg-gradient-to-r from-gray-50/80 to-white/80 border-b border-gray-100/50 backdrop-blur-xl z-20">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-[#4B9BDC]/10 blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-5 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4B9BDC] to-[#7EC8F2] rounded-2xl blur opacity-30"></div>
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4B9BDC]/10 to-[#7EC8F2]/10 text-[#4B9BDC] flex items-center justify-center text-3xl font-black uppercase ring-2 ring-white shadow-xl overflow-hidden border border-[#4B9BDC]/20">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.full_name.charAt(0)
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 drop-shadow-sm mb-1">
                {member.full_name}
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${member.status === "Active"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : member.status === "Death"
                      ? "bg-gray-50 text-gray-600 border-gray-200"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}
                >
                  {member.status || "Active"}
                </span>
                <span className="text-gray-400 font-medium text-xs flex items-center gap-1">
                  <Calendar size={12} />
                  Joined {formatDate(member.form_filled_date)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-3 bg-white hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all shadow-sm border border-gray-100 hover:scale-105 active:scale-95 z-10"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-gray-50/30">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Personal Info */}
            <motion.div variants={cardVariants} className="col-span-1 lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all">
              <SectionHeader icon={User} title="Personal Information" />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                <InfoItem label="Date of Birth" value={formatDate(member.dob)} icon={Calendar} />
                <InfoItem label="Place of Birth" value={member.place_of_birth} icon={MapPin} />
                <InfoItem label="Mother Tongue" value={member.mother_tongue} icon={Globe} />
                <InfoItem label="Phone" value={member.phone} icon={Phone} />
                <InfoItem label="Email" value={member.email} icon={Mail} />
              </div>
            </motion.div>

            {/* Spiritual Life & Church Details */}
            <motion.div variants={cardVariants} className="col-span-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all">
              <SectionHeader icon={Heart} title="Spiritual Life" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <InfoItem label="Branch" value={member.churches?.name} icon={Building} />
                  {member.churches?.map_link && (
                    <a
                      href={member.churches.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50"
                      title="View on Map"
                    >
                      <Map size={14} />
                      <span className="hidden sm:inline">Map</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <InfoItem label="Department" value={member.departments?.name} icon={Shield} />
                <div className="h-px bg-gray-50 my-2"></div>
                <InfoItem label="Salvation Date" value={formatDate(member.salvation_date)} icon={Calendar} />
                <InfoItem label="Salvation Place" value={member.salvation_place} icon={MapPin} />
                <InfoItem label="Previous Church" value={member.previous_church} />
                <InfoItem label="Faith Background" value={member.faith} />
                <InfoItem label="Reason for Joining" value={member.reason_for_coming} />
              </div>
            </motion.div>

            {/* Education & Work */}
            <motion.div variants={cardVariants} className="col-span-1 lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all">
              <SectionHeader icon={Briefcase} title="Education & Work" />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                <InfoItem label="Education Level" value={member.educational_level} />
                <InfoItem label="Field of Study" value={member.field_of_study} />
                <InfoItem label="Employment Status" value={member.employment_status} />
                <InfoItem label="Monthly Income" value={member.income_amount ? `${member.income_amount}` : null} icon={DollarSign} />
                <div className="col-span-2">
                  <InfoItem label="Workplace Address" value={member.workplace_address} icon={MapPin} />
                </div>
              </div>
            </motion.div>

            {/* Family Details */}
            <motion.div variants={cardVariants} className="col-span-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all row-span-2">
              <SectionHeader icon={Users} title="Family Details" />
              <div className="flex flex-col gap-2">
                <InfoItem label="Marital Status" value={member.marital_status} />
                {member.marital_status === "Married" && (
                  <div className="bg-gray-50 p-4 rounded-2xl mb-2 border border-blue-50">
                    <InfoItem label="Spouse Name" value={member.spouse_name} />
                    <InfoItem label="Marriage Date" value={formatDate(member.marriage_date)} icon={Calendar} />
                    <InfoItem label="Marriage Place" value={member.marriage_place} icon={MapPin} />
                  </div>
                )}
                <InfoItem label="Living Situation" value={member.living_situation} />

                {member.children && Array.isArray(member.children) && member.children.length > 0 && (
                  <div className="mt-4 bg-[#4B9BDC]/5 p-4 rounded-2xl border border-[#4B9BDC]/10">
                    <span className="text-[11px] font-bold text-[#4B9BDC] uppercase tracking-wider block mb-3">
                      Children ({member.children.length})
                    </span>
                    <div className="space-y-3">
                      {member.children.map((child: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
                          <span className="font-bold text-gray-800 text-sm">{child.name}</span>
                          <span className="text-gray-500 text-xs font-medium bg-gray-50 px-2 py-1 rounded-md">
                            {child.gender} • {child.age}y
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {member.additional_family_info && (
                  <div className="mt-4">
                    <InfoItem label="Additional Family Info" value={member.additional_family_info} />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Service History */}
            <motion.div variants={cardVariants} className="col-span-1 lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all">
              <SectionHeader icon={BookOpen} title="Church Service" />
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <InfoItem label="Service Type" value={member.service_type} />
                <InfoItem label="Duration" value={member.service_duration} />
                <InfoItem label="Current Service" value={member.current_service} />
                <InfoItem label="Spiritual Gift" value={member.spiritual_gift} />
                <InfoItem label="Future Interest" value={member.future_service} />
              </div>
              {member.additional_service_info && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <InfoItem label="Additional Info" value={member.additional_service_info} />
                </div>
              )}
            </motion.div>

            {/* Fellowship */}
            <motion.div variants={cardVariants} className="col-span-1 lg:col-span-3 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(75,155,220,0.08)] transition-all">
              <SectionHeader icon={Users} title="Family Fellowship" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="Fellowship Name" value={member.fellowship_name} />
                <InfoItem label="Role" value={member.fellowship_responsibility} />
                <InfoItem label="Start Date" value={formatDate(member.fellowship_start_date)} icon={Calendar} />
                <InfoItem label="Mentor" value={member.fellowship_mentor} />
                <InfoItem label="Leader" value={member.fellowship_leader} />
              </div>
            </motion.div>

            {/* Signatures */}
            <motion.div variants={cardVariants} className="col-span-1 lg:col-span-3 bg-gradient-to-r from-gray-50 to-[#4B9BDC]/5 rounded-3xl p-6 border border-gray-200">
              <SectionHeader icon={FileText} title="Signatures & Verification" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Member</span>
                  <span className="font-semibold text-gray-800 font-handwriting">{member.member_signature || "Pending"}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fellowship Leader</span>
                  <span className="font-semibold text-gray-800">{member.fellowship_leader_signature || "Pending"}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Zone Rep</span>
                  <span className="font-semibold text-gray-800">{member.zone_rep_signature || "Pending"}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sector Rep</span>
                  <span className="font-semibold text-gray-800">{member.middle_sector_rep_signature || "Pending"}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100/50 bg-white/80 backdrop-blur-md flex justify-end z-10 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-[#4B9BDC] to-[#3a85c2] text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(75,155,220,0.3)] hover:shadow-[0_12px_25px_rgba(75,155,220,0.4)] transition-all"
          >
            Done Viewing
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
