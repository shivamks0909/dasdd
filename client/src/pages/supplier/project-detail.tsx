import { useQuery } from "@tanstack/react-query";
import { SupplierLayout } from "@/components/layout/supplier-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supplierFetch } from "@/lib/supplier-fetch";
import { Link } from "wouter";

interface ProjectStats {
  total: number;
  complete: number;
  terminate: number;
  quota_full: number;
  security: number;
  started: number;
}

export default function SupplierProjectDetailPage({ code }: { code: string }) {
  const { toast } = useToast();

  const { data: stats, isLoading: isStatsLoading } = useQuery<ProjectStats>({
    queryKey: [`/api/supplier/projects/${code}/stats`],
  });

  const { data: respondents, isLoading: isRespondentsLoading } = useQuery<any[]>({
    queryKey: ["/api/supplier/respondents"],
    select: (data) => data.filter((r) => r.projectCode === code),
  });

  const handleExport = async () => {
    try {
      const res = await supplierFetch("/api/supplier/responses/export-excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${code}_responses_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Your responses have been downloaded.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to download responses.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isStatsLoading || isRespondentsLoading;

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/supplier/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-[24px] font-normal text-slate-700">Project: {code}</h2>
          </div>
          <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm h-[40px]">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats?.total || 0, color: "text-blue-600" },
            { label: "Completes", value: stats?.complete || 0, color: "text-emerald-600" },
            { label: "Terminates", value: stats?.terminate || 0, color: "text-red-500" },
            { label: "Quota Full", value: stats?.quota_full || 0, color: "text-amber-500" },
            { label: "Security", value: stats?.security || 0, color: "text-purple-500" },
            { label: "Started", value: stats?.started || 0, color: "text-slate-500" }
          ].map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm rounded-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm rounded-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-medium text-slate-800">Assigned Respondents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[13px] font-medium text-slate-600">Respondent ID</TableHead>
                    <TableHead className="text-[13px] font-medium text-slate-600">Status</TableHead>
                    <TableHead className="text-[13px] font-medium text-slate-600">IP Address</TableHead>
                    <TableHead className="text-[13px] font-medium text-slate-600">Time Limit</TableHead>
                    <TableHead className="text-[13px] font-medium text-slate-600">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : !respondents || respondents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                        No respondents found for this project
                      </TableCell>
                    </TableRow>
                  ) : (
                    respondents.map((r) => (
                      <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-[13px] text-slate-700">{r.supplierRespondentId}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold uppercase ${
                            r.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'terminate' ? 'bg-red-100 text-red-700' :
                            r.status === 'quota_full' ? 'bg-amber-100 text-amber-700' :
                            r.status === 'security_terminate' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] text-slate-600 font-mono">{r.ipAddress || '—'}</TableCell>
                        <TableCell className="text-[13px] text-slate-600">{r.terminatesOnTimeLimit ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-[13px] text-slate-600">{new Date(r.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupplierLayout>
  );
}
