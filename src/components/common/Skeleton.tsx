import React from "react";
import { motion } from "framer-motion";

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div
            className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 rounded-lg ${className}`}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                }}
            />
        </div>
    );
};

export const CardSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-6 border border-gray-100/80 dark:border-gray-800 shadow-sm space-y-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
        </div>
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-8 border border-gray-100/80 dark:border-gray-800 shadow-sm flex flex-col items-center space-y-6">
        <Skeleton className="w-44 h-44 rounded-full" />
        <div className="w-full space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    </div>
);
