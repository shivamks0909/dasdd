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

  const irPercent = stats.totalRespondents > 0
    ? ((stats.completes / stats.totalRespondents) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-10 pb-12">
      {/* 8 Stat Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard
          title="Total Hits"
          value={stats.totalRespondents}
          icon={Activity}
          description="Total Router Clicks"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Total Starts"
          value={stats.totalRespondents}
          icon={Users}
          description="In-Progress Sessions"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Completes"
          value={stats.completes}
          icon={CheckCircle2}
          description="Successful Submissions"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Terminates"
          value={stats.terminates}
          icon={XCircle}
          description="Screened Out"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Quota Full"
          value={stats.quotafulls}
          icon={AlertCircle}
          description="Over Quota Capacity"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Security / Fraud"
          value={stats.securityTerminates}
          icon={ShieldAlert}
          description="Blocked Sessions"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Conversion (IR %)"
          value={`${irPercent}%`}
          icon={TrendingUp}
          description="Completes / Starts"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
        <StatCard
          title="Revenue"
          value="$0.00"
          icon={Activity}
          description="Estimated (Optional)"
          className="shadow-sm border-slate-200/60 bg-white/60"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Intelligence Chart placeholder - Keeping original layout but making grid 3 cols */}
        <Card className="lg:col-span-2 bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/20 overflow-hidden relative group">
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
        </div>
      </div>

      {/* 2️⃣ LIVE TRAFFIC PANEL 🔴 */}
      <Card className="bg-white/60 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/20 overflow-hidden group">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Live Traffic Panel</CardTitle>
            </div>
            <p className="text-xs text-slate-400 font-semibold pl-6">Real-time cross-network router stream</p>
          </div>
          <GlassButton
            size="sm"
            className="h-10 px-5 rounded-xl border border-slate-200 font-bold tracking-widest text-[10px] uppercase text-slate-500 hover:text-primary transition-colors"
            onClick={() => setLocation("/admin/responses")}
          >
            Full Log <ArrowRight className="w-3 h-3 ml-2 inline-block" />
          </GlassButton>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier UID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Client UID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Country</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {latestQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-6"><Skeleton className="h-4 w-16 bg-slate-100" /></td>
                      <td className="p-6"><Skeleton className="h-4 w-24 bg-slate-100" /></td>
                      <td className="p-6"><Skeleton className="h-4 w-32 bg-slate-100" /></td>
                      <td className="p-6"><Skeleton className="h-4 w-32 bg-slate-100" /></td>
                      <td className="p-6"><Skeleton className="h-4 w-20 bg-slate-100" /></td>
                      <td className="p-6"><Skeleton className="h-4 w-12 bg-slate-100" /></td>
                      <td className="p-6 flex justify-end"><Skeleton className="h-6 w-20 bg-slate-100 rounded-full" /></td>
                    </tr>
                  ))
                ) : latestQuery.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold text-sm">
                      Silent stream... no records yet
                    </td>
                  </tr>
                ) : (
                  latestQuery.data?.slice(0, 10).map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/80 transition-colors group">
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                        {new Date(r.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-tight">
                        {r.supplierName || r.supplierCode || "Direct"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 truncate max-w-[120px]" title={r.supplierRid || r.id}>
                        {r.supplierRid || r.id}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 truncate max-w-[120px]" title={r.clientRid || "..."}>
                        {r.clientRid || "CONNECTING"}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase">
                        {r.projectName || r.projectCode}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                        {r.countryCode || "US"}
                      </td>
                      <td className="px-6 py-4 flex justify-end">
                        <StatusBadge status={r.status || "started"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
