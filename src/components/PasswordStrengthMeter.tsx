import React, { useMemo } from "react";
import { Check, X, Shield, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordStrengthMeterProps {
    password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
    const passwordChecks = useMemo(() => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\;'`~_+=-]/.test(password),
        };
    }, [password]);

    const strengthScore = useMemo(() => {
        return Object.values(passwordChecks).filter(Boolean).length;
    }, [passwordChecks]);

    const config = useMemo(() => {
        if (password.length === 0) return { label: "Empty", color: "#94a3b8", bg: "bg-slate-100", icon: ShieldOff, text: "text-slate-400" };
        if (strengthScore <= 1) return { label: "Very Weak", color: "#ef4444", bg: "bg-red-500", icon: ShieldAlert, text: "text-red-500" };
        if (strengthScore === 2) return { label: "Weak", color: "#f97316", bg: "bg-orange-500", icon: ShieldAlert, text: "text-orange-500" };
        if (strengthScore === 3) return { label: "Fair", color: "#eab308", bg: "bg-yellow-500", icon: Shield, text: "text-yellow-500" };
        if (strengthScore === 4) return { label: "Strong", color: "#22c55e", bg: "bg-emerald-500", icon: ShieldCheck, text: "text-emerald-500" };
        return { label: "Unstoppable", color: "#10b981", bg: "bg-green-600", icon: ShieldCheck, text: "text-green-600" };
    }, [strengthScore, password]);

    const requirements = [
        { key: "minLength", label: "8+ characters" },
        { key: "hasUppercase", label: "Uppercase letter" },
        { key: "hasLowercase", label: "Lowercase letter" },
        { key: "hasNumber", label: "Number (0-9)" },
        { key: "hasSpecial", label: "Special character" },
    ];

    if (password.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100 backdrop-blur-sm shadow-sm overflow-hidden relative"
        >
            {/* Background Glow */}
            <div
                className="absolute -top-10 -right-10 w-32 h-32 blur-[50px] opacity-20 transition-colors duration-500"
                style={{ backgroundColor: config.color }}
            />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${config.bg.replace('bg-', 'bg-opacity-10 bg-')} ${config.text}`}>
                        <config.icon size={18} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Strength: <span className={config.text}>{config.label}</span>
                    </span>
                </div>
                <div className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100 uppercase tracking-tighter">
                    {strengthScore}/5 Passed
                </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="flex gap-1.5 h-1.5 mb-5">
                {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex-1 h-full rounded-full bg-gray-200/80 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: strengthScore >= idx ? "100%" : "0%" }}
                            className={`h-full rounded-full ${config.bg} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                            transition={{ type: "spring", stiffness: 100, damping: 15, delay: idx * 0.05 }}
                            style={{
                                boxShadow: strengthScore >= idx ? `0 0 12px ${config.color}40` : 'none'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Requirements Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {requirements.map((req, index) => {
                    const isMet = passwordChecks[req.key as keyof typeof passwordChecks];
                    return (
                        <motion.div
                            key={req.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="flex items-center gap-3 group"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{
                                        scale: isMet ? [1, 1.2, 1] : 1,
                                        rotate: isMet ? [0, 10, -10, 0] : 0
                                    }}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${isMet
                                            ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                                            : "bg-gray-200 border border-gray-300/50"
                                        }`}
                                >
                                    {isMet ? (
                                        <Check size={12} className="text-white" strokeWidth={4} />
                                    ) : (
                                        <X size={10} className="text-gray-400" strokeWidth={3} />
                                    )}
                                </motion.div>
                                {isMet && (
                                    <motion.div
                                        layoutId={`sparkle-${req.key}`}
                                        className="absolute inset-0 rounded-full bg-emerald-400 blur-sm"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.5, 2] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </div>
                            <span className={`text-[13px] transition-all duration-300 ${isMet ? "text-emerald-700 font-medium" : "text-gray-500 font-normal"
                                }`}>
                                {req.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Pro Security Message */}
            {strengthScore === 5 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-2 mt-2"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] text-emerald-600 font-medium italic">
                        This password is exceptionally strong and ready to defend your account!
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

export default PasswordStrengthMeter;
