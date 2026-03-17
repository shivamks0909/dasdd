import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Copy, Download, ExternalLink, PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const quickCreateSchema = z.object({
  survey_url: z.string().url("Please enter a valid URL").min(1, "Survey URL is required"),
  project_name: z.string().min(1, "Project Name is required").optional(),
  country: z.string().default("US"),
});

type QuickCreateValues = z.infer<typeof quickCreateSchema>;

export default function QuickCreatePage() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);

  const form = useForm<QuickCreateValues>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      survey_url: "",
      project_name: "",
      country: "US",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: QuickCreateValues) => {
      const res = await apiRequest("POST", "/api/projects/quick-create", values);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Project Created",
        description: `Successfully created project ${data.project.projectCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (values: QuickCreateValues) => {
    mutation.mutate(values);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const exportToCSV = () => {
    if (!result?.supplier_links) return;

    const headers = ["Supplier", "Router Link"];
    const rows = result.supplier_links.map((link: any) => [
      link.supplierName || link.supplierCode,
      link.link
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `supplier_links_${result.project.projectCode}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (result) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Generated</h1>
            <p className="text-muted-foreground">
              Project {result.project.projectCode} has been created and links generated.
            </p>
          </div>
          <Button variant="outline" onClick={() => setResult(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Another
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-green-100 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{result.project.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Code:</span>
                <Badge variant="outline" className="bg-white">{result.project.projectCode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Country:</span>
                <span className="text-sm">{result.countrySurvey.countryCode}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-blue-600" />
                Main Router Link
              </CardTitle>
              <CardDescription>Entry point for direct traffic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={result.router_link} readOnly className="font-mono text-xs bg-white" />
                <Button variant="secondary" size="icon" onClick={() => copyToClipboard(result.router_link)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Supplier Links</CardTitle>
              <CardDescription>Generated links for all active suppliers</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Router Link</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.supplier_links.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {item.supplierName}
                      <br />
                      <span className="text-xs text-muted-foreground">{item.supplierCode}</span>
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate font-mono text-xs">
                      {item.link}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.link)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quick Project Creator</h1>
        <p className="text-muted-foreground mt-2">
          Paste a survey URL to automatically generate a project, country mapping, and all supplier routing links.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            The system will detect UID placeholders and generate a unique PRJ code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="survey_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://survey.com/start?id=123&uid={uid}" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Must include a placeholder like &#123;uid&#125; or [RID]
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="project_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Consumer Study Q1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project & Generate Links
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
