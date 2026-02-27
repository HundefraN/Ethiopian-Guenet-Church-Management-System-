import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants as sharedContainerVariants, itemVariants as sharedItemVariants, springPresets } from "../utils/animations";
import logo from "../assets/logo.png";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [churchName, setChurchName] = useState<string>("");
  const location = useLocation();

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
      icon: LayoutDashboard,
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

  // Helper to check if a path is active
  const isPathActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      if (onClose) onClose();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="sidebar-container">
      {/* Subtle Grain Texture Overlay for Realism */}
      <div className="sidebar-noise"></div>

      {/* Subtle animated gradient orbs */}
      <div className="sidebar-orb sidebar-orb-1"></div>
      <div className="sidebar-orb sidebar-orb-2"></div>
      <div className="sidebar-orb sidebar-orb-3"></div>

      {/* Header / Brand */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap group">
            <img src={logo} alt="Logo" className="sidebar-logo-img transition-transform duration-200 group-hover:scale-110" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-church-name">
              {churchName || (profile?.role === "super_admin" ? "Guenet HQ" : "Guenet")}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <p className="sidebar-role-badge">
                {profile?.role?.replace("_", " ") || "User"}
              </p>
            </div>
          </div>
        </div>
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="sidebar-close-btn"
          >
            <X size={18} />
          </motion.button>
        )}
      </div>

      {/* Divider */}
      <div className="sidebar-divider-wrap">
        <div className="sidebar-divider"></div>
      </div>

      {/* Navigation */}
      <motion.nav
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="sidebar-nav"
      >
        {filteredLinks.map((link) => {
          const isActive = isPathActive(link.path);

          return (
            <motion.div variants={itemVariants} key={link.name} className="relative">
              <NavLink
                to={link.path}
                end={link.path === "/"}
                onClick={onClose}
                className={`sidebar-nav-item ${isActive ? "active-text" : ""}`}
              >
                {/* Sliding Background Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="sidebar-nav-item--active absolute inset-0 -z-10"
                    transition={springPresets.liquid}
                  />
                )}

                <div className={`sidebar-nav-icon relative z-10 ${isActive ? "sidebar-nav-icon--active" : ""}`}>
                  <link.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                </div>
                <span className="sidebar-nav-label relative z-10">{link.name}</span>

                {isActive && (
                  <motion.div
                    className="relative z-10"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <ChevronRight size={14} className="sidebar-nav-chevron" />
                  </motion.div>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* User Profile Card */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card group overflow-hidden relative">
          {/* Subtle hover sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-300 ease-in-out pointer-events-none"></div>

          <div className="sidebar-user-info">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "User"}
                  className="sidebar-avatar"
                />
              ) : (
                <div className="sidebar-avatar-placeholder">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0c1929] rounded-full"></div>
            </div>
            <div className="sidebar-user-text">
              <p className="sidebar-user-name">
                {profile?.full_name || "User"}
              </p>
              <p className="sidebar-user-role">{profile?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="sidebar-signout-btn group/btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogOut size={15} className="group-hover/btn:-translate-x-1 transition-transform" />
            )}
            <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
