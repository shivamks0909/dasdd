"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function BackgroundPaths() {
  const paths = [
    {
      d: "M-100,50 Q200,10 500,50 T1100,50",
      duration: 20,
      stroke: "rgba(59, 130, 246, 0.08)",
    },
    {
      d: "M-100,80 Q300,40 600,80 T1100,80",
      duration: 25,
      stroke: "rgba(59, 130, 246, 0.05)",
    },
    {
      d: "M-100,20 Q400,60 700,20 T1100,20",
      duration: 18,
      stroke: "rgba(59, 130, 246, 0.07)",
    },
    {
      d: "M-100,100 Q100,10 400,100 T1100,100",
      duration: 30,
      stroke: "rgba(59, 130, 246, 0.04)",
    },
  ];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50/50">
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
      >
        {paths.map((path, i) => (
          <motion.path
            key={i}
            d={path.d}
            fill="none"
            stroke={path.stroke}
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0, 1, 0],
              x: [0, 50, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
      {/* Soft gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/10 to-transparent" />
    </div>
  );
}
