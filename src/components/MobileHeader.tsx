import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import logo from "../assets/logo.png";

interface MobileHeaderProps {
    onMenuClick: () => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

export default function MobileHeader({ onMenuClick, containerRef }: MobileHeaderProps) {
    const { profile } = useAuth();
    const [churchName, setChurchName] = useState<string>("");
    const [isVisible, setIsVisible] = useState(true);
    const [isAtTop, setIsAtTop] = useState(true);
    const { scrollY } = useScroll({ container: containerRef });

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

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;

        // Show if scrolling up, hide if scrolling down
        if (latest > previous && latest > 150) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }

        setIsAtTop(latest < 20);
    });

    return (
        <motion.header
            initial={{ y: 0 }}
            animate={{
                y: isVisible ? 0 : -100,
                backgroundColor: isAtTop ? "rgba(255, 255, 255, 0)" : "rgba(255, 255, 255, 0.65)",
                backdropFilter: isAtTop ? "blur(0px)" : "blur(24px) saturate(180%)",
                boxShadow: isAtTop ? "none" : "0 8px 32px rgba(0, 0, 0, 0.08)",
                borderBottom: isAtTop ? "1px solid rgba(255, 255, 255, 0)" : "1px solid rgba(255, 255, 255, 0.3)"
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden fixed top-0 left-0 right-0 z-30 h-20 flex items-center px-6 transition-all"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm border border-gray-100">
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                    <h1 className="text-sm font-black text-gray-900 truncate tracking-tight">
                        {churchName || (profile?.role === "super_admin" ? "Guenet HQ" : "Guenet Church")}
                    </h1>
                    <p className="text-[10px] font-bold text-[#4B9BDC] uppercase tracking-wider opacity-80">
                        {profile?.role?.replace("_", " ")}
                    </p>
                </div>
            </div>

            <button
                onClick={onMenuClick}
                className="p-2.5 bg-white shadow-md border border-gray-100 rounded-xl text-[#4B9BDC] active:scale-95 transition-all"
            >
                <Menu size={20} />
            </button>
        </motion.header>
    );
}
