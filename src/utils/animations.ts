import { Variants } from "framer-motion";

/**
 * Premium Spring Configurations
 * Exceptionally fast, snappy, and responsive.
 */
export const springPresets = {
    // For quick, snappy, firm micro-interactions
    snappy: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25,
        mass: 0.5,
    },
    // For general fluid layout transitions
    smooth: {
        type: "spring" as const,
        stiffness: 400,
        damping: 24,
        mass: 0.6,
    },
    // For soft entry/exit transitions
    gentle: {
        type: "spring" as const,
        stiffness: 300,
        damping: 22,
        mass: 0.7,
    },
    // For playful interactive elements
    bouncy: {
        type: "spring" as const,
        stiffness: 600,
        damping: 16,
        mass: 0.5,
    },
    // Viscous, flowing liquid feel
    liquid: {
        type: "spring" as const,
        stiffness: 450,
        damping: 22,
        mass: 0.6,
    },
    // Ultra-responsive for counters / numbers
    counter: {
        type: "spring" as const,
        stiffness: 80,
        damping: 18,
        mass: 0.8,
    },
    // Elastic pop for attention-grabbing elements
    pop: {
        type: "spring" as const,
        stiffness: 700,
        damping: 20,
        mass: 0.4,
    },
};

/**
 * Standard Page Motion Variants
 * Professional and cinematic entry
 */
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 8,
        scale: 0.99,
        filter: "blur(2px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
            staggerChildren: 0.03,
        },
    },
    exit: {
        opacity: 0,
        y: -8,
        scale: 0.99,
        filter: "blur(2px)",
        transition: {
            duration: 0.15,
            ease: [0.36, 0, 0.66, -0.56],
        },
    },
};

/**
 * Stagger Container Variants
 */
export const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.04,
        },
    },
};

/**
 * Item Motion Variants
 * Fluid and responsive list items
 */
export const itemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 16,
        scale: 0.97,
        filter: "blur(4px)",
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            ...springPresets.smooth,
            duration: 0.6,
        },
    },
};

/**
 * Card reveal with scale pop
 */
export const cardRevealVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 24,
        scale: 0.92,
        filter: "blur(6px)",
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            ...springPresets.bouncy,
            duration: 0.7,
        },
    },
};

/**
 * Slide from left
 */
export const slideFromLeft: Variants = {
    hidden: { opacity: 0, x: -30, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        transition: { ...springPresets.smooth, duration: 0.5 },
    },
};

/**
 * Slide from right
 */
export const slideFromRight: Variants = {
    hidden: { opacity: 0, x: 30, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        transition: { ...springPresets.smooth, duration: 0.5 },
    },
};

/**
 * Scale-in Variants (for charts/donuts)
 */
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.6, filter: "blur(8px)" },
    visible: {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: { ...springPresets.bouncy, duration: 0.8 },
    },
};

/**
 * FadeIn Variants
 */
export const fadeIn: Variants = {
    hidden: { opacity: 0, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        filter: "blur(0px)",
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
    },
};

/**
 * Hover & Tap Effects
 */
export const interactivePresets = {
    hover: {
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
    },
    tap: {
        scale: 0.985,
        transition: { duration: 0.1, ease: "easeOut" }
    },
};

/**
 * Card hover with glow lift
 */
export const cardHover = {
    hover: {
        y: -6,
        scale: 1.02,
        transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    },
    tap: {
        scale: 0.98,
        y: 0,
        transition: { duration: 0.1 },
    },
};

/**
 * Floating animation for decorative elements
 */
export const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
    },
};

/**
 * Pulse glow for live indicators
 */
export const pulseGlow = {
    scale: [1, 1.2, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
    },
};

/**
 * Shimmer bar animation for progress bars
 */
export const shimmerBar = (width: string, delay: number = 0) => ({
    initial: { width: "0%", opacity: 0 },
    animate: {
        width,
        opacity: 1,
        transition: {
            width: { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.3, delay },
        },
    },
});
