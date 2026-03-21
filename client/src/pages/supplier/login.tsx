import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { PixelTrail } from "@/components/ui/pixel-trail";
import { useScreenSize } from "@/components/hooks/use-screen-size";

export default function SupplierLoginPage() {
  const screenSize = useScreenSize();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/supplier/auth/login", {
        username,
        password,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/auth/me"] });
      toast({
        title: "Login successful",
        description: "Welcome back",
      });
      setLocation("/supplier/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
      {/* Interactive Pixel Trail Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <PixelTrail
          pixelSize={screenSize.lessThan("md") ? 32 : 56}
          fadeDuration={600}
          delay={0}
          pixelClassName="rounded-full bg-blue-400/40"
        />
      </div>

      <div className="w-full max-w-[500px] mb-8 relative z-10">
        <Card className="border-none shadow-[0_4px_15px_rgba(0,0,0,0.1)] rounded-sm">
          <CardHeader className="pt-10 pb-4">
            <CardTitle className="text-[28px] font-normal text-slate-800 text-center">Supplier Login</CardTitle>
          </CardHeader>
          <CardContent className="px-12 pb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label htmlFor="loginId" className="text-[14px] text-slate-600 block">LoginID</label>
                <Input
                  id="loginId"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-[#eef4ff] border-[#b8d4ff] text-slate-800 h-[42px] rounded-sm focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="text-[14px] text-slate-600 block">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#eef4ff] border-[#b8d4ff] text-slate-800 h-[42px] rounded-sm focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
                  autoComplete="current-password"
                />
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="bg-[#007bff] hover:bg-[#0069d9] text-white px-6 py-2 h-auto rounded-sm text-[14px] font-medium"
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  LOG IN
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <footer className="fixed bottom-0 w-full py-4 bg-white border-t border-slate-200">
        <div className="text-right px-12 text-[12px] text-slate-500">
          © 2026, Opinion Insights
        </div>
      </footer>
    </div>
  );
}
