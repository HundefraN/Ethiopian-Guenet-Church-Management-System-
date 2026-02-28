import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Shield,
    Building,
    Mail,
    Phone,
    User,
    Loader2,
    Search,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { getDeptColors } from "../utils/departmentColors";
import { useTheme } from "../context/ThemeContext";

interface DepartmentDetailsProps {
    department: any;
}

interface CombinedMember {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    type: "Member" | "Servant" | "Pastor";
    avatar_url?: string | null;
}

export default function DepartmentDetails({ department }: DepartmentDetailsProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<CombinedMember[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const colors = useMemo(() => getDeptColors(department?.name || ""), [department?.name]);

    useEffect(() => {
        if (department) {
            fetchDepartmentMembers();
        } else {
            setMembers([]);
        }
    }, [department]);

    const fetchDepartmentMembers = async () => {
        if (!department?.id) return;

        try {
            setLoading(true);

            // 1. Fetch regular members
            const { data: regularMembers, error: membersError } = await supabase
                .from("members")
                .select("id, full_name, email, phone, photo")
                .eq("department_id", department.id);

            if (membersError) throw membersError;

            // 2. Fetch profiles (pastors/servants) via profile_departments
            const { data: profileDepts, error: profileError } = await supabase
                .from("profile_departments")
                .select(`
          profiles (
            id,
            full_name,
            role,
            avatar_url
          )
        `)
                .eq("department_id", department.id);

            if (profileError) throw profileError;

            const combined: CombinedMember[] = [
                ...(regularMembers?.map(m => ({
                    id: m.id,
                    full_name: m.full_name,
                    email: m.email,
                    phone: m.phone,
                    type: "Member" as const,
                    avatar_url: m.photo
                })) || []),
                ...(profileDepts?.map((pd: any) => ({
                    id: pd.profiles.id,
                    full_name: pd.profiles.full_name,
                    email: null,
                    phone: null,
                    type: pd.profiles.role === "pastor" ? ("Pastor" as const) : ("Servant" as const),
                    avatar_url: pd.profiles.avatar_url,
                    role: pd.profiles.role
                })) || [])
            ];

            // Filter out other servants if the viewer is a servant
            let filteredCombined = combined;
            if (profile?.role === "servant") {
                filteredCombined = combined.filter(m => m.type !== "Servant" || m.id === profile.id);
            }

            // Sort by name
            filteredCombined.sort((a, b) => a.full_name.localeCompare(b.full_name));

            setMembers(filteredCombined);
        } catch (error) {
            console.error("Error fetching department members:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!department) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>{t('departments.details.selectPrompt')}</p>
            </div>
        );
    }

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-300"
                        style={{
                            background: colors.bg,
                            boxShadow: isDark ? `0 8px 30px ${colors.border}` : `0 8px 30px ${colors.light}`
                        }}
                    >
                        <Shield size={24} style={{ color: colors.accent }} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{department.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            {department.churches?.name && (
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                    <Building size={12} className="text-gray-500 dark:text-gray-400" />
                                    {department.churches.name}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                    background: isDark ? colors.light : colors.bg,
                                    color: colors.accent
                                }}
                            >
                                <Users size={12} />
                                {members.length} {t('departments.details.memberCount')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search Bar */}
                <div className="mb-6 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder={t('departments.details.searchMembers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-gray-50 dark:bg-gray-900 border-0 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl focus:outline-none transition-all font-medium text-gray-900 dark:text-gray-100"
                        onFocus={(e) => {
                            e.target.style.boxShadow = `0 0 0 2.5px ${colors.accent}`;
                        }}
                        onBlur={(e) => {
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Loader2 className="animate-spin" style={{ color: colors.accent }} size={32} />
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">{t('departments.details.gatheringList')}</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400 mb-4">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t('departments.details.noMembers')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('departments.details.noMembersSub')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredMembers.map((member) => (
                                <motion.div
                                    key={member.id}
                                    layout="position"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md group transition-all"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = colors.accent;
                                        const iconBox = e.currentTarget.querySelector('.icon-box') as HTMLElement;
                                        if (iconBox) {
                                            iconBox.style.background = colors.bg;
                                            iconBox.style.color = 'white';
                                        }
                                        const name = e.currentTarget.querySelector('.member-name') as HTMLElement;
                                        if (name) name.style.color = colors.accent;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '';
                                        const iconBox = e.currentTarget.querySelector('.icon-box') as HTMLElement;
                                        if (iconBox) {
                                            iconBox.style.background = '';
                                            iconBox.style.color = '';
                                        }
                                        const name = e.currentTarget.querySelector('.member-name') as HTMLElement;
                                        if (name) name.style.color = '';
                                    }}
                                >
                                    <div className="icon-box w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-all shrink-0">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover rounded-lg md:rounded-xl" />
                                        ) : (
                                            <User size={16} className="md:w-5 md:h-5 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="member-name font-bold text-sm text-gray-900 dark:text-gray-100 truncate transition-colors">
                                                {member.full_name}
                                            </h4>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${member.type === 'Pastor' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                                member.type === 'Servant' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                                                    'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                {t(`common.roles.${member.type.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 mt-0.5 md:mt-1">
                                            {member.phone && (
                                                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 hidden sm:flex">
                                                    <Phone size={10} className="shrink-0" />
                                                    <span className="truncate">{member.phone}</span>
                                                </div>
                                            )}
                                            {member.email && (
                                                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400">
                                                    <Mail size={10} className="shrink-0" />
                                                    <span className="truncate max-w-[150px]">{member.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
