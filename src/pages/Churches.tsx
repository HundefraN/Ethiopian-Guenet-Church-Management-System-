import React, { useEffect, useState } from "react";
import { Building, MapPin, Search, Plus, Loader2, X, ChevronRight, Users, Shield, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Church } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/activityLogger";

interface ChurchWithCount extends Church {
  members: { count: number }[];
}

export default function Churches() {
  const { profile } = useAuth();
  const [churches, setChurches] = useState<ChurchWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChurch, setNewChurch] = useState({ name: "", location: "" });
  const [submitting, setSubmitting] = useState(false);

  const [selectedChurch, setSelectedChurch] = useState<ChurchWithCount | null>(
    null
  );
  const [churchStats, setChurchStats] = useState<{
    deptCount: number;
    departments: { name: string; servantCount: number }[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchChurches();
    }
  }, [profile]);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      let query = supabase.from("churches").select("*, members(count)");

      if (
        (profile?.role === "pastor" || profile?.role === "servant") &&
        profile.church_id
      ) {
        query = query.eq("id", profile.church_id);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;

      setChurches((data as any) || []);
    } catch (error) {
      console.error("Error fetching churches:", error);
      toast.error("Failed to load churches");
    } finally {
      setLoading(false);
    }
  };

  const handleChurchClick = async (church: ChurchWithCount) => {
    if (selectedChurch?.id === church.id) {
      setSelectedChurch(null);
      return;
    }
    setSelectedChurch(church);
    setLoadingStats(true);
    setChurchStats(null);
    try {
      // 1. Total Departments
      const { count: deptCount } = await supabase
        .from("departments")
        .select("*", { count: "exact", head: true })
        .eq("church_id", church.id);

      // 2. Departments with Servant Counts
      let depts: any[] = [];
      const { data: newDepts, error: newDeptsError } = await supabase
        .from("departments")
        .select(
          `
              id,
              name,
              profile_departments (count)
          `
        )
        .eq("church_id", church.id);

      if (newDeptsError) {
        console.warn(
          "Failed to fetch department stats (new schema), trying legacy"
        );
        // Fallback: just get departments without servant count
        const { data: legacyDepts } = await supabase
          .from("departments")
          .select("id, name")
          .eq("church_id", church.id);
        depts = legacyDepts || [];
      } else {
        depts = newDepts || [];
      }

      setChurchStats({
        deptCount: deptCount || 0,
        departments:
          depts?.map((d: any) => ({
            name: d.name,
            servantCount: d.profile_departments?.[0]?.count || 0,
          })) || [],
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load details");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurch.name) {
      toast.error("Church name is required");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from("churches")
        .insert([newChurch])
        .select()
        .single();

      if (error) throw error;

      await logActivity(
        "CREATE",
        "CHURCH",
        `Added new church "${newChurch.name}" at ${newChurch.location || "unspecified location"}`,
        data.id,
        { name: newChurch.name, location: newChurch.location }
      );

      // Add empty members array to match type
      const newChurchWithCount: ChurchWithCount = { ...data, members: [] };
      setChurches([...churches, newChurchWithCount]);
      setNewChurch({ name: "", location: "" });
      setIsModalOpen(false);
      toast.success("Church added successfully");
    } catch (error: any) {
      console.error("Error adding church:", error);
      toast.error(error.message || "Failed to add church");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredChurches = churches.filter(
    (church) =>
      church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (church.location &&
        church.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-10"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] p-8 shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              Churches Directory
            </h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Manage all church branches, locations, and view detailed statistics designed beautifully.
            </p>
          </div>
          {profile?.role === "super_admin" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-[#4B9BDC] px-6 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold shrink-0"
            >
              <Plus size={20} />
              <span>Add New Church</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Details Section (Left on Desktop) */}
        {selectedChurch && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="w-full lg:w-[400px] order-1 lg:sticky lg:top-6 z-10"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-blue-50/50 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setSelectedChurch(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 bg-white shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center shadow-inner mb-6 border border-white">
                <Building className="text-[#4B9BDC]" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                {selectedChurch.name}
              </h2>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-8 font-medium bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-100">
                <MapPin size={16} className="text-[#4B9BDC]" />
                <span>{selectedChurch.location || "No location specified"}</span>
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-[#4B9BDC]" size={32} />
                </div>
              ) : churchStats ? (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 text-blue-200/50 transform group-hover:scale-110 transition-transform duration-500">
                        <Users size={64} />
                      </div>
                      <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Members</h3>
                      <p className="text-3xl font-black text-blue-950 relative z-10">
                        {selectedChurch.members && selectedChurch.members[0] ? selectedChurch.members[0].count : 0}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-2xl border border-purple-100/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 text-purple-200/50 transform group-hover:scale-110 transition-transform duration-500">
                        <Shield size={64} />
                      </div>
                      <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Departments</h3>
                      <p className="text-3xl font-black text-purple-950 relative z-10">
                        {churchStats.deptCount}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-100/50 shadow-sm relative overflow-hidden group col-span-2">
                      <div className="absolute -right-2 -bottom-4 text-indigo-200/30 transform group-hover:scale-110 transition-transform duration-500">
                        <BookOpen size={80} />
                      </div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Total Servants</h3>
                      <p className="text-3xl font-black text-indigo-950 relative z-10">
                        {churchStats.departments.reduce((acc, curr) => acc + curr.servantCount, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Department List */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4 px-1 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={16} className="text-[#4B9BDC]" />
                      Ministry Breakdown
                    </h3>
                    {churchStats.departments.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100 border-dashed text-gray-400 text-sm font-medium">
                        No departments found.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {churchStats.departments.map((dept, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md hover:border-blue-100 transition-all group"
                          >
                            <span className="font-semibold text-gray-700 group-hover:text-blue-900 transition-colors">
                              {dept.name}
                            </span>
                            <span className="bg-blue-50 text-[#4B9BDC] px-3 py-1 rounded-lg text-xs font-bold">
                              {dept.servantCount} Servants
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Failed to load data.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* List Section (Right on Desktop if selected, otherwise full) */}
        <div className={`flex-1 transition-all duration-500 order-2`}>
          {/* Search Bar */}
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-8 flex items-center focus-within:ring-2 focus-within:ring-[#4B9BDC]/20 focus-within:border-[#4B9BDC] transition-all">
            <div className="pl-4 pr-2 text-gray-400">
              <Search size={22} className="text-[#4B9BDC]" />
            </div>
            <input
              type="text"
              placeholder="Search branches by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pr-4 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder-gray-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-[#4B9BDC]" size={40} />
            </div>
          ) : filteredChurches.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                No churches found
              </h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                We couldn't find any churches matching your search. Try adjusting your query or add a new branch.
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className={`grid grid-cols-1 ${selectedChurch ? 'xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'} gap-6`}
            >
              <AnimatePresence>
                {filteredChurches.map((church, index) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    key={church.id}
                    onClick={() => handleChurchClick(church)}
                    className={`bg-white p-6 rounded-3xl border ${selectedChurch?.id === church.id ? 'border-[#4B9BDC] shadow-[0_8px_30px_rgba(75,155,220,0.2)] ring-2 ring-[#4B9BDC]/10' : 'border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200'} transition-all duration-300 group cursor-pointer relative overflow-hidden`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 ${selectedChurch?.id === church.id ? 'bg-[#4B9BDC]/20' : 'bg-transparent group-hover:bg-blue-50'}`}></div>

                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${selectedChurch?.id === church.id ? 'bg-[#4B9BDC] text-white' : 'bg-blue-50/80 text-[#4B9BDC] group-hover:bg-[#4B9BDC] group-hover:text-white'}`}>
                        <Building size={28} />
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-emerald-100/50">
                        Active
                      </span>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#4B9BDC] transition-colors leading-tight">
                        {church.name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-6 font-medium">
                        <MapPin size={16} className="shrink-0 text-gray-400 group-hover:text-[#4B9BDC] transition-colors" />
                        <span className="truncate">{church.location || "No location specified"}</span>
                      </div>

                      <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-[#4B9BDC] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                            <Users size={12} />
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#4B9BDC] text-xs font-bold ring-2 ring-white">
                            +
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-xl font-black text-gray-900 leading-none">
                            {church.members && church.members[0] ? church.members[0].count : 0}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Members</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Church Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1A365D] to-[#4B9BDC]"></div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add Church</h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Register a new branch location</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddChurch} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Church Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newChurch.name}
                    onChange={(e) =>
                      setNewChurch({ ...newChurch, name: e.target.value })
                    }
                    className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4B9BDC] transition-all font-medium text-gray-900 placeholder-gray-400"
                    placeholder="e.g. Guenet Addis Ababa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newChurch.location}
                    onChange={(e) =>
                      setNewChurch({ ...newChurch, location: e.target.value })
                    }
                    className="w-full px-5 py-3.5 bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4B9BDC] transition-all font-medium text-gray-900 placeholder-gray-400"
                    placeholder="e.g. Bole, Addis Ababa"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-gradient-to-r from-[#1A365D] to-[#4B9BDC] text-white font-bold rounded-xl hover:shadow-[0_8px_20px_rgba(75,155,220,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 transform"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Add Church</span>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

