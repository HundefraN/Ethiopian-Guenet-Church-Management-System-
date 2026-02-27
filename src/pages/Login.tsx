import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { springPresets, interactivePresets } from "../utils/animations";

import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { session, profile, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (session && profile) {
      navigate("/");
    }
  }, [session, profile, navigate]);

  if (authLoading || (session && profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-[#4B9BDC] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
          </div>
          <p className="text-gray-500 font-medium animate-pulse">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message, { id: loadingToast });
      setLoading(false);
    } else {
      toast.success("Signed in successfully", { id: loadingToast });
      // Navigation is now handled by the useEffect once the profile is loaded
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setLoading(true);
    const loadingToast = toast.loading("Sending reset link...");

    // Make sure to set up your redirect URL in the Supabase Dashboard:
    // Authentication -> URL Configuration -> Site URL & Redirect URLs
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success("Check your email for the reset link!", { id: loadingToast });
      setResetSent(true);
      setEmail("");
    }
    setLoading(false);
  };

  const formVariants = {
    hidden: { opacity: 0, x: -30, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 30, staggerChildren: 0.1 }
    },
    exit: {
      opacity: 0,
      x: 30,
      filter: "blur(4px)",
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 20 } }
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left side - Form */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 20, duration: 0.15 }}
        className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[480px] xl:w-[600px] bg-white z-10 relative"
      >
        <div className="mx-auto w-full max-w-sm lg:w-[400px]">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.15 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f0f7fd] to-[#e2effc] flex items-center justify-center shadow-lg shadow-[#4B9BDC]/10 ring-1 ring-[#4B9BDC]/10 p-2">
              <img src={logo} alt="Ethiopian Guenet Church Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1e293b] to-[#4B9BDC] tracking-tight">
                Ethiopian Guenet Church
              </h1>
              <p className="text-sm font-semibold text-[#4B9BDC] uppercase tracking-wider">
                Management System
              </p>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isForgotPassword ? (
              <motion.div
                key="login"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    Welcome back
                  </h2>
                  <p className="text-gray-500">
                    Please sign in to your account to continue.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/50 focus:border-[#4B9BDC] outline-none transition-all sm:text-sm"
                        placeholder="email@gmail.com"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={inputVariants} whileHover={interactivePresets.hover} whileTap={interactivePresets.tap}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
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
                        className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/50 focus:border-[#4B9BDC] outline-none transition-all sm:text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </motion.div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-[#4B9BDC] focus:ring-[#4B9BDC] border-gray-300 rounded"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="font-semibold text-[#4B9BDC] hover:text-[#7EC8F2] transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-[0_8px_30px_rgb(75,155,220,0.3)] text-sm font-bold text-white bg-gradient-to-r from-[#4B9BDC] to-[#3a85c2] hover:from-[#3a85c2] hover:to-[#295b86] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4B9BDC] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed mt-8 group"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Sign In
                        <ArrowRight
                          size={18}
                          className="ml-2 opacity-70 group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : resetSent ? (
              <motion.div
                key="reset-success"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-center"
              >
                <div className="mb-8 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6 ring-8 ring-green-100/50">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    Check your email
                  </h2>
                  <p className="text-gray-500 max-w-xs mx-auto">
                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                  </p>
                </div>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setResetSent(false);
                      setIsForgotPassword(false);
                    }}
                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-[#4B9BDC] hover:bg-[#3a85c2] focus:outline-none transition-all duration-150 group"
                  >
                    Back to Sign In
                  </motion.button>

                  <p className="text-sm text-gray-400 pt-4">
                    Didn't receive an email?{" "}
                    <button
                      onClick={() => setResetSent(false)}
                      className="text-[#4B9BDC] font-semibold hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reset"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="mb-8">
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                    }}
                    className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-6"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back to login
                  </button>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    Reset Password
                  </h2>
                  <p className="text-gray-500">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4B9BDC]/50 focus:border-[#4B9BDC] outline-none transition-all sm:text-sm"
                        placeholder="email@gmail.com"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-[0_8px_30px_rgb(75,155,220,0.3)] text-sm font-bold text-white bg-gradient-to-r from-[#4B9BDC] to-[#3a85c2] hover:from-[#3a85c2] hover:to-[#295b86] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4B9BDC] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed mt-8 group"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        Send Reset Link
                        <Mail
                          size={18}
                          className="ml-2 opacity-70 group-hover:scale-110 transition-transform"
                        />
                      </div>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
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
          className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-[#4B9BDC]/25 rounded-full blur-[100px]"
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 100 }}
            className="w-32 h-32 rounded-[2.5rem] bg-white/10 backdrop-blur-xl flex items-center justify-center mb-10 shadow-[0_12px_40px_rgba(255,255,255,0.15)] p-4 ring-4 ring-white/10"
          >
            <img src={logo} alt="Ethiopian Guenet Church Logo" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(126,200,242,0.4)]" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.15 }}
            className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#7EC8F2] mb-6 tracking-tight leading-tight"
          >
            Empowering Ministry <br /> Through Technology
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.15 }}
            className="text-lg text-blue-100 max-w-md leading-relaxed font-light"
          >
            A comprehensive management system designed for
            Ethiopian Guenet Church to streamline administration, connect
            members, and support spiritual growth.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

