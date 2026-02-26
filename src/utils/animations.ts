import { Variants } from "framer-motion";

/**
 * Premium Spring Configurations
 * Faster, snappier, and more realistic feel.
 */
export const springPresets = {
    snappy: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        mass: 1,
    },
    smooth: {
        type: "spring" as const,
        stiffness: 150,
        damping: 20,
        mass: 1,
    },
    gentle: {
        type: "spring" as const,
        stiffness: 70,
        damping: 15,
        mass: 1,
    },
    bouncy: {
        type: "spring" as const,
        stiffness: 400,
        damping: 15,
        mass: 0.8,
    },
};

/**
 * Standard Page Motion Variants
 */
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 10,
        filter: "blur(5px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 0.4,
            ease: "easeOut",
            staggerChildren: 0.05,
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        filter: "blur(5px)",
        transition: {
            duration: 0.3,
            ease: "easeIn",
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
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

/**
 * Item Motion Variants
 */
export const itemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: springPresets.snappy,
    },
};

/**
 * FadeIn Variants
 */
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.5, ease: "easeOut" }
    },
};

/**
 * Hover & Tap Effects
 */
export const interactivePresets = {
    hover: {
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
    },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeOut" }
    },
};
