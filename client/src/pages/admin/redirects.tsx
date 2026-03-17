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
  Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { useToast } from "@/hooks/use-toast";

export default function ToolLinksPage() {
  const { toast } = useToast();
  const [projectCode, setProjectCode] = useState("PRJXXXX");

  // Determine base URL: process.env exists in some setups, import.meta.env in Vite.
  // We use the exact URL requested by the user.
  const baseUrl = "https://track.opinioninsights.in";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} link copied to clipboard.`,
    });
  };

  const redirectLinks = [
    {
      title: "Complete Redirect",
      description: "Redirect for successful survey completions",
      url: `${baseUrl}/pages/complete?pid=${projectCode}&uid=[UID]`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Terminate Redirect",
      description: "Redirect for disqualified respondents",
      url: `${baseUrl}/pages/terminate?pid=${projectCode}&uid=[UID]`,
      icon: XCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-50"
    },
    {
      title: "Quotafull Redirect",
      description: "Redirect when project quotas are full",
      url: `${baseUrl}/pages/quotafull?pid=${projectCode}&uid=[UID]`,
      icon: Globe,
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    {
      title: "Security Terminate",
      description: "Redirect for fraud or security violations",
      url: `${baseUrl}/pages/security?pid=${projectCode}&uid=[UID]`,
      icon: ShieldAlert,
      color: "text-red-700",
      bgColor: "bg-red-50"
    },
    {
      title: "Duplicate IP",
      description: "Redirect for repeated IP address attempts",
      url: `${baseUrl}/pages/duplicate?pid=${projectCode}&uid=[UID]`,
      icon: ShieldAlert,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Duplicate String",
      description: "Redirect for repeated browser signatures",
      url: `${baseUrl}/pages/duplicate?pid=${projectCode}&uid=[UID]`,
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
                    <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-xl group/link border border-slate-200/50">
                      <code className="text-[10px] font-mono font-bold text-slate-500 truncate flex-1">{link.url}</code>
                      <GlassButton 
                        size="icon" 
                        className="h-7 w-7 rounded-lg group-hover/link:bg-primary group-hover/link:text-white transition-all shadow-none border-none"
                        onClick={() => copyToClipboard(link.url, link.title)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Portal Links Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 pl-2">Platform Portals</h2>
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
