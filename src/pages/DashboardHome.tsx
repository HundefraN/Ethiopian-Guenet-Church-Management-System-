import React from "react";
import { useAuth } from "../context/AuthContext";
import SuperAdminDashboard from "./SuperAdminDashboard";
import PastorDashboard from "./PastorDashboard";
import ServantDashboard from "./ServantDashboard";
import logo from "../assets/logo.png";
import { useLanguage } from "../context/LanguageContext";
import { motion } from "framer-motion";

export default function DashboardHome() {
  const { profile } = useAuth();

  const { t } = useLanguage();
  if (!profile)
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-[3px] border-transparent"
              style={{ borderTopColor: "#4B9BDC", borderRightColor: "rgba(75,155,220,0.3)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#4B9BDC] to-[#7EC8F2] live-dot" />
            </div>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("common.loading")}</span>
        </motion.div>
      </div>
    );

  switch (profile.role) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "pastor":
      return <PastorDashboard />;
    case "servant":
      return <ServantDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className="text-center bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md"
          >
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 p-4 shadow-inner">
              <img src={logo} alt="Logo" className="w-full h-full object-contain grayscale" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('common.unauthorized')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('common.unauthorizedMsg')}
            </p>
          </motion.div>
        </div>
      );
  }
}
