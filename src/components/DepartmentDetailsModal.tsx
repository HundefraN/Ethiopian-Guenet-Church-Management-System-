import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Users,
    Shield,
    Building,
    Mail,
    Phone,
    User,
    Loader2,
    Calendar,
    Search,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { Member } from "../types";

interface DepartmentDetailsModalProps {
    department: any;
    onClose: () => void;
}

interface CombinedMember {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    type: "Member" | "Servant" | "Pastor";
    avatar_url?: string | null;
}

export default function DepartmentDetailsModal({
    department,
    onClose,
}: DepartmentDetailsModalProps) {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<CombinedMember[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (department) {
            fetchDepartmentMembers();
        }
    }, [department]);

    const fetchDepartmentMembers = async () => {
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

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden"
            >
                {/* Header Section */}
                <div className="p-8 pb-6 bg-gradient-to-r from-[#1A365D]/5 to-transparent border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"></div>

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{department.name}</h2>
                            <div className="flex items-center gap-2 mt-1 py-1">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                                    <Building size={14} className="text-gray-400" />
                                    {department.churches?.name}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 rounded-full text-xs font-bold text-purple-600">
                                    <Users size={14} />
                                    {members.length} Members
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 z-10">
                        <button
                            onClick={onClose}
                            className="p-3 bg-white hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all shadow-sm border border-gray-100"
                        >
                            <X size={20} className="stroke-[2.5]" />
                        </button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-hidden flex flex-col p-8 pt-6">
                    {/* Search Bar */}
                    <div className="mb-6 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search members by name or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-900"
                        />
                    </div>

                    {/* Members List */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="animate-spin text-purple-600" size={40} />
                                <p className="text-gray-500 font-medium">Gathering list of members...</p>
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                                    <Users size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">No members found</h3>
                                <p className="text-gray-500">There are no members listed in this department yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredMembers.map((member) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:from-purple-50 group-hover:to-purple-100 group-hover:text-purple-600 transition-colors shrink-0">
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                <User size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-bold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                                                    {member.full_name}
                                                </h4>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${member.type === 'Pastor' ? 'bg-amber-100 text-amber-600' :
                                                        member.type === 'Servant' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {member.type}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                {member.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Phone size={12} className="shrink-0" />
                                                        <span className="truncate">{member.phone}</span>
                                                    </div>
                                                )}
                                                {member.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Mail size={12} className="shrink-0" />
                                                        <span className="truncate">{member.email}</span>
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

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-2xl border border-gray-200 transition-all shadow-sm"
                    >
                        Close Details
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
