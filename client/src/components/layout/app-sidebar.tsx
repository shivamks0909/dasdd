import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Projects", url: "/admin/projects", icon: FolderKanban },
    { title: "Responses", url: "/admin/responses", icon: MessageSquare },
    { title: "Clients", url: "/admin/clients", icon: Users },
    { title: "Suppliers", url: "/admin/suppliers", icon: Truck },
    { title: "Link Generator", url: "/admin/link-generator", icon: LinkIcon },
    { title: "Tool Links", url: "/admin/redirects", icon: ExternalLink },
    { title: "Settings", url: "/admin/settings", icon: Settings },
];

interface AppSidebarProps {
    username?: string;
}

export function AppSidebar({ username }: AppSidebarProps) {
    const [location, setLocation] = useLocation();

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/auth/logout");
        },
        onSuccess: () => {
            localStorage.removeItem("nexus_auth_token");
            queryClient.clear();
            setLocation("/login");
        },
    });

    return (
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0 z-50 transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-900 tracking-tight">Opinion</h1>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">Insights</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2">
                {navItems.map((item) => {
                    const isActive = location === item.url || (item.url !== "/admin/dashboard" && location.startsWith(item.url));
                    return (
                        <Link
                            key={item.title}
                            href={item.url}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-50 text-blue-700 shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                isActive ? "text-blue-600 scale-110" : "text-slate-400 group-hover:scale-110"
                            )} />
                            <span>{item.title}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">{username || "Admin User"}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-semibold">Sign Out</span>
                </Button>
            </div>
        </aside>
    );
}
