import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { WavyBackground } from "@/components/ui/wavy-background";
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
                    return old + 2; 
                });
            }, 50);
            return () => clearInterval(timer);
        }
    }, [oiSession, setLocation, info]);

    return (
        <WavyBackground
            className="w-full flex items-center justify-center p-4"
            containerClassName="min-h-screen"
            backgroundFill="#000000"
            colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
            waveOpacity={0.4}
            blur={12}
        >
            <div className="relative z-10 w-full max-w-lg">
                <div className="backdrop-blur-2xl bg-white/5 rounded-[3rem] p-12 shadow-2xl border border-white/10 relative overflow-hidden">
                    {/* Decorative glow */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
                    
                    <div className="flex flex-col items-center justify-center text-center space-y-10">
                        {/* Status Icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full animate-pulse" />
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center relative border border-white/20">
                                <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-white tracking-tight">
                                Preparing Routing
                            </h2>
                            <p className="text-base font-medium text-white/60 leading-relaxed max-w-[320px] mx-auto">
                                {info?.message || "Securely connecting you to the next available survey experience."}
                            </p>
                        </div>

                        {/* Progress Bar Area */}
                        <div className="w-full space-y-4 pt-4">
                            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-75 ease-out rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                                <span>Authenticating</span>
                                <span className="text-sky-400">{progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </WavyBackground>
    );
}
