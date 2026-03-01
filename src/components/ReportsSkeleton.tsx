import React from "react";
import { Skeleton, CardSkeleton, ChartSkeleton } from "./common/Skeleton";

export const ReportsSkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse p-4">
            {/* Hero Header Skeleton */}
            <div className="h-48 sm:h-64 rounded-[2.5rem] bg-gray-200 dark:bg-gray-800 flex flex-col justify-center p-8 space-y-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-12 w-3/4 sm:w-1/2" />
                <Skeleton className="h-4 w-1/2 sm:w-1/3" />
            </div>

            {/* Filters Bar Skeleton */}
            <div className="flex flex-col lg:flex-row gap-4 p-6 rounded-[2rem] bg-gray-100 dark:bg-gray-800/50">
                <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
            </div>

            {/* Top row analytics grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Analytics Overview Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <Skeleton className="w-12 h-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <Skeleton className="h-8 w-16 ml-auto" />
                            <Skeleton className="h-3 w-24 ml-auto" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Skeleton className="h-48 rounded-2xl" />
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Growth History Skeleton */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <Skeleton className="w-12 h-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-32 rounded-xl" />
                    </div>
                    <Skeleton className="h-64 rounded-2xl w-full" />
                </div>
            </div>

            {/* Map Skeleton (Full Width) */}
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-10 space-y-4">
                    <div className="flex gap-4">
                        <Skeleton className="w-16 h-16 rounded-3xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>

            {/* Demographics Section Skeleton */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 space-y-8">
                <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-6">
                            <Skeleton className="h-4 w-1/2" />
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 4].map((j) => (
                                    <Skeleton key={j} className="h-24 rounded-2xl" />
                                ))}
                            </div>
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
