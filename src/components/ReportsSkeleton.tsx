import React from "react";
import { motion } from "framer-motion";

const shimmerClass = "skeleton-premium";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 400, damping: 24, mass: 0.6 },
    },
};

export const ReportsSkeleton = () => {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 p-4"
        >
            {/* Hero Header Skeleton */}
            <motion.div
                variants={itemVariants}
                className="h-48 sm:h-64 rounded-[2.5rem] flex flex-col justify-center p-8 space-y-4 relative overflow-hidden hero-mesh"
                style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,58,138,0.4) 50%, rgba(59,130,246,0.3) 100%)", backgroundSize: "400% 400%" }}
            >
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
                <div className={`${shimmerClass} h-6 w-32 rounded-full`} style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className={`${shimmerClass} h-12 w-3/4 sm:w-1/2`} style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className={`${shimmerClass} h-4 w-1/2 sm:w-1/3`} style={{ background: "rgba(255,255,255,0.06)" }} />
            </motion.div>

            {/* Filters Bar Skeleton */}
            <motion.div
                variants={itemVariants}
                className="flex flex-col lg:flex-row gap-4 p-6 rounded-[2rem] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-100/50 dark:border-gray-800/50"
            >
                <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <div className={`${shimmerClass} h-3 w-20`} />
                        <div className={`${shimmerClass} h-12 w-full rounded-2xl`} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className={`${shimmerClass} h-3 w-20`} />
                        <div className={`${shimmerClass} h-12 w-full rounded-2xl`} />
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <div className={`${shimmerClass} h-12 w-12 rounded-xl`} />
                    <div className={`${shimmerClass} h-12 w-12 rounded-xl`} />
                </div>
            </motion.div>

            {/* Top row analytics grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Analytics Overview */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-gray-100/50 dark:border-gray-800/50 space-y-6"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <div className={`${shimmerClass} w-12 h-12 rounded-2xl`} />
                            <div className="space-y-2">
                                <div className={`${shimmerClass} h-6 w-32`} />
                                <div className={`${shimmerClass} h-3 w-20`} />
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <div className={`${shimmerClass} h-8 w-16 ml-auto`} />
                            <div className={`${shimmerClass} h-3 w-24 ml-auto`} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={`${shimmerClass} h-48 rounded-2xl`} />
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={`${shimmerClass} h-12 w-full rounded-2xl`} />
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Growth Chart */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-gray-100/50 dark:border-gray-800/50 space-y-6"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <div className={`${shimmerClass} w-12 h-12 rounded-2xl`} />
                            <div className="space-y-2">
                                <div className={`${shimmerClass} h-6 w-32`} />
                                <div className={`${shimmerClass} h-3 w-20`} />
                            </div>
                        </div>
                    </div>
                    <div className={`${shimmerClass} h-64 rounded-2xl w-full`} />
                </motion.div>
            </motion.div>

            {/* Map Skeleton (Full Width) */}
            <motion.div
                variants={itemVariants}
                className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-[3rem] border border-gray-100/50 dark:border-gray-800/50 overflow-hidden"
            >
                <div className="p-10 space-y-4">
                    <div className="flex gap-4">
                        <div className={`${shimmerClass} w-16 h-16 rounded-3xl`} />
                        <div className="space-y-2">
                            <div className={`${shimmerClass} h-8 w-48`} />
                            <div className={`${shimmerClass} h-4 w-32`} />
                        </div>
                    </div>
                </div>
                <div className={`${shimmerClass} h-[600px] w-full`} style={{ borderRadius: 0 }} />
            </motion.div>

            {/* Demographics Section */}
            <motion.div
                variants={itemVariants}
                className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-gray-100/50 dark:border-gray-800/50 space-y-8"
            >
                <div className="flex gap-4">
                    <div className={`${shimmerClass} w-12 h-12 rounded-2xl`} />
                    <div className="space-y-2">
                        <div className={`${shimmerClass} h-6 w-32`} />
                        <div className={`${shimmerClass} h-3 w-20`} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-6">
                            <div className={`${shimmerClass} h-4 w-1/2`} />
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 4].map((j) => (
                                    <div key={j} className={`${shimmerClass} h-24 rounded-2xl`} />
                                ))}
                            </div>
                            <div className="space-y-4">
                                <div className={`${shimmerClass} h-4 w-full`} />
                                <div className={`${shimmerClass} h-4 w-3/4`} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
