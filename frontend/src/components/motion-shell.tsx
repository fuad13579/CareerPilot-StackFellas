"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

// Premium cubic-bezier easing
const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;
const SOFT_EASE = [0.4, 0, 0.2, 1] as const;

// Entrance animation variants
const entranceVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

// Exit animation variants
const exitVariants = {
  hidden: { opacity: 0, y: -16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FAF7F0]">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAF7F0] via-[#F5F0E8] to-[#FAF7F0]" />
      
      {/* Subtle noise texture */}
      <div className="portfolio-noise absolute inset-0 opacity-30" />
      
      {/* Primary ambient glow - top left */}
      <motion.div
        animate={{ 
          opacity: [0.015, 0.025, 0.015],
          scale: [1, 1.05, 1],
          x: [0, 20, 0],
          y: [0, -10, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-60 top-0 size-[40rem] rounded-full bg-[#1D4ED8] blur-[180px]"
      />
      
      {/* Secondary ambient glow - bottom right */}
      <motion.div
        animate={{ 
          opacity: [0.012, 0.022, 0.012],
          scale: [1, 1.08, 1],
          x: [0, -30, 0],
          y: [0, 15, 0]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-60 bottom-0 size-[45rem] rounded-full bg-[#3B82F6] blur-[200px]"
      />
      
      {/* Tertiary soft glow - center */}
      <motion.div
        animate={{ 
          opacity: [0.008, 0.015, 0.008],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 size-[35rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#93C5FD] blur-[220px]"
      />
    </div>
  );
}

export function PageShell ({
  eyebrow = "CareerPilot",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: PREMIUM_EASE }}
      className="space-y-8 pb-12"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1D4ED8]">
            {eyebrow}
          </p>
          <AnimatedWords text={title} />
          <p className="max-w-2xl text-base font-medium leading-8 text-[#6B7280]">
            {description}
          </p>
        </div>
        <div className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#1D4ED8] shadow-sm">
          Live workspace
        </div>
      </header>
      {children}
    </motion.section>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12, ease: PREMIUM_EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={entranceVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: PREMIUM_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={entranceVariants}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(17,24,39,.08)" }}
      transition={{ duration: 0.6, ease: PREMIUM_EASE }}
      className={`relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,.04)] ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

function AnimatedWords({ text }: { text: string }) {
  return (
    <h1 className="max-w-4xl text-4xl font-extrabold tracking-[-0.035em] text-[#111827] sm:text-5xl">
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: index * 0.05, ease: PREMIUM_EASE }}
          className="mr-3 inline-block"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsubscribe = rounded.on("change", setDisplay);
    const controls = animate(motionValue, value, {
      duration: 1.15,
      ease: "easeOut",
    });

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [motionValue, rounded, value]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}
