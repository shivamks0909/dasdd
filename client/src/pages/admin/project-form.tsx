import React, { useState, Fragment, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings2,
  Globe,
  Users,
  Link as LinkIcon,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type CountryRow = {
  id: string; // temp uuid for key
  country_code: string;
  survey_url: string;
  status: 'active' | 'paused';
};

export default function ProjectFormPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Step 1
    project_name: '',
    project_code: '',
    client: '',
    status: 'active',
    // RID config
    rid_prefix: '',
    rid_country_code: '',
    rid_padding: 4,
    rid_counter: 1,
    // Step 2
    countries: [] as CountryRow[],
    supplier_id: '',
  });
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const [match, params] = useRoute("/admin/projects/:id/edit");
  const isEditing = !!match;
  const projectId = params?.id;

  // Fetch data
  const { data: projectData, isSuccess: isProjectLoaded } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isEditing && !!projectId,
  });

  const { data: projectSurveys, isSuccess: isSurveysLoaded } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/surveys`],
    enabled: isEditing && !!projectId,
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Populate form on edit
  useEffect(() => {
    if (isEditing && isProjectLoaded && projectData) {
      setFormData(prev => ({
        ...prev,
        project_name: projectData.projectName || '',
        project_code: projectData.projectCode || '',
        client: projectData.client || '',
        status: projectData.status || 'active',
        rid_prefix: projectData.ridPrefix || '',
        rid_country_code: projectData.ridCountryCode || '',
        rid_padding: projectData.ridPadding || 4,
        rid_counter: projectData.ridCounter || 1,
      }));
    }
  }, [isEditing, isProjectLoaded, projectData]);

  useEffect(() => {
    if (isEditing && isSurveysLoaded && projectSurveys) {
      setFormData(prev => ({
        ...prev,
        countries: projectSurveys.map(s => ({
          id: s.id.toString(), // Use actual ID as string for key
          country_code: s.countryCode || '',
          survey_url: s.surveyUrl || '',
          status: s.status || 'active'
        }))
      }));
    }
  }, [isEditing, isSurveysLoaded, projectSurveys]);

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.project_name.trim() || formData.project_name.length < 2)
      newErrors.project_name = 'Project name is required';
    if (!formData.project_code.trim())
      newErrors.project_code = 'Project code is required';
    else if (!/^[A-Z0-9]{3,}$/.test(formData.project_code))
      newErrors.project_code = 'Code must be uppercase alphanumeric, min 3 chars';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    if (formData.countries.length === 0) {
      setErrors({ countries: 'Add at least one country' });
      return false;
    }
    for (const c of formData.countries) {
      if (!c.country_code || c.country_code.length !== 2) {
        setErrors({ countries: 'Invalid ISO code' });
        return false;
      }
      if (!c.survey_url.trim()) {
        setErrors({ countries: 'Survey URL missing' });
        return false;
      }
    }
    return true;
  };

  const addCountry = () => {
    setFormData((prev: any) => ({
      ...prev,
      countries: [...prev.countries, {
        id: crypto.randomUUID(),
        country_code: '',
        survey_url: '',
        status: 'active'
      }]
    }));
  };

  const removeCountry = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      countries: prev.countries.filter((c: any) => c.id !== id)
    }));
  };

  const updateCountry = (id: string, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      countries: prev.countries.map((c: any) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing ? `/api/projects/${projectId}` : "/api/projects";

      const projectRes = await apiRequest(method, url, {
        projectName: formData.project_name,
        projectCode: formData.project_code.toUpperCase(),
        client: formData.client,
        status: formData.status,
        ridPrefix: formData.rid_prefix,
        ridCountryCode: formData.rid_country_code,
        ridPadding: formData.rid_padding,
        ridCounter: formData.rid_counter,
      });
      const project = await projectRes.json();

      // Handle surveys
      if (isEditing) {
        // Simple approach for now: DELETE all existing surveys for this project and re-add
        // Robust approach would be to diff, but given the scale, this is safer for consistency
        await apiRequest("DELETE", `/api/projects/${project.id}/surveys/all`);
      }

      if (formData.countries.length > 0) {
        for (const c of formData.countries) {
          await apiRequest("POST", `/api/projects/${project.id}/surveys`, {
            countryCode: c.country_code.toUpperCase(),
            surveyUrl: c.survey_url,
            status: c.status,
            projectCode: project.projectCode
          });
        }
      }

      toast({ 
        title: isEditing ? "Project successfully updated" : "Project successfully initialized",
        description: isEditing ? `${formData.project_name} has been synchronized.` : "Your campaign is now live."
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (isEditing) {
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/surveys`] });
      }
      
      setLocation(`/admin/projects`);

    } catch (error: any) {
      toast({ 
        title: isEditing ? "Update error" : "Initialization error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['General Info', 'Country Setup', 'Supplier Config', 'Review & Launch'];

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-slate-200/60">
        <div>
          <button
            onClick={() => setLocation('/admin/projects')}
            className="text-slate-400 hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 transition-all group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Return to Fleet
          </button>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            {isEditing ? `Edit ${formData.project_name}` : 'Project Architect'}
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-bold">
            {isEditing ? 'Modify campaign parameters and endpoints' : 'Configure routing parameters and regional endpoints'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Step Indicator */}
        <div className="mb-14 px-4 overflow-x-auto no-scrollbar py-2">
          <div className="flex items-center gap-2 min-w-[600px] justify-between">
            {steps.map((step, i) => (
              <Fragment key={i}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500",
                    currentStep > i + 1
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                      : currentStep === i + 1
                        ? "bg-primary text-white scale-110 shadow-xl shadow-primary/20 ring-4 ring-primary/5"
                        : "bg-slate-100 text-slate-400"
                  )}>
                    {currentStep > i + 1 ? <CheckCircle2 className="size-5" /> : i + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                      currentStep === i + 1 ? "text-slate-800" : "text-slate-300"
                    )}>
                      Step {i + 1}
                    </span>
                    <span className={cn(
                      "text-[11px] font-bold transition-colors duration-300 whitespace-nowrap",
                      currentStep === i + 1 ? "text-primary" : "text-slate-400"
                    )}>
                      {step}
                    </span>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px min-w-[30px] mx-2 transition-colors duration-500",
                    currentStep > i + 1 ? "bg-emerald-200" : "bg-slate-100"
                  )} />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white/40 border-slate-200/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
            <Settings className="w-48 h-48" />
          </div>
          <CardContent className="p-10 relative z-10">
            <div className="mb-12">
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-1">
                {currentStep}: {steps[currentStep - 1]}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {currentStep === 1 && "Core campaign metadata and ID generation rules"}
                {currentStep === 2 && "Regional exit nodes and target survey mapping"}
                {currentStep === 3 && "Primary traffic aggregator assignment"}
                {currentStep === 4 && "Final telemetry audit and link generation"}
              </p>
            </div>

            <div className="space-y-10">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Project Identifier</label>
                      <input
                        placeholder="e.g. Q4 Consumer Pulse"
                        value={formData.project_name}
                        onChange={e => update('project_name', e.target.value)}
                        className={cn(
                          "w-full h-14 bg-white/60 border-slate-200/60 rounded-2xl px-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary/5 transition-all outline-none",
                          errors.project_name && "border-rose-500 bg-rose-50/30"
                        )}
                      />
                      {errors.project_name && <p className="text-rose-500 text-[10px] font-black uppercase ml-1">{errors.project_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">System Code (PID)</label>
                      <input
                        placeholder="PROJECT_X_2024"
                        value={formData.project_code}
                        onChange={e => update('project_code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                        className={cn(
                          "w-full h-14 bg-white/60 border-slate-200/60 rounded-2xl px-6 font-mono font-black text-slate-800 focus:ring-4 focus:ring-primary/5 transition-all outline-none",
                          errors.project_code && "border-rose-500 bg-rose-50/30"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Client Nexus</label>
                      <select
                        value={formData.client}
                        onChange={e => update('client', e.target.value)}
                        className="w-full h-14 bg-white/60 border-slate-200/60 rounded-2xl px-6 font-bold text-slate-800 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      >
                        <option value="">Select Internal or Agency</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Operational Status</label>
                      <select
                        value={formData.status}
                        onChange={e => update('status', e.target.value)}
                        className="w-full h-14 bg-white/60 border-slate-200/60 rounded-2xl px-6 font-black text-[11px] uppercase tracking-widest text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                  </div>

                  {/* RID Block */}
                  <div className="md:col-span-2 mt-10 p-10 bg-slate-50 shadow-inner rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 grayscale">
                      <Settings2 className="w-16 h-16" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-8 ml-1">RID Sequence Logic</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-1">Key Prefix</label>
                        <input
                          type="text"
                          value={formData.rid_prefix}
                          onChange={e => update('rid_prefix', e.target.value.toUpperCase())}
                          className="w-full h-12 bg-white/80 border-slate-200 rounded-xl px-4 font-mono font-black"
                          placeholder="PRX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-1">Locale Tag</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.rid_country_code}
                          onChange={e => update('rid_country_code', e.target.value.toUpperCase())}
                          className="w-full h-12 bg-white/80 border-slate-200 rounded-xl px-4 font-mono font-black placeholder:opacity-30"
                          placeholder="US"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-1">Length Padding</label>
                        <input
                          type="number"
                          value={formData.rid_padding}
                          onChange={e => update('rid_padding', parseInt(e.target.value) || 4)}
                          className="w-full h-12 bg-white/80 border-slate-200 rounded-xl px-4 font-black"
                        />
                      </div>
                    </div>

                    <div className="mt-10 flex items-center justify-between gap-6 flex-wrap">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Telemetry ID Sample</span>
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">
                          {formData.rid_prefix}{formData.rid_country_code}<span className="text-primary">{String(formData.rid_counter).padStart(formData.rid_padding, '0')}</span>
                        </span>
                      </div>
                      <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-black text-[9px] uppercase tracking-widest shadow-sm">
                        Pattern Validated
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl">
                        <Globe className="w-4 h-4 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Exit Node Mapping</h3>
                    </div>
                    <button
                      onClick={addCountry}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Append Locale
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-1 overflow-hidden shadow-inner">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white/40 border-b border-slate-200">
                          <th className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 w-32">ISO Tag</th>
                          <th className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">Target Endpoint (Survey URL)</th>
                          <th className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 w-24 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.countries.map(row => (
                          <tr key={row.id} className="group/row hover:bg-white/80 transition-all border-b border-slate-100 last:border-none">
                            <td className="px-8 py-4">
                              <input
                                value={row.country_code}
                                onChange={e => updateCountry(row.id, 'country_code', e.target.value.toUpperCase())}
                                maxLength={2}
                                className="w-16 h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-black text-center focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                placeholder="..."
                              />
                            </td>
                            <td className="px-8 py-4">
                              <input
                                value={row.survey_url}
                                onChange={e => updateCountry(row.id, 'survey_url', e.target.value)}
                                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-4 text-xs font-bold text-slate-600 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                placeholder="https://client-survey.com/start?id={RID}"
                              />
                            </td>
                            <td className="px-8 py-4 text-center">
                              <button
                                onClick={() => removeCountry(row.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {formData.countries.length === 0 && (
                      <div className="py-24 flex flex-col items-center justify-center opacity-20">
                        <Globe className="w-16 h-16 mb-4" />
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Registry Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Aggregator Assignment</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Select the primary traffic origin cluster</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <select
                      value={formData.supplier_id}
                      onChange={e => update('supplier_id', e.target.value)}
                      className="w-full h-16 bg-white/80 border-slate-200 rounded-2xl px-6 font-black text-sm uppercase tracking-widest text-slate-700 focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm"
                    >
                      <option value="">Manually Configure Later</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>

                    <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-3xl group/info">
                      <p className="text-[11px] font-bold text-blue-600 leading-relaxed uppercase tracking-wide">
                        Selection Note: Assigning an aggregator now will automatically generate the corresponding universal tracking endpoints for all defined regional nodes once the project is initialized.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-10 animate-in zoom-in-95 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="p-8 bg-slate-50/80 rounded-[2.5rem] border border-slate-200 group/audit">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Audit Log
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Name</span>
                          <span className="text-[13px] font-black text-slate-800 tracking-tight">{formData.project_name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Fleet Code</span>
                          <span className="text-[13px] font-black text-primary font-mono">{formData.project_code}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Logic</span>
                          <span className="text-[13px] font-black text-slate-800 font-mono">
                            {formData.rid_prefix}-*{formData.rid_country_code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-white/40 border border-slate-100 rounded-[2.5rem] shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6">Regional Targets</h4>
                      <div className="space-y-3 max-h-[160px] overflow-y-auto no-scrollbar">
                        {formData.countries.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                            <span className="text-xs font-black text-slate-800">{c.country_code}</span>
                            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[140px]">{c.survey_url}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-10 bg-primary/5 border border-primary/10 rounded-[2.5rem] group/final">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                        <LinkIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Live Nexus Endpoints (Preview)</h3>
                    </div>
                    <div className="space-y-4">
                      {formData.countries.length > 0 ? (
                        formData.countries.map(c => (
                          <div key={c.id} className="p-5 bg-white border border-primary/20 rounded-2xl shadow-inner hover:border-primary/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                                Locale: {c.country_code || '[CC]'}
                              </span>
                            </div>
                            <code className="text-[11px] font-black font-mono text-primary/80 break-all leading-relaxed tracking-tight block selection:bg-primary/20">
                              {isMounted ? `${origin}/track?code=${formData.project_code || '[CODE]'}&country=${c.country_code || '[CC]'}&uid=[RID]` : "Loading endpoint..."}
                            </code>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 bg-white border border-primary/20 rounded-2xl shadow-inner hover:border-primary/40 transition-all">
                          <code className="text-[11px] font-black font-mono text-primary/80 break-all leading-relaxed tracking-tight block">
                            {isMounted ? `${origin}/track?code=${formData.project_code || '[CODE]'}&country=[CC]&uid=[RID]` : "Loading endpoint..."}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-16 pt-10 border-t border-slate-100">
                <div>
                  {currentStep > 1 && (
                    <button
                      onClick={() => setCurrentStep(s => s - 1)}
                      disabled={submitting}
                      className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all flex items-center gap-3 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" /> Go Back
                    </button>
                  )}
                </div>

                <div className="flex gap-4">
                  {currentStep < 4 ? (
                    <button
                      className="h-14 px-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center gap-3 hover:scale-[1.03] active:scale-95"
                      onClick={() => {
                        let valid = true;
                        if (currentStep === 1) valid = validateStep1();
                        if (currentStep === 2) valid = validateStep2();
                        if (valid) setCurrentStep(s => s + 1);
                      }}
                    >
                      Next Phase <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="h-16 px-16 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center gap-4 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? (
                        "Initializing Fleet..."
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" /> {isEditing ? "Synchronize Changes" : "Initialize Project"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
