import React, { useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { springPresets } from "../utils/animations";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        <motion.div
          initial={false}
          animate={{ x: sidebarOpen ? 0 : 0 }} // Logic handled by class on mobile, but let's make it consistent
          className={`fixed inset-y-0 left-0 z-50 w-64 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-500 ease-[cubic-bezier(0.32,0,0.67,0)] lg:transition-none`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </motion.div>
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {/* Decorative background element */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-[#38bdf8]/20 to-transparent pointer-events-none rounded-full blur-[120px] -z-10"
        ></motion.div>

        {/* Mobile Header - collapses on scroll */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} containerRef={mainRef} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pt-28 lg:pt-10 scroll-smooth"
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
