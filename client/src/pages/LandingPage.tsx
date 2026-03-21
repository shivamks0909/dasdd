import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
    const params = useSearch();
    const oiSession = new URLSearchParams(params).get("oi_session");
    const [, setLocation] = useLocation();
    const [progress, setProgress] = useState(0);

    const { data: info } = useQuery({
        queryKey: ["/api/landing-info", { oi_session: oiSession }],
        queryFn: async () => {
            const res = await fetch(`/api/landing-info?oi_session=${oiSession}`);
            return res.json();
        },
        enabled: !!oiSession,
    });

    useEffect(() => {
        if (oiSession) {
            const timer = setInterval(() => {
                setProgress((old) => {
                    if (old >= 100) {
                        clearInterval(timer);
                        if (info?.clientSurveyUrl) {
                            window.location.href = info.clientSurveyUrl;
                        } else {
                            setLocation(`/survey?oi_session=${oiSession}`);
                        }
                        return 100;
                    }
                    return old + 2; // Slower progress for better UX
                });
            }, 50);
            return () => clearInterval(timer);
        }
    }, [oiSession, setLocation, info]);

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-white">
            <div className="absolute inset-0 z-0">
                <BackgroundPaths />
            </div>

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-10 shadow-2xl shadow-primary/10 border border-white/60 relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    <div className="flex flex-col items-center justify-center text-center space-y-8">
                        
                        {/* Status Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                            <div className="w-20 h-20 bg-white shadow-xl shadow-primary/20 rounded-2xl flex items-center justify-center relative border border-primary/10">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-3">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                Preparing Routing
                            </h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                                {info?.message || "Securely connecting you to the next available survey experience."}
                            </p>
                        </div>

                        {/* Progress Bar Area */}
                        <div className="w-full space-y-3 pt-4">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-primary transition-all duration-75 ease-out rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <span>Authenticating</span>
                                <span className="text-primary">{progress}%</span>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
