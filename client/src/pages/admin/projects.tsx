import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, FolderKanban, BarChart3, Globe2, Users, Pencil, Loader2, Link as LinkIcon, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Project } from "@shared/schema";

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project moved to archive" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Research Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">Orchestrate and monitor your active survey assets</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setLocation("/admin/projects/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </GlassButton>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[2.5rem] bg-white/20" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-[3rem] bg-white/40 border-2 border-dashed border-slate-200 group">
          <div className="p-6 bg-slate-50 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
            <FolderKanban className="w-12 h-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Zero Active Campaigns</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md text-center font-medium">
            Your campaign listing is currently vacant. Initiate your first research project to begin trajectory tracking.
          </p>
          <button
            onClick={() => setLocation("/admin/projects/new")}
            className="mt-8 text-primary font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-8"
          >
            Initiate First Launch →
          </button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden group hover:bg-white/60 hover:border-white hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-0">
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 overflow-hidden">
                      <h3
                        className="font-black text-slate-800 text-xl tracking-tighter truncate group-hover:text-primary transition-colors cursor-pointer"
                        onClick={() => setLocation(`/admin/projects/${project.projectCode}`)}
                      >
                        {project.projectName}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 leading-none">
                          REF: {project.projectCode}
                        </span>
                        <StatusBadge status={project.status || 'active'} className="scale-75 origin-left" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100/60">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Target Reached</span>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-sm font-black text-slate-700">1.2k+</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Global Reach</span>
                      <div className="flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-slate-400" />
                        <span className="text-sm font-black text-slate-700">Multi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/admin/projects/${project.projectCode}`)}
                      className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest group/btn h-auto px-0"
                    >
                      Analyze Hub
                      <BarChart3 className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLocation(`/admin/link-generator?project=${project.projectCode}`)}
                        className="p-3 text-slate-300 hover:text-primary hover:bg-blue-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        title="Generate Supplier Links"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setLocation(`/admin/projects/${project.projectCode}/s2s`)}
                        className="p-3 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        title="S2S Protocol Security"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setLocation(`/admin/projects/${project.id}/edit`)}
                        className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Project"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={deleteMutation.isPending}
                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-30"
                            title="Archive Project"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
                          <div className="p-10">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black text-rose-500 tracking-tight">Archive Campaign</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400 font-medium py-4 leading-relaxed">
                                Moving <span className="text-slate-900 font-bold">{project.projectName}</span> to the archive will halt all active routing. This action can be reversed in the archive settings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-6">
                              <AlertDialogCancel className="h-12 border-slate-200 rounded-xl font-bold bg-slate-50/50 hover:bg-slate-100 transition-colors">Abort</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(project.id)}
                                className="h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200"
                              >
                                Confirm Archival
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
