import { useQuery } from "@tanstack/react-query";
import { SupplierLayout } from "@/components/layout/supplier-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, RotateCcw, Copy, ExternalLink, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function SupplierProjectsPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/supplier/projects"], 
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      const name = p.project_name || p.projectName || "";
      const code = p.project_code || p.projectCode || "";
      return name.toLowerCase().includes(search.toLowerCase()) || code.toLowerCase().includes(search.toLowerCase());
    });
  }, [projects, search]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link Copied",
      description: "Project entry link copied to clipboard",
    });
  };

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <h2 className="text-[24px] font-normal text-slate-700">Assigned Projects</h2>
      </div>

      <Card className="border-none shadow-sm rounded-sm">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search projects..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white border-slate-200 h-[40px] rounded-sm text-sm"
              />
            </div>
            <Button 
              variant="outline" 
              className="border-slate-300 text-slate-600 hover:bg-slate-50 px-4 h-[40px] rounded-sm flex items-center gap-2"
              onClick={() => setSearch("")}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12">Project Name</TableHead>
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12">Project Code</TableHead>
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12">Stats (Complete / Total)</TableHead>
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12">Status</TableHead>
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12">Created At</TableHead>
                  <TableHead className="text-[13px] font-bold text-slate-800 h-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={5} className="h-16 bg-slate-50/50"></TableCell>
                    </TableRow>
                  ))
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-slate-400 text-sm italic bg-white">
                      No projects assigned yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((p, i) => {
                    const name = p.project_name || p.projectName;
                    const code = p.project_code || p.projectCode;
                    return (
                    <TableRow key={p.id || code} className={cn("border-b border-slate-100 transition-colors", i % 2 === 0 ? "bg-[#f9f9f9]" : "bg-white")}>
                      <TableCell className="py-4 text-[13px] font-medium text-slate-700">
                        <Link href={`/supplier/projects/${code}`} className="text-blue-600 hover:underline">{name}</Link>
                      </TableCell>
                      <TableCell className="py-4 text-[13px] text-slate-600 font-mono">{code}</TableCell>
                      <TableCell className="py-4 text-[13px] text-slate-600">
                        {p.my_stats ? (
                          <span className="font-semibold text-emerald-600">{p.my_stats.complete}</span>
                        ) : "—"} / {p.my_stats?.total || 0}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn("px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase", 
                          p.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-[12px] text-slate-500">
                        {p.created_at || p.createdAt ? new Date(p.created_at || p.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200"
                            onClick={() => copyToClipboard(`${window.location.origin}/t/${code}?sup={SUPPLIER_CODE}&uid={RESPONDENT_ID}`)}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Link
                          </Button>
                          <Link href={`/supplier/projects/${code}`}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 border-slate-200 text-slate-600"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
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
