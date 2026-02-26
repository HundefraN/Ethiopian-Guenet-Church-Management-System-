import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import {
  Home,
  Users,
  Building,
  Settings,
  LogOut,
  Shield,
  X,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants } from "../utils/animations";
import logo from "../assets/logo.png";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [churchName, setChurchName] = useState<string>("");

  const containerVariants = sharedContainerVariants;
  const itemVariants = sharedItemVariants;

  useEffect(() => {
    if (profile?.church_id) {
      fetchChurchName();
    }
  }, [profile?.church_id]);

  const fetchChurchName = async () => {
    const { data } = await supabase
      .from("churches")
      .select("name")
      .eq("id", profile?.church_id)
      .single();

    if (data) {
      setChurchName(data.name);
    }
  };

  const links = [
    {
      name: "Dashboard",
      path: "/",
      icon: Home,
      roles: ["super_admin", "pastor", "servant"],
    },
    {
      name: "Churches",
      path: "/churches",
      icon: Building,
      roles: ["super_admin"],
    },
    {
      name: "Pastors",
      path: "/pastors",
      icon: User,
      roles: ["super_admin"],
    },
    {
      name: "Servants",
      path: "/servants",
      icon: User,
      roles: ["super_admin", "pastor"],
    },
    {
      name: "Departments",
      path: "/departments",
      icon: Shield,
      roles: ["super_admin", "pastor"],
    },
    {
      name: "Members",
      path: "/members",
      icon: Users,
      roles: ["super_admin", "pastor", "servant"],
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      roles: ["super_admin", "pastor", "servant"],
    },
  ];

  const filteredLinks = links.filter(
    (link) => profile?.role && link.roles.includes(profile.role)
  );

  return (
    <div className="w-64 bg-[#0f172a]/90 backdrop-blur-2xl border-r border-white/10 text-white h-full flex flex-col shadow-[4px_0_24px_rgba(75,155,220,0.15)] relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-[#4B9BDC]/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#38bdf8]/10 rounded-full blur-[60px] pointer-events-none"></div>

      <div className="p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-white flex-shrink-0 flex items-center justify-center shadow-lg p-1.5 ring-2 ring-white/10">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 truncate">
              {churchName || (profile?.role === "super_admin" ? "Guenet HQ" : "Guenet")}
            </h2>
            <p className="text-[10px] font-bold text-guenet-gold uppercase tracking-[0.2em] opacity-80">
              {profile?.role?.replace("_", " ") || "User"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="px-6 py-2">
        <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent"></div>
      </div>

      <motion.nav
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto relative z-10"
      >
        {filteredLinks.map((link) => (
          <motion.div variants={itemVariants} key={link.name}>
            <NavLink
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? "bg-white/10 text-white font-medium shadow-sm border border-white/5"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon
                    size={20}
                    className={`transition-colors ${isActive ? "text-guenet-gold" : "text-white/50 group-hover:text-white/80"}`}
                  />
                  <span>{link.name}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      <div className="p-4 relative z-10">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/10 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#4B9BDC]/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4B9BDC]/80 to-[#38bdf8]/80 flex items-center justify-center text-sm font-bold border border-white/20">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-white/50 truncate">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              signOut();
              if (onClose) onClose();
            }}
            className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-200 text-white/90 transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
