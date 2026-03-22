import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full font-sans overflow-hidden bg-[#f8fafc]">
      <Sidebar username={user?.username} />

      <div className="flex flex-col flex-1 min-w-0 relative">
        <header className="flex items-center gap-2 p-6 border-b border-slate-200/60 sticky top-0 z-40 bg-white/40 backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">Control Hub</h2>
            <p className="text-sm font-bold text-slate-400 capitalize">Management Deck</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
