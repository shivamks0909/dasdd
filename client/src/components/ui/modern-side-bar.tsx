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
    ChevronLeft,
    Menu,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Projects", url: "/admin/projects", icon: FolderKanban },
    { title: "Quick Create", url: "/admin/projects/quick-create", icon: Zap },
    { title: "Responses", url: "/admin/responses", icon: MessageSquare },
    { title: "Clients", url: "/admin/clients", icon: Users },
    { title: "Suppliers", url: "/admin/suppliers", icon: Truck },
    { title: "Link Generator", url: "/admin/link-generator", icon: LinkIcon },
    { title: "Tool Links", url: "/admin/redirects", icon: ExternalLink },
    { title: "Settings", url: "/admin/settings", icon: Settings },
];

interface ModernSideBarProps {
    username?: string;
}

export function ModernSideBar({ username }: ModernSideBarProps) {
    const [pathname] = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? "80px" : "260px" }}
            className="hidden md:flex flex-col h-screen sticky top-0 z-50 bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300"
        >
            {/* Header / Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3 overflow-hidden">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200"
                    >
                        <BarChart3 className="w-6 h-6" />
                    </motion.div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="whitespace-nowrap"
                            >
                                <h1 className="text-base font-black text-slate-900 tracking-tight">Opinion</h1>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">Insights</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.url || (item.url !== "/admin/dashboard" && pathname?.startsWith(item.url));
                    return (
                        <Link
                            key={item.title}
                            to={item.url}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-blue-50/50 text-blue-700"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                isActive ? "text-blue-600 scale-110" : "text-slate-400 group-hover:scale-110"
                            )} />
                            
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="whitespace-nowrap"
                                >
                                    {item.title}
                                </motion.span>
                            )}

                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" 
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User */}
            <div className="p-4 mt-auto border-t border-slate-50 bg-slate-50/30">
                <div className={cn(
                    "flex items-center gap-3 px-2 mb-4 overflow-hidden",
                    isCollapsed ? "justify-center" : ""
                )}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                        <User className="w-5 h-5" />
                    </div>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col min-w-0"
                        >
                            <span className="text-xs font-bold text-slate-900 truncate">{username || "Admin User"}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
                        </motion.div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    className={cn(
                        "w-full gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200",
                        isCollapsed ? "justify-center px-0" : "justify-start px-4"
                    )}
                >
                    <LogOut className="w-4 h-4" />
                    {!isCollapsed && <span className="text-sm font-semibold">Sign Out</span>}
                </Button>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm hover:shadow-md transition-all duration-200 z-50 mr-[-3px]"
            >
                {isCollapsed ? <ChevronLeft className="w-4 h-4 rotate-180" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
        </motion.aside>
    );
}
