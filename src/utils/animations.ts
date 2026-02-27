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
    }
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
            staggerChildren: 0.02,
            delayChildren: 0.02,
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
        y: 10,
        scale: 0.98,
        filter: "blur(2px)",
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: springPresets.smooth,
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
        scale: 1.01,
        y: -1,
        transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
    },
    tap: {
        scale: 0.985,
        transition: { duration: 0.1, ease: "easeOut" }
    },
};
