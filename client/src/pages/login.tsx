import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


// ── Schema ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1, "ID is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

// ── Input Component ─────────────────────────────────────────────────────────
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
}
const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon, rightSlot, className, ...props }, ref) => (
    <div className="flex items-center gap-3 w-full rounded-2xl px-5 py-4 bg-white/10 border border-white/20 focus-within:border-sky-500/50 focus-within:ring-4 focus-within:ring-sky-500/10 transition-all duration-300 shadow-sm">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <input
        ref={ref}
        className={cn(
          "flex-1 bg-transparent text-white placeholder:text-slate-400",
          "focus:outline-none text-sm font-semibold",
          className,
        )}
        {...props}
      />
      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </div>
  ),
);
GlassInput.displayName = "GlassInput";

// ── Page ────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/admin/dashboard");
      toast({ title: "Access Granted", description: "Welcome back." });
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => loginMutation.mutate(data);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#000000] overflow-hidden">

      <BackgroundPaths title="OpinionInsights Login" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-auto p-10 bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-6"
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-2xl font-black text-white tracking-tight"
          >
            OpinionInsights
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="text-sm font-semibold text-slate-300 mt-2"
          >
            Please sign in to access your dashboard.
          </motion.p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <GlassInput
              icon={<User className="w-5 h-5" />}
              placeholder="Admin ID or Username"
              autoComplete="username"
              {...register("username")}
            />
            <AnimatePresence>
              {errors.username && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-rose-500 font-bold mt-2 ml-2">
                  {errors.username.message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <GlassInput
              icon={<Lock className="w-5 h-5" />}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-sky-400 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              {...register("password")}
            />
            <AnimatePresence>
              {errors.password && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-rose-500 font-bold mt-2 ml-2">
                  {errors.password.message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-4">
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className={cn(
                "w-full h-14 flex items-center justify-center gap-3 rounded-2xl",
                "bg-white/10 text-white font-bold text-sm tracking-wide border border-white/20",
                "hover:bg-white/20 active:scale-[0.98] transition-all duration-200 shadow-xl",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
              ) : (
                <>Sign into Workspace <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>

  );
}
