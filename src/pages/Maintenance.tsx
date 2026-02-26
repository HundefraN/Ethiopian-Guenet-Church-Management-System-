import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import logo from "../assets/logo.png";

export default function Maintenance() {
  const { profile, settings } = useAuth();

  if (profile?.role === "super_admin" || !settings?.is_maintenance_mode) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-guenet-gold/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-guenet-green/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl border border-gray-100 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 p-4 border border-gray-100">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100">
              <Wrench className="w-6 h-6 text-[#4B9BDC]" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
          System Maintenance
        </h1>

        <p className="text-gray-500 text-base leading-relaxed mb-8">
          The Ethiopian Guenet Church management system is currently undergoing
          scheduled maintenance to improve our services.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-600 font-medium">
            Please check back later. We apologize for any inconvenience.
          </p>
        </div>
      </div>
    </div>
  );
}
