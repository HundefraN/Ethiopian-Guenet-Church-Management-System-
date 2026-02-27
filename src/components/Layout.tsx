import React, { useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { springPresets } from "../utils/animations";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  return (
    <div className="layout-root">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-40 backdrop-blur-xl lg:hidden ${isDark ? 'bg-black/50' : 'bg-white/5'}`}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        <motion.div
          initial={false}
          animate={{ x: sidebarOpen ? 0 : 0 }}
          className={`layout-sidebar-wrapper ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </motion.div>
      </AnimatePresence>

      {/* Main content */}
      <div className="layout-main-wrapper">
        {/* Decorative background element */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-[#7EC8F2]/15 to-transparent pointer-events-none rounded-full blur-[120px] -z-10"
        ></motion.div>

        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} containerRef={mainRef} />

        <main
          ref={mainRef}
          className="layout-main-content"
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
