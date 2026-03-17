"use client";

import React, { useState } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlassButton } from "@/components/ui/glass-button";
import { motion } from "framer-motion";
import { BarChart3, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Logic will be handled by the auth flow
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 relative bg-white overflow-hidden">
      {/* Background Animation */}
      <BackgroundPaths />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Opinion</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mt-1">Insights Mission Control</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <GlassButton 
                variant="primary" 
                className="w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Sign In to Platform"}
              </GlassButton>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} OpinionInsights. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
