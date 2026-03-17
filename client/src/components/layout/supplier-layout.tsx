import { SupplierSidebar } from "./supplier-sidebar";
import { useSupplierAuth } from "@/hooks/use-supplier-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Menu, LogOut, Square } from "lucide-react";

interface SupplierLayoutProps {
  children: React.ReactNode;
}

export function SupplierLayout({ children }: SupplierLayoutProps) {
  const { user } = useSupplierAuth();
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/supplier/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/supplier/login");
    },
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f4f7f6] font-sans text-slate-800">
      {/* Header */}
      <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Square className="w-6 h-6 text-[#007bff] fill-[#007bff] rotate-45" />
            </div>
            <div className="leading-none">
              <span className="block text-[16px] font-bold text-slate-800">Opinion Insights</span>
              <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">SUPPLIER</span>
            </div>
          </div>
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <button 
          onClick={() => logoutMutation.mutate()}
          className="w-10 h-10 flex items-center justify-center text-[#007bff] hover:bg-slate-100 rounded-md transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <SupplierSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
