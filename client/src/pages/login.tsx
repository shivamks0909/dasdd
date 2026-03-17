import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BarChart3, Loader2, ShieldCheck, User, Lock } from "lucide-react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlassButton } from "@/components/ui/glass-button";
import { PixelTrail } from "@/components/ui/pixel-trail";
import { useScreenSize } from "@/components/hooks/use-screen-size";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const screenSize = useScreenSize();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      const result = await res.json();
      if (result.token) {
        localStorage.setItem("nexus_auth_token", result.token);
      }
      return result;
    },
    onSuccess: () => {
      setLocation("/admin/dashboard");
      toast({ title: "Welcome to Nexus", description: "Authentication verified." });
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message.includes("401")
          ? "Invalid credentials detected"
          : error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: LoginForm) {
    loginMutation.mutate(data);
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50">
      <BackgroundPaths />
      
      {/* Interactive Pixel Trail Layer */}
      <div className="absolute inset-0 z-0 opacity-40">
        <PixelTrail
          pixelSize={screenSize.lessThan("md") ? 32 : 56}
          fadeDuration={600}
          delay={0}
          pixelClassName="rounded-full bg-primary/40"
        />
      </div>
      <div className="relative z-10 w-full max-w-[440px] mx-auto px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="group relative">
            <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-3xl bg-white shadow-xl shadow-slate-200 border border-slate-100 mb-6 text-primary group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-slate-900 font-black text-3xl tracking-tighter">
              Nexus <span className="text-primary italic font-serif">OS</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 ml-1">
              Mission Control Intelligence
            </p>
          </div>
        </div>

        <Card className="bg-white/40 backdrop-blur-3xl border-slate-200/60 shadow-2xl shadow-slate-200/20 rounded-[2.5rem] p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <Lock className="w-24 h-24" />
          </div>

          <CardHeader className="p-0 mb-10">
            <CardTitle className="text-slate-800 font-black text-2xl tracking-tight">Identity Verification</CardTitle>
            <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
              Secure Administrative Access Only
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">LogonID</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                          <Input
                            className="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            placeholder="username"
                            autoComplete="username"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-rose-500 text-[10px] font-black uppercase ml-1" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Access Phrase</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                          <Input
                            className="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl pl-12 pr-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-rose-500 text-[10px] font-black uppercase ml-1" />
                    </FormItem>
                  )}
                />
                <GlassButton
                  type="submit"
                  variant="primary"
                  className="w-full h-16 rounded-3xl mt-4"
                  isLoading={loginMutation.isPending}
                >
                  Initialize Login
                </GlassButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.3em] mt-10 opacity-50">
          OpinionInsights Routing Platform v2.0
        </p>
      </div>
    </div>
  );
}
