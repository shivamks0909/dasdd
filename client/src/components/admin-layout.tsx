import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { WavyBackground } from "@/components/ui/wavy-background";
import { PixelTrail } from "@/components/ui/pixel-trail";
import { useScreenSize } from "@/components/hooks/use-screen-size";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Pixel trail overlay — sits at z-0, above waves but below UI content
function PixelTrailOverlay() {
  const screenSize = useScreenSize();
  const pixelSize = screenSize.lessThan("md") ? 32 : 56;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <PixelTrail
        pixelSize={pixelSize}
        fadeDuration={600}
        delay={0}
        pixelClassName="rounded-full bg-violet-400/60"
      />
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full selection:bg-primary selection:text-white font-sans overflow-hidden relative text-slate-900 transition-colors duration-500">
      {/* Animated Wavy Background — fixed, behind everything */}
      <WavyBackground />

      {/* Interactive Pixel Trail — follows the mouse */}
      <PixelTrailOverlay />

      <Sidebar username={user?.username} />


      <div className="flex flex-col flex-1 min-w-0 relative z-10">
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
