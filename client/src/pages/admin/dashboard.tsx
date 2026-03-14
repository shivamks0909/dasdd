import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardStats, Respondent as SurveyResponse } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
  });

  const latestQuery = useQuery<SurveyResponse[]>({
    queryKey: ["/api/admin/responses"],
    refetchInterval: 10000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-[2rem] bg-white/20" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-[2.5rem] bg-white/20" />
      </div>
    );
  }

  const stats = statsQuery.data || {
    totalProjects: 0,
    totalRespondents: 0,
    completes: 0,
    terminates: 0,
    quotafulls: 0,
    securityTerminates: 0,
    activityData: [],
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Stat Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={Users}
          description="Active Campaign Reach"
          className="shadow-sm"
        />
        <StatCard
          title="Total Traffic"
          value={stats.totalRespondents}
          icon={Activity}
          description="Live Hits Real-time"
          className="shadow-sm"
        />
        <StatCard
          title="Success Chain"
          value={stats.completes}
          icon={CheckCircle2}
          description="Verified Submissions"
          className="shadow-sm"
        />
        <StatCard
          title="System Filtered"
          value={stats.terminates + stats.securityTerminates}
          icon={XCircle}
          description="Fraud & Terminations"
          className="shadow-sm"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Intelligence Chart placeholder - Keeping original layout but making grid 2 cols */}
        <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
            <TrendingUp className="w-32 h-32" />
          </div>
          <CardHeader className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Traffic Pulse (24h)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.activityData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(8px)'
                    }}
                    itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 800, fontSize: '10px', color: '#64748B', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8">
          {/* Security Alert Monitor */}
          <SecurityAlerts />

          {/* Live Event Stream */}
          <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/20 overflow-hidden group">
            <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <Activity className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Event Stream</CardTitle>
              </div>
              <GlassButton
                size="sm"
                className="h-8 px-3 rounded-xl border border-slate-200"
                onClick={() => setLocation("/admin/responses")}
              >
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors" />
              </GlassButton>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto no-scrollbar">
                {latestQuery.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-6 flex items-center gap-4">
                      <Skeleton className="size-10 rounded-full bg-slate-100" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32 bg-slate-100" />
                        <Skeleton className="h-2 w-20 bg-slate-100" />
                      </div>
                    </div>
                  ))
                ) : latestQuery.data?.length === 0 ? (
                  <div className="p-12 text-center text-slate-300 italic text-sm">
                    Silent stream... no records yet
                  </div>
                ) : (
                  latestQuery.data?.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-6 hover:bg-white/40 transition-colors group/item">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">
                          {new Date(r.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <StatusBadge status={r.status || "started"} className="scale-75 origin-right" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 tracking-tight">{r.projectCode}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SecurityAlerts() {
  const { data: alerts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/s2s/alerts"],
    refetchInterval: 10000,
  });

  return (
    <Card className="bg-rose-50/50 border-rose-200 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-rose-100/20 overflow-hidden group">
      <CardHeader className="p-8 border-b border-rose-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-rose-500">Security Guard (Active)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-rose-100/60 max-h-[220px] overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-10 w-full bg-rose-100/50" /></div>
          ) : alerts?.length === 0 ? (
            <div className="p-8 text-center text-rose-300 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
              No security anomalies detected in current partition
            </div>
          ) : (
            alerts?.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-rose-100/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-rose-400 tracking-widest uppercase">
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Threat</span>
                </div>
                <p className="text-xs font-bold text-rose-700 leading-tight">
                  {alert.meta?.details || "Security policy violation detected"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-rose-400 animate-ping" />
                  <span className="text-[9px] font-mono text-rose-400 font-bold uppercase">{alert.oiSession.substring(0, 12)}...</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
