import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Trash2, ShieldCheck, Database } from "lucide-react";
import { z } from "zod";
import type { Respondent } from "@shared/schema";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const { data: responsesData } = useQuery<{ data: Respondent[]; total: number }>({
    queryKey: ["/api/responses", "?limit=1"],
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      await apiRequest("POST", "/api/secret-reset", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: "Password updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/responses?limit=10000");
      const result = await res.json();
      if (result.data && result.data.length > 0) {
        const ids = result.data.map((r: Respondent) => r.id);
        await apiRequest("DELETE", "/api/responses/bulk", { ids });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/responses"] });
      toast({ title: "All responses deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900" data-testid="text-settings-title">Control Panel</h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">System configuration and security management</p>
        </div>
      </div>

      <div className="grid gap-8 max-w-2xl">
        <Card className="bg-white/40 border-slate-200/60 rounded-[2.5rem] backdrop-blur-2xl shadow-xl shadow-slate-200/5 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
            <Lock className="w-32 h-32" />
          </div>
          <CardHeader className="p-8 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-[1.5rem] border border-primary/20">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Access Integrity</CardTitle>
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Maintain secure administrative credentials</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 relative z-10">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Current Secret</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-current-password" placeholder="••••••••" className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold px-5" />
                      </FormControl>
                      <FormMessage className="text-rose-500 text-[10px] font-black uppercase ml-1" />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">New Phrase</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} data-testid="input-new-password" placeholder="••••••••" className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold px-5" />
                        </FormControl>
                        <FormMessage className="text-rose-500 text-[10px] font-black uppercase ml-1" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Confirm Identity</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} data-testid="input-confirm-password" placeholder="••••••••" className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold px-5" />
                        </FormControl>
                        <FormMessage className="text-rose-500 text-[10px] font-black uppercase ml-1" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                    className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {changePasswordMutation.isPending ? "Hashing..." : "Commit Update"}
                  </button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-white/40 border-slate-200/60 rounded-[2.5rem] backdrop-blur-2xl shadow-xl shadow-slate-200/5 overflow-hidden relative border-rose-500/20 group hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <Database className="w-32 h-32" />
          </div>
          <CardHeader className="p-8 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-[1.5rem] border border-rose-500/20 group-hover:bg-rose-500 transition-colors duration-500">
                <Trash2 className="w-6 h-6 text-rose-500 group-hover:text-white transition-colors duration-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Erase Protocol</CardTitle>
                <CardDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">System-wide data purging operations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 relative z-10">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="space-y-1">
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]" data-testid="text-response-count">
                  Indexed Data Points
                </p>
                <p className="text-2xl font-black text-slate-600">
                  {responsesData?.total ?? "---"} <span className="text-[10px] font-bold text-slate-300 uppercase">Records</span>
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={!responsesData?.total || responsesData.total === 0}
                    data-testid="button-delete-all-responses"
                    className="flex items-center gap-3 bg-rose-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Nuclear Purge
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
                  <div className="p-10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black text-rose-500 tracking-tight">Confirm Global Deletion</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400 font-medium py-4 leading-relaxed">
                        This action will permanently erase all {responsesData?.total} respondent records from the cloud database. This process is irreversable and will terminate all active audit logs.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                      <AlertDialogCancel data-testid="button-cancel-delete-all" className="h-12 border-slate-200 rounded-xl font-bold bg-slate-50/50 hover:bg-slate-100 transition-colors">Abort Operation</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => bulkDeleteAllMutation.mutate()}
                        data-testid="button-confirm-delete-all"
                        className="h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        {bulkDeleteAllMutation.isPending ? "Wiping..." : "Confirm Purge"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
