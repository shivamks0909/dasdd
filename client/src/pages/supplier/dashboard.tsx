import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SupplierLayout } from "@/components/layout/supplier-layout";
import { StatCard } from "@/components/stat-card";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import type { Respondent, DashboardStats } from "@shared/schema";

interface SupplierDashboardData extends DashboardStats {
  assignedProjects: Array<{
    id: string;
    projectCode: string;
    projectName: string;
    supplierLink: string;
    status: string;
  }>;
}

export default function SupplierDashboardPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [pidSearch, setPidSearch] = useState("");
  const [ridSearch, setRidSearch] = useState("");
  const [ipSearch, setIpSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState("10");

  const { data: stats, isLoading: statsLoading } = useQuery<SupplierDashboardData>({
    queryKey: ["/api/supplier/dashboard"],
    refetchInterval: 30000,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<Respondent[]>({
    queryKey: ["/api/supplier/responses"],
    refetchInterval: 30000,
  });

  const [isExporting, setIsExporting] = useState(false);
  const isLoading = statsLoading || responsesLoading;

  const countryMap: Record<string, string> = {
    "US": "United States",
    "GB": "United Kingdom",
    "IN": "India",
    "DE": "Germany",
    "FR": "France",
    "CA": "Canada",
    "AU": "Australia",
    "BR": "Brazil",
    "JP": "Japan",
    "GLOBAL": "Global Operations"
  };

  const responsesList = Array.isArray(responses) ? responses : [];

  const filteredResponses = useMemo(() => {
    if (!responsesList.length) return [];
    return responsesList.filter((r) => {
      const matchesPid = r.projectCode.toLowerCase().includes(pidSearch.toLowerCase());
      const matchesRid = (r.supplierRid || "").toLowerCase().includes(ridSearch.toLowerCase());
      const matchesIp = (r.ipAddress || "").toLowerCase().includes(ipSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesPid && matchesRid && matchesIp && matchesStatus;
    });
  }, [responsesList, pidSearch, ridSearch, ipSearch, statusFilter]);

  const paginatedResponses = useMemo(() => {
    const start = (currentPage - 1) * parseInt(entriesPerPage);
    return filteredResponses.slice(start, start + parseInt(entriesPerPage));
  }, [filteredResponses, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredResponses.length / parseInt(entriesPerPage));

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/supplier/responses/export-excel");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OpinionInsights_Supplier_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Success",
        description: "Your Excel report has been generated successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate Excel report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <SupplierLayout>
        <div className="space-y-8 animate-pulse">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-[1.5rem] bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-[600px] w-full rounded-[2rem] bg-white/5" />
        </div>
      </SupplierLayout>
    );
  }

  const dashboardStats = stats || {
    totalRespondents: 0,
    completes: 0,
    terminates: 0,
    quotafulls: 0,
    securityTerminates: 0,
    totalProjects: 0,
    activityData: [],
    assignedProjects: [],
  };

  return (
    <SupplierLayout>
      <div className="space-y-8 pb-12">
        {/* Today's Statistics */}
        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Active Session Sync (Live)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Traffic"
              value={dashboardStats.totalRespondents}
              icon={Activity}
              className="bg-slate-900/40 border-slate-800/50 hover:border-blue-500/30 group"
              description="Today's total attempts"
            />
            <StatCard
              title="Completes"
              value={dashboardStats.completes}
              icon={CheckCircle2}
              className="bg-emerald-950/20 border-emerald-900/30 hover:border-emerald-500/30"
              description="Validated success"
            />
            <StatCard
              title="Terminates"
              value={dashboardStats.terminates}
              icon={XCircle}
              className="bg-rose-950/20 border-rose-900/30 hover:border-rose-500/30"
              description="Filtered / Disqualified"
            />
            <StatCard
              title="Quota Full"
              value={dashboardStats.quotafulls}
              icon={AlertCircle}
              className="bg-amber-950/20 border-amber-900/30 hover:border-amber-500/30"
              description="Over quota ceiling"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[150px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="PID Search..."
                  value={pidSearch}
                  onChange={(e) => setPidSearch(e.target.value)}
                  className="pl-9 h-10 bg-black/40 border-white/5 text-xs font-bold"
                />
              </div>
              <div className="flex-1 min-w-[150px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="RID Search..."
                  value={ridSearch}
                  onChange={(e) => setRidSearch(e.target.value)}
                  className="pl-9 h-10 bg-black/40 border-white/5 text-xs font-bold"
                />
              </div>
              <div className="flex-1 min-w-[150px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="IP Search..."
                  value={ipSearch}
                  onChange={(e) => setIpSearch(e.target.value)}
                  className="pl-9 h-10 bg-black/40 border-white/5 text-xs font-bold"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 bg-black/40 border-white/5 text-xs font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="terminate">Terminate</SelectItem>
                  <SelectItem value="quotafull">Quota Full</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPidSearch("");
                  setRidSearch("");
                  setIpSearch("");
                  setStatusFilter("all");
                }}
                className="h-10 border-white/5 bg-black/20 text-xs font-bold px-4"
              >
                Reset
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || !filteredResponses.length}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-xs font-black px-6 ml-auto shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    PREPARING...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-2" />
                    EXPORT EXCEL
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 11-column Respondents Table */}
        <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
          <CardHeader className="px-8 py-6 border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white">Respondent stream</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-500 mt-1">REAL-TIME TRAFFIC SEGREGATION</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Show:</span>
              <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                <SelectTrigger className="w-20 h-7 bg-black/40 border-white/5 text-[10px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/20">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">Project ID</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-4 h-auto whitespace-nowrap">Parent</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-4 h-auto whitespace-nowrap">Country</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-4 h-auto whitespace-nowrap">PanelID</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">Respondent ID</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-4 h-auto whitespace-nowrap text-center">LOI</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">Start Time</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">End Time</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">Start IP</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap">End IP</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 py-4 px-6 h-auto whitespace-nowrap text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                          <Database className="w-10 h-10 text-white" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">No stream data available</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedResponses.map((r, i) => {
                      const getLOI = (start?: string | Date, end?: string | Date | null) => {
                        if (!start || !end) return "0";
                        const s = new Date(start).getTime();
                        const e = new Date(end).getTime();
                        return Math.floor((e - s) / 60000);
                      };

                      return (
                        <TableRow key={r.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <TableCell className="px-6 py-4">
                            <span className="text-[11px] font-black text-white">{r.projectCode}</span>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-[10px] font-bold text-slate-600">0</TableCell>
                          <TableCell className="px-4 py-4">
                            <span className="text-[10px] font-bold text-slate-400">{countryMap[r.countryCode || "US"] || r.countryCode || "Global"}</span>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <span className="text-[10px] font-black text-blue-500/80">#{filteredResponses.length - ((currentPage - 1) * parseInt(entriesPerPage) + i)}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <code className="text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                              {r.supplierRid || "anonymous"}
                            </code>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <span className="text-[10px] font-black text-slate-500">{getLOI(r.startedAt, r.completedAt)}m</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-400">
                              {r.startedAt ? new Date(r.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-400">
                              {r.completedAt ? new Date(r.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-[10px] font-mono text-slate-500">{r.ipAddress || "—"}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-[10px] font-mono text-slate-500">{r.ipAddress || "—"}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <StatusBadge status={r.status || "started"} className="scale-90 origin-right" />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Showing {(currentPage - 1) * parseInt(entriesPerPage) + 1} to {Math.min(currentPage * parseInt(entriesPerPage), filteredResponses.length)} of {filteredResponses.length} units
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0 bg-white/5 disabled:opacity-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "h-8 w-8 p-0 text-[10px] font-black",
                        currentPage === i + 1 ? "bg-blue-600" : "bg-white/5"
                      )}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0 bg-white/5 disabled:opacity-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SupplierLayout>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
