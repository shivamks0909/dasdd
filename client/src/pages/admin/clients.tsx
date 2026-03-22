import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, Users, Building2, Mail, Link as LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import type { Client } from "@shared/schema";

export default function ClientsPage() {
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      website: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client partner onboarded" });
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client safely removed" });
    },
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Partner Ecosystem</h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">Manage agency relationships and research collaborators</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Add Partner
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-3xl border-slate-200 rounded-[2.5rem] max-w-lg shadow-2xl p-0 overflow-hidden">
            <div className="p-10">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  Onboard Partner
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">Establish a new client connection for research routing.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Agency Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Acme Research Group" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="operations@acme.com" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Research Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Acme Corp" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Digital Nexus (URL)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://acme.com" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-6">
                    <button type="submit" disabled={createMutation.isPending} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50">
                      {createMutation.isPending ? "Validating Path..." : "Onboard to Nexus"}
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[2.5rem] bg-white/20" />
          ))}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <Card key={client.id} className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/5 overflow-hidden group hover:bg-white/60 hover:border-white hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary transition-all duration-500">
                    <Building2 className="h-6 w-6 text-primary group-hover:text-white transition-colors duration-500" />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
                      <div className="p-10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black text-rose-500 tracking-tight">Safely Remove Partner?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400 font-medium py-4 leading-relaxed">
                            Are you sure you want to remove {client.name}? This will terminate their access to the research routing nexus.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="pt-6">
                          <AlertDialogCancel className="h-12 border-slate-200 rounded-xl font-bold bg-slate-50/50 hover:bg-slate-100 transition-colors">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(client.id)}
                            className="h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                          >
                            Confirm Removal
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-[15px] font-black text-slate-800 tracking-tight leading-tight">{client.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="w-3 h-3 text-slate-300" />
                      <span className="text-[11px] font-bold text-slate-400 truncate">{client.email}</span>
                    </div>
                  </div>

                  {client.website && (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-3 h-3 text-primary/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 group-hover:text-primary transition-colors">Digital Portal</span>
                      </div>
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black text-slate-300 hover:text-slate-800 transition-colors"
                      >
                        Visit Site ↗
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
