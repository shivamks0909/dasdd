import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
    Plus, 
    Search, 
    Filter, 
    Link as LinkIcon, 
    Copy, 
    Pause, 
    Play, 
    Trash2, 
    Download,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    XCircle,
    CopyCheck
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function LinkGeneratorPage() {
    const { toast } = useToast();
    const [location] = useLocation();
    const queryParams = new URLSearchParams(location.split('?')[1]);
    
    // Form State
    const [selectedProject, setSelectedProject] = useState<string>(queryParams.get("project") || "");
    const [selectedSupplier, setSelectedSupplier] = useState<string>(queryParams.get("supplier") || "");
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Filter State
    const [filterProject, setFilterProject] = useState("");
    const [filterSupplier, setFilterSupplier] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Queries
    const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/projects"] });
    const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });
    const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<any[]>({ 
        queryKey: ["/api/link-generator/assignments"] 
    });

    // Get countries for selected project
    const { data: projectCountries = [] } = useQuery<any[]>({
        queryKey: [`/api/projects/${projects.find(p => p.projectCode === selectedProject)?.id}/surveys`],
        enabled: !!selectedProject && projects.some(p => p.projectCode === selectedProject)
    });

    const activeProjects = projects.filter(p => p.status === 'active');

    // Link Generation Logic - always use current origin at render time
    const generateLink = (projCode: string, countryCode: string, supplierCode?: string) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');
        const base = `${origin}/track?code=${projCode}&country=${countryCode}`;
        if (supplierCode) return `${base}&sup=${supplierCode}&uid=[UID]`;
        return `${base}&uid=[UID]`;
    };

    const createMutation = useMutation({
        mutationFn: async (assignment: any) => {
            return await apiRequest("POST", "/api/link-generator/assignments", assignment);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/link-generator/assignments"] });
            toast({ title: "Success", description: "Links generated and assigned successfully." });
        },
        onError: (err: any) => {
            toast({ 
                title: "Error", 
                description: err.message || "Failed to generate links.",
                variant: "destructive" 
            });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            return await apiRequest("PUT", `/api/link-generator/assignments/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/link-generator/assignments"] });
            toast({ title: "Updated", description: "Status updated successfully." });
        }
    });

    const updateProjectStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            return await apiRequest("PATCH", `/api/projects/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            toast({ title: "Project Updated", description: "Project status changed successfully." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiRequest("DELETE", `/api/link-generator/assignments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/link-generator/assignments"] });
            toast({ title: "Deleted", description: "Assignment removed successfully." });
        },
        onError: (err: any) => {
            toast({ 
                title: "Error", 
                description: err.message || "Failed to delete assignment.",
                variant: "destructive" 
            });
        }
    });

    const handleGenerate = async () => {
        if (!selectedProject || selectedCountries.length === 0) {
            toast({ title: "Invalid", description: "Please select a project and at least one country.", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            for (const countryCode of selectedCountries) {
                const supplierObj = selectedSupplier ? suppliers.find(s => s.id.toString() === selectedSupplier) : null;
                const supplierCode = supplierObj?.code || undefined;
                const link = generateLink(selectedProject, countryCode, supplierCode);
                await createMutation.mutateAsync({
                    projectCode: selectedProject,
                    countryCode,
                    supplierId: selectedSupplier || null,
                    generatedLink: link,
                    notes: notes,
                    status: "active"
                });
            }
            setSelectedCountries([]);
            setNotes("");
        } catch (e) {
            // Error handled by mutation
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchesProject = filterProject ? a.projectCode === filterProject : true;
            const matchesSupplier = filterSupplier ? a.supplierId === Number(filterSupplier) : true;
            const matchesStatus = filterStatus !== "all" ? a.status === filterStatus : true;
            const matchesSearch = searchQuery ? (
                a.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
            ) : true;
            return matchesProject && matchesSupplier && matchesStatus && matchesSearch;
        });
    }, [assignments, filterProject, filterSupplier, filterStatus, searchQuery]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Link copied to clipboard." });
    };

    const exportToCSV = () => {
        window.open("/api/link-generator/assignments/export", "_blank");
    };

    return (
        <div className="space-y-8 p-1 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Link Generator</h1>
                <p className="text-slate-500 font-medium">Generate and manage unique router links for suppliers.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Section 1: Generate Form */}
                <Card className="lg:col-span-1 border-none shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Generate New Links
                        </CardTitle>
                        <CardDescription>Assign specific links to a supplier.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Project</label>
                                <div className="flex gap-2">
                                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 focus:ring-blue-500 flex-1">
                                            <SelectValue placeholder="Select a project" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.projectCode}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            p.status === 'active' ? "bg-emerald-500" : "bg-orange-500"
                                                        )} />
                                                        <span className="font-semibold">{p.projectCode}</span> - {p.projectName}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    
                                    {selectedProject && (
                                        <div className="flex gap-1">
                                            {projects.find(p => p.projectCode === selectedProject)?.status === 'active' ? (
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-11 w-11 rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50"
                                                    onClick={() => {
                                                        const p = projects.find(p => p.projectCode === selectedProject);
                                                        if (p) updateProjectStatusMutation.mutate({ id: p.id, status: 'paused' });
                                                    }}
                                                    title="Pause Project"
                                                >
                                                    <Pause className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-11 w-11 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    onClick={() => {
                                                        const p = projects.find(p => p.projectCode === selectedProject);
                                                        if (p) updateProjectStatusMutation.mutate({ id: p.id, status: 'active' });
                                                    }}
                                                    title="Activate Project"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedProject && (
                                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-0.5">
                                            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">Target Countries</label>
                                            <p className="text-[10px] font-medium text-slate-400">Select countries for this assignment</p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-[10px] font-black uppercase tracking-tight rounded-lg border-slate-200 hover:bg-white"
                                            onClick={() => {
                                                if (selectedCountries.length === projectCountries.length) setSelectedCountries([]);
                                                else setSelectedCountries(projectCountries.map(c => c.countryCode));
                                            }}
                                        >
                                            {selectedCountries.length === projectCountries.length ? "Deselect All" : "Select All"}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {projectCountries.map(c => (
                                            <div key={c.id} className={cn(
                                                "flex items-center space-x-2 p-2.5 rounded-xl border transition-all cursor-pointer",
                                                selectedCountries.includes(c.countryCode) 
                                                    ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" 
                                                    : "bg-white border-slate-100 hover:border-slate-200"
                                            )} onClick={() => {
                                                if (selectedCountries.includes(c.countryCode)) {
                                                    setSelectedCountries(selectedCountries.filter(cc => cc !== c.countryCode));
                                                } else {
                                                    setSelectedCountries([...selectedCountries, c.countryCode]);
                                                }
                                            }}>
                                                <Checkbox 
                                                    id={`country-${c.countryCode}`}
                                                    checked={selectedCountries.includes(c.countryCode)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedCountries([...selectedCountries, c.countryCode]);
                                                        else setSelectedCountries(selectedCountries.filter(cc => cc !== c.countryCode));
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <label htmlFor={`country-${c.countryCode}`} className="text-sm font-black text-slate-700 cursor-pointer uppercase flex-1">
                                                    {c.countryCode}
                                                </label>
                                            </div>
                                        ))}
                                        {projectCountries.length === 0 && (
                                            <div className="col-span-2 text-center py-8 space-y-2">
                                                <Search className="w-8 h-8 text-slate-200 mx-auto" />
                                                <p className="text-xs font-bold text-slate-400">No countries mapped for this project.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Supplier</label>
                                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-11 focus:ring-blue-500">
                                        <SelectValue placeholder="Select a supplier" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{s.name}</span>
                                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{s.code}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (Optional)</label>
                            <Input 
                                placeholder="E.g. Bonus campaign, specific vendor tag" 
                                className="rounded-xl border-slate-200 bg-slate-50/50 h-11"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        {selectedProject && selectedCountries.length > 0 && (
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 mt-4">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" /> Preview Format
                                </p>
                                <p className="text-xs font-mono text-blue-700 break-all bg-white p-2 rounded border border-blue-100 shadow-sm">
                                    {generateLink(
                                        selectedProject, 
                                        selectedCountries[0], 
                                        selectedSupplier ? (suppliers.find(s => s.id.toString() === selectedSupplier)?.code || undefined) : undefined
                                    )}
                                </p>
                                <p className="text-[10px] text-blue-500 mt-2 italic">Generating {selectedCountries.length} unique link(s)...</p>
                            </div>
                        )}

                        <Button 
                            className="w-full rounded-xl h-12 font-bold shadow-lg shadow-blue-200 mt-4 bg-blue-600 hover:bg-blue-700"
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedProject || selectedCountries.length === 0}
                        >
                            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                            Generate & Assign Links
                        </Button>
                    </CardContent>
                </Card>

                {/* Assignments Section */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px] space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Project, Supplier, Country..." 
                                        className="pl-9 h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="w-[180px] space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Project</label>
                                <Select value={filterProject} onValueChange={setFilterProject}>
                                    <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm">
                                        <SelectValue placeholder="All Projects" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        <SelectItem value="all">All Projects</SelectItem>
                                        {Array.from(new Set(assignments.map(a => a.projectCode))).map(code => (
                                            <SelectItem key={code} value={code}>{code}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-[180px] space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Status</label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    className="h-10 rounded-xl border-slate-200 hover:bg-slate-50"
                                    onClick={() => {
                                        setFilterProject("");
                                        setFilterSupplier("");
                                        setFilterStatus("all");
                                        setSearchQuery("");
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button 
                                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-2"
                                    onClick={exportToCSV}
                                >
                                    <Download className="w-4 h-4" /> Export
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden min-h-[400px]">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="w-[120px] font-bold text-slate-900 py-5 pl-6">Project</TableHead>
                                        <TableHead className="w-[100px] font-bold text-slate-900">Country</TableHead>
                                        <TableHead className="w-[180px] font-bold text-slate-900">Supplier</TableHead>
                                        <TableHead className="font-bold text-slate-900">Router Link</TableHead>
                                        <TableHead className="w-[100px] font-bold text-slate-900">Status</TableHead>
                                        <TableHead className="w-[120px] font-bold text-slate-900 text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingAssignments ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                                                Loading assignments...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredAssignments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                                                No assignments found matching filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAssignments.map((a) => (
                                            <TableRow key={a.id} className="group transition-colors hover:bg-slate-50/50">
                                                <TableCell className="py-4 pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 text-sm tracking-tight">{a.projectCode}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">{a.projectName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="rounded-lg bg-white border-slate-200 font-black text-xs px-2.5 py-0.5 text-slate-600">
                                                        {a.countryCode}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-sm">{a.supplierName}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">CODE: {a.supplierCode}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 group/link max-w-[200px]">
                                                        <div className="flex-1 text-xs font-mono text-slate-400 truncate bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                            {a.generatedLink}
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 outline-none"
                                                            onClick={() => copyToClipboard(a.generatedLink)}
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {a.status === 'active' ? (
                                                        <Badge className="rounded-lg bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2 py-0.5 flex items-center gap-1.5 w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="rounded-lg bg-orange-50 text-orange-700 border-orange-100 font-bold px-2 py-0.5 flex items-center gap-1.5 w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                            Paused
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn(
                                                                "h-9 w-9 rounded-xl ",
                                                                a.status === 'active' ? "hover:bg-orange-50 hover:text-orange-600" : "hover:bg-blue-50 hover:text-blue-600"
                                                            )}
                                                            onClick={() => updateStatusMutation.mutate({ id: a.id, status: a.status === 'active' ? 'paused' : 'active' })}
                                                            title={a.status === 'active' ? "Pause Assignment" : "Activate Assignment"}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            {a.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600"
                                                                    title="Delete Assignment"
                                                                    disabled={deleteMutation.isPending}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-xl font-black">Delete Assignment?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="font-medium text-slate-500">
                                                                        This will permanently remove the link generated for <span className="font-bold text-slate-900">{a.supplierName}</span> on project <span className="font-bold text-slate-900">{a.projectCode}</span> ({a.countryCode}).
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl font-bold border-slate-200">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
                                                                        onClick={() => deleteMutation.mutate(a.id)}
                                                                    >
                                                                        Delete Assignment
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
