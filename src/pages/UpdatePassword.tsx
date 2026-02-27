import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { logActivity } from "../utils/activityLogger";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

import logo from "../assets/logo.png";

export default function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // The session should be available automatically through the URL hash when a user clicks the recovery link
    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            // If unauthenticated or an unexpected state, you might redirect
            // For now, we assume the hash authenticates the user
            if (event === "PASSWORD_RECOVERY") {
                toast.success("Ready to update your password");
            }
        });
    }, []);

    // Password strength calculation
    const passwordChecks = React.useMemo(() => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\;'`~_+=-]/.test(password),
        };
    }, [password]);

    const strengthScore = React.useMemo(() => {
        return Object.values(passwordChecks).filter(Boolean).length;
    }, [passwordChecks]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match. Please try again.");
            return;
        }

        if (strengthScore < 4) {
            toast.error("Please choose a stronger password.");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Updating password...");

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            toast.error(error.message, { id: loadingToast });
        } else {
            await logActivity(
                "PASSWORD_CHANGE",
                "PROFILE",
                "Password updated via recovery link"
            );
            toast.success("Password updated successfully!", { id: loadingToast, duration: 4000 });
            // Redirect to login or home page
            navigate("/");
        }
        setLoading(false);
    };

    const formVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left side - Form */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] bg-white shadow-2xl z-10 relative"
            >
                <div className="mx-auto w-full max-w-sm lg:w-[400px]">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.15 }}
                        className="flex items-center gap-3 mb-10"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-[#4B9BDC]/10 ring-1 ring-gray-100 p-2">
                            <img src={logo} alt="Ethiopian Guenet Church Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1e293b] to-[#4B9BDC] tracking-tight">
                                Guenet Church
                            </h1>
                            <p className="text-sm font-semibold text-[#7EC8F2] uppercase tracking-wider">
                                Management System
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
                                Set New Password
                            </h2>
                            <p className="text-sm text-gray-500">
                                Please enter your new strong password below.
                            </p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <motion.div whileHover={{ scale: 1.01 }}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/50 focus:border-[#4B9BDC] outline-none transition-all sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {/* Password Strength Meter */}
                                <PasswordStrengthMeter password={password} />
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.01 }}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <CheckCircle size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`block w-full pl-11 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all sm:text-sm ${confirmPassword.length > 0 && confirmPassword !== password
                                            ? "border-red-300 focus:ring-red-200"
                                            : "border-gray-200 focus:ring-[#4B9BDC]/50"
                                            }`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </motion.div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading || strengthScore < 4 || password !== confirmPassword}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-[#4B9BDC] to-[#3a85c2] hover:from-[#3a85c2] hover:to-[#295b86] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4B9BDC] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Updating...
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        Update Password
                                        <ArrowRight
                                            size={18}
                                            className="ml-2 opacity-70 group-hover:translate-x-1 transition-transform"
                                        />
                                    </div>
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                </div>
            </motion.div>

            {/* Right side - Image/Graphic */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block relative w-0 flex-1 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#132d4a] to-[#4B9BDC] opacity-95"></div>

                {/* Decorative elements */}
                <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-[#7EC8F2]/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-[#4B9BDC]/30 rounded-full blur-[100px]"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.05, type: "spring", stiffness: 100 }}
                        className="w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center mb-10 shadow-[0_12px_40px_rgba(255,255,255,0.2)] p-4 ring-4 ring-white/10"
                    >
                        <img src={logo} alt="Ethiopian Guenet Church Logo" className="w-full h-full object-contain" />
                    </motion.div>
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.05, duration: 0.15 }}
                        className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bae6fd] mb-6 tracking-tight leading-tight"
                    >
                        Secure Your Account
                    </motion.h2>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.05, duration: 0.15 }}
                        className="text-lg text-blue-100 max-w-md leading-relaxed font-light"
                    >
                        Update your password to ensure safe and secure access to the Ethiopian Guenet Church management system.
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
}
