"use client";

import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Users,
  Truck,
  Link as LinkIcon,
  ExternalLink,
  Settings,
  LogOut,
  BarChart3,
  User,
  Zap,
  Menu,
  X,
  Loader2
} from "lucide-react";
import {
  SunIcon,
  MoonIcon,
  CloudIcon,
  RainIcon,
  HeavyRainIcon,
  SnowIcon,
  ThunderIcon,
  WindIcon,
  FogIcon,
  PartlyCloudyIcon,
  SunriseIcon,
  RainbowIcon
} from "@/components/ui/weather-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const navItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: SunIcon },
  { title: "Projects", url: "/admin/projects", icon: CloudIcon },
  { title: "Quick Create", url: "/admin/projects/quick-create", icon: ThunderIcon },
  { title: "Responses", url: "/admin/responses", icon: MoonIcon },
  { title: "Clients", url: "/admin/clients", icon: SunriseIcon },
  { title: "Suppliers", url: "/admin/suppliers", icon: WindIcon },
  { title: "Link Generator", url: "/admin/link-generator", icon: LinkIcon },
  { title: "Tool Links", url: "/admin/redirects", icon: ExternalLink },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const AnimatedMenuToggle = ({
  toggle,
  isOpen,
}: {
  toggle: () => void;
  isOpen: boolean;
}) => (
  <button
    onClick={toggle}
    aria-label="Toggle menu"
    className="focus:outline-none z-50 p-2 rounded-xl hover:bg-slate-100 transition-colors"
  >
    <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
      {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </motion.div>
  </button>
);

interface SidebarProps {
  username?: string;
}

const Sidebar = ({ username }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pathname] = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      window.location.href = "/login";
    },
    onError: () => {
      // Fallback if API fails
      window.location.href = "/login";
    }
  });

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60">
      {/* Profile Section */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{username || "Admin"}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Administrator</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/admin/dashboard" && pathname?.startsWith(item.url));
            return (
              <Link key={item.title} to={item.url}>
                <button
                  className={cn(
                    "flex gap-3 py-3 px-4 rounded-xl items-center w-full transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon 
                    size={20}
                    className={cn(
                      "transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary" : "text-slate-400"
                    )} 
                  />
                  <span className="text-sm font-bold tracking-tight">{item.title}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                    />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all duration-200"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar Toggle - Hidden on desktop */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 md:hidden"
            >
              <NavContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col sticky top-0 h-screen w-72 flex-shrink-0 z-30">
        <NavContent />
      </aside>
    </>
  );
};

export { Sidebar };
