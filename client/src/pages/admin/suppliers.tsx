import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassButton } from "@/components/ui/glass-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, ClipboardList, Link2, Copy, Check, Link as LinkIcon, Edit2, Users, ShieldCheck, Key, Lock, Search, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, updateSupplierSchema, insertSupplierUserSchema, insertSupplierProjectAccessSchema } from "@shared/schema";
import type { Supplier, SupplierUser, SupplierProjectAccess, Project } from "@shared/schema";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function EditSupplierDialog({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(updateSupplierSchema),
    defaultValues: {
      name: supplier.name,
      code: supplier.code,
      completeUrl: supplier.completeUrl || "",
      terminateUrl: supplier.terminateUrl || "",
      quotafullUrl: supplier.quotafullUrl || "",
      securityUrl: (supplier as any).security_url || (supplier as any).securityUrl || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: supplier.name,
      code: supplier.code,
      completeUrl: supplier.completeUrl || "",
      terminateUrl: supplier.terminateUrl || "",
      quotafullUrl: supplier.quotafullUrl || "",
      securityUrl: (supplier as any).security_url || (supplier as any).securityUrl || "",
    });
  }, [supplier, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/suppliers/${supplier.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier updated successfully" });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all" title="Edit Supplier">
          <Edit2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-3xl border-slate-200 rounded-[2.5rem] max-w-2xl shadow-2xl p-0 overflow-hidden">
        <div className="p-10">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Edit2 className="w-5 h-5 text-emerald-500" />
              </div>
              Edit Supply Integration
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">Update the details and callback telemetry for {supplier.name}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Supplier Entity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dynata Global" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unique Identifier (TAG)</FormLabel>
                      <FormControl>
                        <Input placeholder="DYN01" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 border-b border-emerald-500/10 pb-2">Callback Telemetry</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {["completeUrl", "terminateUrl", "quotafullUrl", "securityUrl"].map((fieldName) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            {fieldName.replace('Url', '').toUpperCase()} Entry
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} className="h-10 bg-slate-50 border-slate-200 rounded-xl text-xs text-slate-800" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-6">
                <button type="submit" disabled={updateMutation.isPending} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all disabled:opacity-50">
                  {updateMutation.isPending ? "Updating Nexus..." : "Update Supplier"}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SupplierUsersTab({ suppliers }: { suppliers: Supplier[] }) {
  const { toast } = useToast();
  const { data: users, isLoading } = useQuery<SupplierUser[]>({
    queryKey: ["/api/admin/suppliers/users"],
  });

  const form = useForm({
    resolver: zodResolver(insertSupplierUserSchema),
    defaultValues: {
      username: "",
      passwordHash: "",
      supplierId: "",
      supplierCode: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/suppliers/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers/users"] });
      toast({ title: "Portal user created" });
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/suppliers/users?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers/users"] });
      toast({ title: "User access revoked" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              Create Supplier Credentials
            </CardTitle>
            <CardDescription className="text-sm font-bold text-slate-400 mt-1">Generate secure login access for traffic partners</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="grid gap-6 md:grid-cols-4 items-end">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Supplier</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        const s = suppliers.find(x => x.id === val);
                        if (s) form.setValue("supplierCode", s.code);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold">
                          <SelectValue placeholder="Select Source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} ({s.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Portal Username</FormLabel>
                    <FormControl>
                      <Input placeholder="dynata_admin" {...field} className="h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passwordHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createMutation.isPending} className="h-12 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                {createMutation.isPending ? "Generating..." : "Grant Access"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/50">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Supplier</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Username</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Created By</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-12 w-full rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-white/60 transition-all border-none">
                    <TableCell className="px-8 py-6">
                      <span className="font-black text-[12px] text-slate-800 tracking-tight">{u.supplierCode}</span>
                    </TableCell>
                    <TableCell className="px-8 font-bold text-slate-500">{u.username}</TableCell>
                    <TableCell className="px-8">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${u.isActive ? 'text-emerald-500 bg-emerald-50 border-emerald-500/20' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 text-[11px] font-bold text-slate-400">{u.createdBy || "System"}</TableCell>
                    <TableCell className="px-8 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(u.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessControlTab({ suppliers }: { suppliers: Supplier[] }) {
  const { toast } = useToast();
  const { data: users } = useQuery<SupplierUser[]>({ queryKey: ["/api/admin/suppliers/users"] });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: access, isLoading } = useQuery<SupplierProjectAccess[]>({
    queryKey: ["/api/admin/suppliers/access"],
  });

  const form = useForm({
    resolver: zodResolver(insertSupplierProjectAccessSchema),
    defaultValues: {
      userId: "",
      projectId: "",
      projectCode: "",
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/suppliers/access", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers/access"] });
      toast({ title: "Project visibility granted" });
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/suppliers/access?id=${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers/access"] });
      toast({ title: "Access revoked" });
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              Project Access Matrix
            </CardTitle>
            <CardDescription className="text-sm font-bold text-slate-400 mt-1">Bind specific projects to traffic source accounts</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => assignMutation.mutate(data))} className="grid gap-6 md:grid-cols-4 items-end">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Portal Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl text-slate-800 font-bold">
                          <SelectValue placeholder="Select User" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        {users?.map(u => (
                          <SelectItem key={u.id} value={u.id} className="font-bold">{u.username} ({u.supplierCode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Project</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        const p = projects?.find(x => x.id === val);
                        if (p) form.setValue("projectCode", p.projectCode);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl text-slate-800 font-bold">
                          <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id} className="font-bold">{p.projectCode} - {p.projectName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={assignMutation.isPending} className="h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                Authorize Assignment
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/50">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Account</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Project</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto">Assigned At</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-8 py-5 h-auto text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}><Skeleton className="h-12 w-full rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : (
                access?.map((a) => {
                  const user = users?.find(u => u.id === a.userId);
                  return (
                    <TableRow key={a.id} className="group hover:bg-white/60 transition-all border-none">
                      <TableCell className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-[12px] text-slate-800 tracking-tight">{user?.username}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.supplierCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 font-bold text-primary">{a.projectCode}</TableCell>
                      <TableCell className="px-8 text-[11px] font-bold text-slate-400">
                        {new Date(a.assignedAt || Date.now()).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => revokeMutation.mutate(a.id)}
                          disabled={revokeMutation.isPending}
                          className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuppliersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [origin, setOrigin] = useState("");
  const [host, setHost] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setOrigin(window.location.origin);
    setHost(window.location.host);
  }, []);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      code: "",
      completeUrl: "",
      terminateUrl: "",
      quotafullUrl: "",
      securityUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier registered successfully" });
      form.reset();
      setIsCreateDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier removed from nexus" });
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copied to clipboard" });
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60 font-inter">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Traffic Integration</h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">Manage traffic originators, portal credentials and survey visibility</p>
        </div>
      </div>

      <Tabs defaultValue="nexus" className="space-y-8">
        <TabsList className="bg-white/40 border border-slate-200/60 p-1.5 rounded-2xl backdrop-blur-3xl shadow-lg inline-flex">
          <TabsTrigger value="nexus" className="rounded-xl px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xl transition-all flex items-center gap-2 text-slate-500 hover:text-slate-800">
            <Globe className="w-3.5 h-3.5" />
            Supplier Nexus
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xl transition-all flex items-center gap-2 text-slate-500 hover:text-slate-800">
            <Users className="w-3.5 h-3.5" />
            Portal Access
          </TabsTrigger>
          <TabsTrigger value="access" className="rounded-xl px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xl transition-all flex items-center gap-2 text-slate-500 hover:text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Project Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nexus">
          <div className="space-y-8">
            <div className="flex justify-end">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                    <Plus className="h-4 w-4" />
                    Register Source
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-3xl border-slate-200 rounded-[2.5rem] max-w-2xl shadow-2xl p-0 overflow-hidden">
                  <div className="p-10">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        Supply Integration
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 font-medium">Configure a new traffic source with custom callback telemetry.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      {createMutation.isSuccess ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
                          <div className="size-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                            <Check className="size-10" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Nexus Synchronized</h3>
                            <p className="text-sm font-bold text-slate-400 mt-2">
                              Supplier <span className="text-primary">{form.getValues("name")}</span> is now live in the ecosystem.
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              createMutation.reset();
                              setIsCreateDialogOpen(false);
                            }}
                            className="bg-slate-900 text-white px-10 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                          >
                            Close Transmission
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                          <div className="grid gap-6 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Supplier Entity</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Dynata Global" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unique Identifier (TAG)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="DYN01" {...field} className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 font-mono" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 border-b border-primary/10 pb-2">Callback Telemetry</p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {["completeUrl", "terminateUrl", "quotafullUrl", "securityUrl"].map((fieldName) => (
                                <FormField
                                  key={fieldName}
                                  control={form.control}
                                  name={fieldName as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        {fieldName.replace('Url', '').toUpperCase()} Entry
                                      </FormLabel>
                                      <FormControl>
                                        <Input placeholder="https://..." {...field} className="h-10 bg-slate-50 border-slate-200 rounded-xl text-xs text-slate-800" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </div>

                          <DialogFooter className="pt-6">
                            <button 
                              type="submit" 
                              disabled={createMutation.isPending} 
                              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                              {createMutation.isPending ? (
                                <>
                                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Processing Nexus...
                                </>
                              ) : "Synchronize Supplier"}
                            </button>
                          </DialogFooter>
                        </form>
                      )}
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid gap-8 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-[2.5rem] bg-white/20" />
                ))}
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
                {suppliers?.map((supplier) => (
                  <Card key={supplier.id} className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl shadow-slate-200/10 overflow-hidden group hover:bg-white/60 hover:border-white transition-all duration-500">
                    <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary transition-colors duration-500">
                          <ClipboardList className="h-5 w-5 text-primary group-hover:text-white transition-colors duration-500" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black text-slate-800 tracking-tight">{supplier.name}</CardTitle>
                          <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nexus Node: {supplier.code}</CardDescription>
                        </div>
                      </div>
                      <AlertDialog>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLocation(`/admin/link-generator?supplier=${supplier.id}`)}
                            className="p-3 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-2xl transition-all"
                            title="View Assigned Links"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </button>
                          <EditSupplierDialog supplier={supplier} />
                          <AlertDialogTrigger asChild>
                            <button className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                        </div>
                        <AlertDialogContent className="bg-white border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden p-0">
                          <div className="p-10">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black text-rose-500 tracking-tight">Confirm Deletion</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400 font-medium py-4 leading-relaxed">
                                Are you sure you want to remove {supplier.name} from the nexus? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-6">
                              <AlertDialogCancel className="h-12 border-slate-200 rounded-xl font-bold bg-slate-50/50 hover:bg-slate-100 transition-colors">Abort</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(supplier.id)}
                                className="h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                              >
                                Confirm Removal
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Link2 className="w-3 h-3" />
                            Universal Routing Link
                          </span>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 group/link relative mb-4">
                          <code className="text-[11px] break-all font-mono text-slate-500 block leading-relaxed pr-10">
                            {isMounted ? `${host}/track?code=[PID]&country=[CC]&sup=${supplier.code}&uid=[RID]` : "Loading link..."}
                          </code>
                          <button
                            onClick={() => handleCopy(`${origin}/track?code=[PID]&country=[CC]&sup=${supplier.code}&uid=[RID]`, supplier.code)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            {copiedId === supplier.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-300 hover:text-primary transition-colors" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {["Complete", "Terminate"].map((label) => (
                          <div key={label} className="p-4 rounded-2xl bg-white/40 border border-slate-100 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{label} Target</span>
                            <span className="text-xs font-black text-slate-700 truncate opacity-60">
                              {(supplier as any)[`${label.toLowerCase()}Url`] || "Not Defined"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <SupplierUsersTab suppliers={suppliers || []} />
        </TabsContent>

        <TabsContent value="access">
          <AccessControlTab suppliers={suppliers || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
