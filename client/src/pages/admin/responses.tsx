import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Download, FileSpreadsheet, Search, Filter, Database, Globe, ShieldCheck, ShieldAlert, Clock, Monitor, Smartphone, Tablet as TabletIcon, Activity, CheckCircle2, ChevronRight } from "lucide-react";
import type { Respondent } from "@shared/schema";
import { GlassButton } from "@/components/ui/glass-button";

interface EnrichedRespondent extends Respondent {
  supplierName?: string;
  projectName?: string;
}

const getDeviceIcon = (ua: string | null) => {
  if (!ua) return <Monitor className="w-4 h-4 text-slate-300" />;
  if (/mobile/i.test(ua)) return <Smartphone className="w-4 h-4 text-blue-400" />;
  if (/tablet/i.test(ua)) return <TabletIcon className="w-4 h-4 text-emerald-400" />;
  return <Monitor className="w-4 h-4 text-slate-400" />;
};

const getDeviceType = (ua: string | null) => {
  if (!ua) return "Desktop";
  if (/mobile/i.test(ua)) return "Mobile";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Desktop";
};

export default function ResponsesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: responses, isLoading } = useQuery<EnrichedRespondent[]>({
    queryKey: ["/api/admin/responses"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/admin/projects"],
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ["/api/admin/suppliers"],
  });

  const { data: s2sLogs } = useQuery<any[]>({
    queryKey: ["/api/s2s/alerts"], // Reusing security alerts or we could add a dedicated endpoint if needed
    enabled: isExporting, 
  });

  const filteredResponses = responses?.filter((r) => {
    const matchesSearch =
      r.projectCode.toLowerCase().includes(search.toLowerCase()) ||
      (r.supplierCode || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.ipAddress || "").includes(search) ||
      String(r.id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesDevice = deviceFilter === "all" || getDeviceType(r.userAgent || null).toLowerCase() === deviceFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesDevice;
  });

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/responses/export-excel");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OpinionInsights_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Excel Export Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 font-inter">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            Response Tracking
          </h1>
          <p className="text-sm text-slate-400 font-semibold">Live logs of all activity across projects.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/40 p-1 rounded-[2rem] border border-slate-200/40 backdrop-blur-xl transition-all">
        <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
           <div className="relative group flex-1 max-w-md">
            <Input
              placeholder="Filter IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-5 h-12 bg-white/80 border-slate-100/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-sm font-semibold text-slate-600 placeholder:text-slate-300 border-none shadow-sm"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44 h-12 bg-white/80 border-none rounded-2xl text-slate-500 font-bold px-5 shadow-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-xl border-none">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="terminate">Terminate</SelectItem>
              <SelectItem value="quotafull">Quota Full</SelectItem>
              <SelectItem value="started">In Progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-full md:w-44 h-12 bg-white/80 border-none rounded-2xl text-slate-500 font-bold px-5 shadow-sm">
              <SelectValue placeholder="All Devices" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-xl">
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>

          <GlassButton className="bg-slate-900 text-white rounded-2xl h-12 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
            Filter
          </GlassButton>
        </div>

        <GlassButton
          className="bg-primary text-white hover:bg-primary/90 px-8 py-3 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-primary/20 w-full md:w-auto"
          onClick={handleExcelExport}
          disabled={isExporting}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isExporting ? 'EXPORTING...' : 'EXPORT RESPONSES (EXCEL)'}
        </GlassButton>
      </div>

      <Card className="bg-white/40 border-none rounded-[2.5rem] backdrop-blur-2xl shadow-2xl shadow-slate-200/30 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-50" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Supplier UID (Incoming)</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Supplier</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Client UID Sent</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Project</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">IP Address</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Device</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">User Agent</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto">Status</TableHead>
                    <TableHead className="font-black text-[9px] uppercase tracking-widest text-slate-400 px-6 py-6 h-auto text-right flex items-center justify-end gap-1">
                      Timestamp <Clock className="w-3 h-3 animate-pulse text-emerald-500" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100/40">
                  {filteredResponses?.map((r) => {
                    const getLOI = (start?: string | Date, end?: string | Date | null) => {
                      if (!start || !end) return "—";
                      const s = new Date(start).getTime();
                      const e = new Date(end).getTime();
                      const diff = Math.floor((e - s) / 60000);
                      return `${diff}m`;
                    };

                    return (
                      <TableRow key={r.id} className="group hover:bg-slate-50 transition-all border-none">
                        <TableCell className="px-6 py-8">
                           <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-400 font-mono tracking-tight">{r.supplierRid || r.id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                           <span className="text-[11px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                            {r.supplierName || r.supplierCode || "Direct"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6">
                           <div className="flex flex-col gap-1">
                            <span className="text-[13px] font-black text-slate-700 font-mono tracking-tight uppercase">{r.clientRid || "CONNECTING..."}</span>
                            <span className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.2em]">Rid-Generated</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                           <div className="flex flex-col">
                            <span className="text-[12px] font-black text-slate-800 tracking-tight leading-none mb-1 uppercase">{r.projectName || r.projectCode}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-widest">{r.projectCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <span className="text-[11px] font-mono font-bold text-slate-500">{r.ipAddress || "0.0.0.0"}</span>
                        </TableCell>
                        <TableCell className="px-6">
                           <div className="flex flex-col items-center gap-1">
                            {getDeviceIcon(r.userAgent || null)}
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{getDeviceType(r.userAgent || null)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 max-w-[120px]">
                           <span className="text-[10px] text-slate-400 truncate block leading-relaxed" title={r.userAgent || ""}>
                            {r.userAgent || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6">
                        <StatusBadge status={r.status || "started"} className="h-6 text-[9px] font-black" />
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-black text-slate-600 whitespace-nowrap">
                              {new Date(r.startedAt || Date.now()).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                              {new Date(r.startedAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && filteredResponses?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                          <Database className="w-12 h-12 text-slate-400" />
                          <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">No Synchronized Records</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
