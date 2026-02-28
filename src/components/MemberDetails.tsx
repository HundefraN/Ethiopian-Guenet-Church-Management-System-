import React, { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
  User,
  Heart,
  Briefcase,
  Shield,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Globe,
  Building,
  ExternalLink,
  Map,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { formatDisplayDate } from "../utils/dateFormatter";
import { getMemberColors } from "../utils/memberColors";
import { useTheme } from "../context/ThemeContext";

interface MemberDetailsProps {
  member: any; // Allow for joined data
}

export default function MemberDetails({ member }: MemberDetailsProps) {
  const { calendarType } = useAuth();
  const { t, language } = useLanguage();
  const { isDark } = useTheme();

  const colors = useMemo(() => getMemberColors(member?.full_name || ""), [member?.full_name]);

  if (!member) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>{t('common.noMemberFound')}</p>
      </div>
    )
  }

  const formatDate = (dateString?: string) => {
    return formatDisplayDate(dateString, calendarType, language);
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-3 mb-5 border-b border-gray-100/50 dark:border-gray-800/50 pb-3">
      <div className="p-2 rounded-xl shadow-inner transition-colors duration-300"
        style={{
          background: isDark ? colors.light : colors.bg,
          color: colors.accent
        }}
      >
        <Icon size={18} />
      </div>
      <h3 className="font-bold text-gray-800 dark:text-gray-200 tracking-tight">{title}</h3>
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
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
          {label}
        </span>
        <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-400 font-semibold transition-colors">
          {Icon && <Icon size={16} className="mt-0.5 text-gray-500 dark:text-gray-400 shrink-0 transition-colors"
            onMouseEnter={(e: any) => e.target.style.color = colors.accent}
            onMouseLeave={(e: any) => e.target.style.color = ''}
          />}
          <span className="group-hover:text-current group-hover:opacity-80 transition-colors" style={{ color: 'inherit' }}
            onMouseEnter={(e: any) => e.target.style.color = colors.accent}
            onMouseLeave={(e: any) => e.target.style.color = ''}
          >{value}</span>
        </div>
      </div>
    );
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const cardVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Info */}
      <div className="relative mb-6 md:mb-8">
        <div className="flex items-center gap-4 md:gap-5 z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur opacity-30 transition-colors duration-300" style={{ background: colors.accent }}></div>
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black uppercase ring-2 ring-white shadow-xl overflow-hidden border border-white/20 transition-all duration-300"
              style={{ background: isDark ? colors.light : colors.bg, color: colors.accent }}
            >
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`, color: 'white' }}>
                  {member.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 drop-shadow-sm mb-1">
              {member.full_name}
            </h2>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <span
                className={`px-2 py-0.5 md:px-3 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wide border ${member.status === "Active"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30"
                  : member.status === "Death"
                    ? "bg-gray-50 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700/30"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30"
                  }`}
              >
                {member.status ? t(`dashboard.analytics.status${member.status}`) : t('dashboard.analytics.statusActive')}
              </span>
              <span className="text-gray-500 dark:text-gray-400 font-medium text-[10px] md:text-xs flex items-center gap-1">
                <Calendar size={12} />
                {t('common.joined')} {formatDate(member.form_filled_date)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 md:gap-6"
      >
        {/* Personal Info */}
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
          onMouseEnter={(e: any) => e.currentTarget.style.boxShadow = `0 8px 30px ${colors.border}`}
          onMouseLeave={(e: any) => e.currentTarget.style.boxShadow = ''}
        >
          <SectionHeader icon={User} title={t('members.form.sections.personal')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 md:gap-y-4 gap-x-6">
            <InfoItem label={t('members.form.dob')} value={formatDate(member.dob)} icon={Calendar} />
            <InfoItem label={t('members.form.placeOfBirth')} value={member.place_of_birth} icon={MapPin} />
            <InfoItem label={t('members.form.motherTongue')} value={member.mother_tongue} icon={Globe} />
            <InfoItem label={t('members.form.phoneNumber')} value={member.phone} icon={Phone} />
            <InfoItem label={t('login.email')} value={member.email} icon={Mail} />
          </div>
        </motion.div>

        {/* Spiritual Life & Church Details */}
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
          onMouseEnter={(e: any) => e.currentTarget.style.boxShadow = `0 8px 30px ${colors.border}`}
          onMouseLeave={(e: any) => e.currentTarget.style.boxShadow = ''}
        >
          <SectionHeader icon={Heart} title={t('members.form.sections.spiritual')} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <InfoItem label={t('common.roleModal.churchAssignment')} value={member.churches?.name} icon={Building} />
              {member.churches?.map_link && (
                <a
                  href={member.churches.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50"
                  title={t('churches.details.viewOnMap')}
                >
                  <Map size={14} />
                  <span className="hidden sm:inline">{t('common.map')}</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            <InfoItem label={t('common.roleModal.deptAssignment')} value={member.departments?.name} icon={Shield} />
            <div className="h-px bg-gray-50 my-2"></div>

            {/* Additional spiritual info fields can go here */}
            <InfoItem label={t('members.form.salvationInfo')} value={formatDate(member.salvation_date)} icon={Calendar} />
          </div>
        </motion.div>

        {/* Education & Work */}
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
          onMouseEnter={(e: any) => e.currentTarget.style.boxShadow = `0 8px 30px ${colors.border}`}
          onMouseLeave={(e: any) => e.currentTarget.style.boxShadow = ''}
        >
          <SectionHeader icon={Briefcase} title={t('members.form.sections.education')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 md:gap-y-4 gap-x-6">
            <InfoItem label={t('members.form.educationalLevel')} value={member.education_level} />
            <InfoItem label={t('members.form.fieldOfStudy')} value={member.field_of_study} />
            <InfoItem label={t('members.form.employmentStatus')} value={member.employment_status} />
            <InfoItem label={t('members.form.workplaceAddress')} value={member.employer} />
          </div>
        </motion.div>

      </motion.div>
    </div >
  );
}
