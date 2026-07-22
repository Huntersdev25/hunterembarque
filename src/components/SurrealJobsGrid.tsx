/**
 * SurrealJobsGrid - Grid de vagas com design elegante
 * Usa cores do design system para consistência visual
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SurrealJobCard } from "./SurrealJobCard";
import { 
  Search, 
  Briefcase, 
  Anchor,
  Filter,
  Grid3X3,
  LayoutList
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  function_name: string;
  created_at: string;
  cover_image_url?: string;
  required_certifications_list: string[];
}

interface SurrealJobsGridProps {
  jobs: Job[];
  applications: { job_id: string }[];
  onApply: (jobId: string) => void;
  applyingToJob: string | null;
  profileId?: string;
  isProfileComplete: boolean;
}

export function SurrealJobsGrid({
  jobs,
  applications,
  onApply,
  applyingToJob,
  profileId,
  isProfileComplete
}: SurrealJobsGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const availableFunctions = useMemo(() => {
    return [...new Set(jobs.map(j => j.function_name))];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchTerm || 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.function_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFunction = functionFilter === "all" || job.function_name === functionFilter;
      
      return matchesSearch && matchesFunction;
    });
  }, [jobs, searchTerm, functionFilter]);

  const hasApplied = (jobId: string) => applications.some(app => app.job_id === jobId);

  return (
    <div className="relative min-h-[600px] p-4 sm:p-6 lg:p-8">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Anchor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vagas Disponíveis</h1>
              <p className="text-sm text-muted-foreground">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vagas, funções ou palavras-chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Function Filter */}
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-background border-border">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todas as funções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {availableFunctions.map(fn => (
                  <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Jobs Grid/List */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma vaga encontrada</h3>
            <p className="text-muted-foreground mb-4">Tente ajustar seus filtros de busca</p>
            <Button
              variant="outline"
              onClick={() => { setSearchTerm(""); setFunctionFilter("all"); }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className={`grid gap-5 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1 max-w-3xl mx-auto"
          }`}>
            {filteredJobs.map((job, index) => (
              <SurrealJobCard
                key={job.id}
                job={job}
                applied={hasApplied(job.id)}
                onApply={onApply}
                isApplying={applyingToJob === job.id}
                profileId={profileId}
                disabled={!isProfileComplete}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
