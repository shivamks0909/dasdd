import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Search, Filter, Database, Globe, ShieldCheck, ShieldAlert, Clock, Monitor, Smartphone, Tablet as TabletIcon, Activity, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassButton } from "@/components/ui/glass-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type Respondent } from "@shared/schema";

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
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

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
    enabled: exporting, 
  });

  const filteredResponses = responses?.filter((r: any) => {
    const matchesSearch =
      (r.projectCode || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.supplierCode || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.ipAddress || "").includes(search) ||
      String(r.id || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesDevice = deviceFilter === "all" || getDeviceType(r.userAgent || null).toLowerCase() === deviceFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesDevice;
  });

  const handleExportExcel = async (mode: 'current' | 'all' | 'security') => {
    setExporting(true);
    try {
      const params = new URLSearchParams();

      if (mode === 'current') {
        // Apply current active filters from the UI state
        if (search) params.set('search', search);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (deviceFilter !== 'all') params.set('device', deviceFilter);
      }

      if (mode === 'security') {
        params.set('fake_only', 'true');
      }

      params.set('export_mode', mode);

      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(`/api/responses/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(err.message || 'Export failed');
      }

      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const fileName = match ? match[1] : `OpinionInsights_Export_${Date.now()}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Export Success",
        description: `Export complete — ${fileName}`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 h-12 rounded-2xl px-8"
              disabled={exporting}
            >
              {exporting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileSpreadsheet className="h-4 w-4" />
              }
              {exporting ? 'Exporting...' : 'Export'}
              <Download className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl border-none p-2 bg-white/95 backdrop-blur-xl">
            <DropdownMenuLabel className="text-xs text-muted-foreground px-3 py-2">Export Options</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100/50" />
            <DropdownMenuItem 
              onClick={() => handleExportExcel('current')}
              className="rounded-xl focus:bg-emerald-50 focus:text-emerald-700 p-3 cursor-pointer"
            >
              <FileSpreadsheet className="mr-3 h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-sm font-bold">Current View</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">With active filters</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleExportExcel('all')}
              className="rounded-xl focus:bg-blue-50 focus:text-blue-700 p-3 cursor-pointer"
            >
              <FileSpreadsheet className="mr-3 h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-bold">Full Export</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">All records, no filters</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100/50" />
            <DropdownMenuItem 
              onClick={() => handleExportExcel('security')}
              className="rounded-xl focus:bg-red-50 focus:text-red-700 p-3 cursor-pointer"
            >
              <FileSpreadsheet className="mr-3 h-4 w-4 text-red-600" />
              <div>
                <div className="text-sm font-bold">Security Report</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Fake attempts only</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              <Table className="response-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Supplier UID (Incoming)</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Client UID Sent</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100/40">
                  {filteredResponses?.map((row, index) => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">

                      {/* # */}
                      <TableCell className="text-muted-foreground text-sm w-10">
                        {index + 1}
                      </TableCell>

                      {/* Supplier UID (Incoming) — what supplier sent */}
                      <TableCell>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          {row.supplierRid || '—'}
                        </span>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        <div className="text-sm font-medium">{row.supplierName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{row.supplierCode || '—'}</div>
                      </TableCell>

                      {/* Client UID Sent — what we sent to client */}
                      <TableCell>
                        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {row.clientRid || '—'}
                        </span>
                      </TableCell>

                      {/* Project */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {row.projectCode || '—'}
                        </Badge>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.ipAddress || '—'}
                        </span>
                      </TableCell>

                      {/* Device */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {row.deviceType === 'Mobile' && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                          {row.deviceType === 'Tablet' && <TabletIcon className="h-3 w-3 text-muted-foreground" />}
                          {row.deviceType === 'Desktop' && <Monitor className="h-3 w-3 text-muted-foreground" />}
                          {!row.deviceType && <Monitor className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs">{row.deviceType || 'Unknown'}</span>
                        </div>
                      </TableCell>

                      {/* User Agent — truncated with tooltip */}
                      <TableCell className="max-w-[160px]">
                        <span
                          title={row.userAgent || ''}
                          className="text-xs text-muted-foreground truncate block"
                        >
                          {row.userAgent
                            ? row.userAgent.slice(0, 35) + (row.userAgent.length > 35 ? '...' : '')
                            : '—'
                          }
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={row.status || 'started'} />
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.startedAt
                          ? new Date(row.startedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                          : '—'
                        }
                      </TableCell>

                    </TableRow>
                  ))}
                  {!isLoading && filteredResponses?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="h-64 text-center">
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
