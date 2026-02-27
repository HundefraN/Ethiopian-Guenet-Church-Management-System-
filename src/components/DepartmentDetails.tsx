import React, { useEffect, useState } from "react";
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
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<CombinedMember[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

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
                .select("id, full_name, email, phone")
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
                    type: "Member" as const
                })) || []),
                ...(profileDepts?.map((pd: any) => ({
                    id: pd.profiles.id,
                    full_name: pd.profiles.full_name,
                    email: null, // Profiles might not have email in public.profiles, usually in auth.users
                    phone: null,
                    type: pd.profiles.role === "pastor" ? ("Pastor" as const) : ("Servant" as const),
                    avatar_url: pd.profiles.avatar_url
                })) || [])
            ];

            // Sort by name
            combined.sort((a, b) => a.full_name.localeCompare(b.full_name));

            setMembers(combined);
        } catch (error) {
            console.error("Error fetching department members:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!department) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a department to view details</p>
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
            <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{department.name}</h2>
                        <div className="flex items-center gap-2 mt-1 py-1">
                            {department.churches?.name && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400">
                                    <Building size={14} className="text-gray-500 dark:text-gray-400" />
                                    {department.churches.name}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full text-xs font-bold text-purple-600 dark:text-purple-400">
                                <Users size={14} />
                                {members.length} Members
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
                        placeholder="Search members by name or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-gray-50 dark:bg-gray-900 border-0 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-900 dark:text-gray-100"
                    />
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Loader2 className="animate-spin text-purple-600 dark:text-purple-400" size={32} />
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Gathering list of members...</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400 mb-4">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No members found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">There are no members listed in this department yet.</p>
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
                                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50 hover:shadow-md group"

                                >
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:from-purple-50 group-hover:to-purple-100 dark:group-hover:from-purple-900/20 dark:group-hover:to-purple-900/40 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover rounded-lg md:rounded-xl" />
                                        ) : (
                                            <User size={16} className="md:w-5 md:h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                                {member.full_name}
                                            </h4>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${member.type === 'Pastor' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                                member.type === 'Servant' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                                                    'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                {member.type}
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
