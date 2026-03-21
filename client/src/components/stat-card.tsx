import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn(
      "bg-white/40 border-slate-200/50 backdrop-blur-xl rounded-[2rem] transition-all duration-500 hover:bg-white/60 hover:border-white hover:shadow-2xl hover:shadow-slate-200/40 group overflow-hidden relative",
      className
    )} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      {/* Decorative inner glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
        <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200/60 group-hover:bg-primary group-hover:border-primary transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/20">
          <Icon className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors duration-500" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-8 pt-2 px-6">
        <div className="flex flex-col">
          <div className="text-3xl font-black text-slate-900 tracking-tighter group-hover:scale-[1.02] transition-transform duration-500 origin-left select-all">
            {value}
          </div>
          {description && (
            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">
              {description}
            </p>
          )}
        </div>
      </CardContent>

      {/* Subtle bottom accent - primary color but very light */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </Card>
  );
}
