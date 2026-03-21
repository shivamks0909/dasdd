import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ExternalLink,
  Copy,
  Link as LinkIcon,
  Globe,
  Monitor,
  Lock,
  Play
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GlassButton } from "@/components/ui/glass-button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

export default function ToolLinksPage() {
  const { toast } = useToast();
  const [projectCode, setProjectCode] = useState("PRJXXXX");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const project = projects?.find((p) => p.projectCode.toUpperCase() === projectCode.toUpperCase());

  const [urls, setUrls] = useState({
    complete: "",
    terminate: "",
    quota: "",
    security: ""
  });

  useEffect(() => {
    if (project) {
      setUrls({
        complete: project.completeUrl || "",
        terminate: project.terminateUrl || "",
        quota: project.quotafullUrl || "",
        security: project.securityUrl || ""
      });
    }
  }, [project]);

  const updateRedirects = useMutation({
    mutationFn: async (newUrls: typeof urls) => {
      if (!project) return;
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        completeUrl: newUrls.complete,
        terminateUrl: newUrls.terminate,
        quotafullUrl: newUrls.quota,
        securityUrl: newUrls.security
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Redirect URLs updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update redirect URLs",
        variant: "destructive"
      });
    }
  });

  // Determine base URL: prefer project custom domain, fallback to current origin
  let baseUrl = typeof window !== 'undefined' ? window.location.origin : "https://track.opinioninsights.in";
  if (project?.customDomain) {
    baseUrl = project.customDomain.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} link copied to clipboard.`,
    });
  };

  const testLink = (url: string) => {
    window.open(url.replace("[UID]", "TEST" + Math.floor(1000 + Math.random() * 9000)), "_blank");
  };

  const redirectLinks = [
    {
      title: "Complete Redirect",
      description: "Redirect for successful survey completions",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=complete`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Terminate Redirect",
      description: "Redirect for disqualified respondents",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=terminate`,
      icon: XCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-50"
    },
    {
      title: "Quotafull Redirect",
      description: "Redirect when project quotas are full",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=quota`,
      icon: Globe,
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    {
      title: "Security Terminate",
      description: "Redirect for fraud or security violations",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=security_terminate`,
      icon: ShieldAlert,
      color: "text-red-700",
      bgColor: "bg-red-50"
    },
    {
      title: "Duplicate IP",
      description: "Redirect for repeated IP address attempts",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=duplicate_ip`,
      icon: ShieldAlert,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Duplicate String",
      description: "Redirect for repeated browser signatures",
      url: `${baseUrl}/status?code=${projectCode.toUpperCase()}&uid=[UID]&type=duplicate_string`,
      icon: Lock,
      color: "text-slate-600",
      bgColor: "bg-slate-50"
    }
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Official Redirects</h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">Copy these links for client-side setup and integration</p>
        </div>
        <div className="flex items-center gap-2 bg-white/60 p-2 rounded-xl border border-slate-200/50 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Project Code:</span>
          <input
            type="text"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            placeholder="e.g. PRJ4721"
            className="w-32 h-8 px-3 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all uppercase"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Redirect Links Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 pl-2">System Redirects</h2>
          {redirectLinks.map((link) => (
            <Card key={link.title} className="bg-white/40 border-slate-200/60 backdrop-blur-xl rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {(() => {
                    const Icon = link.icon as any;
                    return (
                      <div className={`p-3 rounded-2xl ${link.bgColor}`}>
                        <Icon className={`w-5 h-5 ${link.color}`} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{link.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mb-2">{link.description}</p>
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-xl group/link border border-slate-200/50 flex-1 overflow-hidden">
                          <code className="text-[10px] font-mono font-bold text-slate-500 truncate flex-1 block" title={link.url}>{link.url}</code>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <GlassButton
                          size="sm"
                          className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 border-none"
                          onClick={() => testLink(link.url)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Test Link
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          className="h-7 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-none border-slate-200"
                          onClick={() => copyToClipboard(link.url, link.title)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Portal & Custom Redirects Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 pl-2">My Landing Page Redirects</h2>
          
          <Card className="bg-white/40 border-slate-200/60 backdrop-blur-xl rounded-3xl shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Complete Redirect URL</label>
                  <input
                    type="text"
                    value={urls.complete}
                    onChange={(e) => setUrls(prev => ({ ...prev, complete: e.target.value }))}
                    placeholder="https://yourdomain.com/complete?uid=[UID]"
                    className="w-full h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Terminate Redirect URL</label>
                  <input
                    type="text"
                    value={urls.terminate}
                    onChange={(e) => setUrls(prev => ({ ...prev, terminate: e.target.value }))}
                    placeholder="https://yourdomain.com/terminate?uid=[UID]"
                    className="w-full h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-sm"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Quotafull Redirect URL</label>
                  <input
                    type="text"
                    value={urls.quota}
                    onChange={(e) => setUrls(prev => ({ ...prev, quota: e.target.value }))}
                    placeholder="https://yourdomain.com/quota?uid=[UID]"
                    className="w-full h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm"
                  />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Security Redirect URL</label>
                  <input
                    type="text"
                    value={urls.security}
                    onChange={(e) => setUrls(prev => ({ ...prev, security: e.target.value }))}
                    placeholder="https://yourdomain.com/security?uid=[UID]"
                    className="w-full h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-sm"
                  />
                </div>
                
                <GlassButton
                  className="w-full mt-2 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 border-none disabled:opacity-50"
                  onClick={() => updateRedirects.mutate(urls)}
                  disabled={!project || updateRedirects.isPending}
                >
                  {updateRedirects.isPending ? "Saving..." : "Save Custom Redirects"}
                </GlassButton>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 pl-2 mt-10">Platform Portals</h2>
          <Card className="bg-primary/5 border-primary/20 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-primary/5 overflow-hidden group border-2 border-dashed">
            <CardContent className="p-10 flex flex-col items-center text-center">
              <div className="p-5 bg-white rounded-[2rem] shadow-2xl shadow-primary/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Monitor className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Supplier Portal</h3>
              <p className="text-xs font-bold text-slate-500 max-w-[240px] leading-relaxed mb-8">
                Share this secure link with your suppliers to let them track their own project traffic and stats.
              </p>

              <div className="w-full flex items-center gap-2 bg-white/60 p-3 rounded-2xl border border-primary/10 mb-6">
                <LinkIcon className="w-4 h-4 text-primary opacity-40 shrink-0" />
                <code className="text-xs font-mono font-bold text-primary truncate flex-1">{baseUrl}/supplier/login</code>
              </div>

              <div className="flex gap-3">
                <GlassButton
                  className="rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] bg-primary text-white shadow-lg shadow-primary/40"
                  onClick={() => copyToClipboard(`${baseUrl}/supplier/login`, "Supplier Portal")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </GlassButton>
                <GlassButton
                  variant="outline"
                  className="rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] border-slate-200"
                  onClick={() => window.open(`${baseUrl}/supplier/login`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit
                </GlassButton>
              </div>
            </CardContent>
          </Card>

          <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-200/60 mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Globe className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Configuration Note</h4>
            </div>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed capitalize">
              All redirect links require the <span className="text-primary font-black">[UID]</span> placeholder to be replaced by the respondent's unique identification string provided by your survey tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
