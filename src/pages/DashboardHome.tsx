import React from "react";
import { useAuth } from "../context/AuthContext";
import SuperAdminDashboard from "./SuperAdminDashboard";
import PastorDashboard from "./PastorDashboard";
import ServantDashboard from "./ServantDashboard";
import logo from "../assets/logo.png";
import { useLanguage } from "../context/LanguageContext";

export default function DashboardHome() {
  const { profile } = useAuth();

  const { t } = useLanguage();
  if (!profile)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-guenet-green"></div>
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
          <div className="text-center bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 p-4 shadow-inner">
              <img src={logo} alt="Logo" className="w-full h-full object-contain grayscale" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('common.unauthorized')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('common.unauthorizedMsg')}
            </p>
          </div>
        </div>
      );
  }
}
