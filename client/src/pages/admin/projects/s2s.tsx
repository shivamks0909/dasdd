import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GlassButton } from "@/components/ui/glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, ShieldCheck, ShieldAlert, Key, Clipboard, Save, ArrowLeft, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function S2SConfigPage() {
  const [, params] = useRoute("/admin/projects/:code/s2s");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectCode = params?.code;

  const { data: config, isLoading: configLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectCode}/s2s-config`],
    enabled: !!projectCode,
  });

  const { data: logs, isLoading: logsLoading } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectCode}/s2s-logs`],
    enabled: !!projectCode,
    refetchInterval: 5000,
  });

  const [s2sSecret, setS2sSecret] = useState("");
  const [requireS2S, setRequireS2S] = useState(false);

  useEffect(() => {
    if (config) {
      setS2sSecret(config.s2sSecret || "");
      setRequireS2S(config.requireS2S || false);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: { s2sSecret: string; requireS2S: boolean }) => {
      await apiRequest("POST", `/api/projects/${projectCode}/s2s-config`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectCode}/s2s-config`] });
      toast({ title: "S2S Configuration Saved", description: "Your security settings have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setS2sSecret(secret);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (configLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-12 w-1/3 rounded-xl bg-slate-100" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-[2.5rem] bg-slate-100" />
          <Skeleton className="h-64 rounded-[2.5rem] bg-slate-100" />
        </div>
      </div>
    );
  }

  const s2sCallbackUrl = `${window.location.origin}/api/s2s/callback`;

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div className="flex items-center gap-4">
          <GlassButton 
            size="icon" 
            className="rounded-xl border border-slate-200"
            onClick={() => setLocation(`/admin/projects`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </GlassButton>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">S2S Protocol Security</h1>
            <p className="text-sm text-slate-400 mt-1 font-bold">Secure Server-to-Server callback configuration for project: <span className="text-primary">{projectCode}</span></p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/5 overflow-hidden border-t-4 border-t-primary/20">
          <CardHeader className="p-8 border-b border-slate-100/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Security Parameters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-sm font-black text-slate-700 uppercase tracking-wider">Protocol Enforcement</Label>
                <p className="text-[11px] font-bold text-slate-400">Require secure S2S callback for complete status</p>
              </div>
              <Switch checked={requireS2S} onCheckedChange={setRequireS2S} className="data-[state=checked]:bg-primary" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Encryption Secret Key</Label>
                <button 
                  onClick={generateSecret}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Generate New
                </button>
              </div>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <Input 
                  value={s2sSecret}
                  onChange={(e) => setS2sSecret(e.target.value)}
                  placeholder="Enter secret or generate one..."
                  className="pl-12 h-14 bg-white/60 border-slate-200/60 rounded-2xl focus:bg-white transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Callback Endpoint Environment</Label>
               <div className="flex gap-2">
                 <div className="flex-1 p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between overflow-hidden">
                   <code className="text-rose-400 text-xs truncate max-w-[200px]">{s2sCallbackUrl}</code>
                   <button 
                    onClick={() => copyToClipboard(s2sCallbackUrl)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                   >
                     <Clipboard className="h-3.5 w-3.5" />
                   </button>
                 </div>
               </div>
            </div>

            <GlassButton 
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              onClick={() => saveMutation.mutate({ s2sSecret, requireS2S })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving Security Policy..." : "Synchronize Security Policy"}
            </GlassButton>
          </CardContent>
        </Card>

        <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/5 overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-100/60">
             <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Live S2S Ledger</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="max-h-[500px] overflow-y-auto no-scrollbar">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/50">
                     <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Session</TableHead>
                     <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Status</TableHead>
                     <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto text-right">Timestamp</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody className="divide-y divide-slate-100">
                    {logsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3} className="px-8 py-6"><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : logs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                            <ShieldCheck className="w-10 h-10" />
                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Synchronized Callbacks</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs?.map((log) => (
                        <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-none group">
                          <TableCell className="px-8 py-6">
                            <code className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-primary transition-colors">{log.oiSession.substring(0, 18)}...</code>
                          </TableCell>
                          <TableCell className="px-8 capitalize font-black text-[11px] text-emerald-500 tracking-widest">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3" />
                              {log.status}
                            </div>
                          </TableCell>
                          <TableCell className="px-8 text-right font-bold text-[11px] text-slate-300">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                 </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
          <ShieldAlert className="w-32 h-32 text-rose-500" />
        </div>
        <div className="grid md:grid-cols-3 gap-10 items-center">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Security Integration Guide</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              When protocol enforcement is active, the system automatically appends an <code className="text-rose-400">s2s_token</code> to all outgoing respondent redirects. Your survey platform must echo this token and the <code className="text-rose-400">oi_session</code> back to our secure endpoint to confirm completion.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hash: HMAC-SHA256</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signature: Hex</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
             <GlassButton className="h-14 bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors">
               <span className="text-[10px] font-black uppercase tracking-widest px-4">Download SDK.js</span>
             </GlassButton>
             <GlassButton className="h-14 bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors">
               <span className="text-[10px] font-black uppercase tracking-widest px-4">View Documentation</span>
             </GlassButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
