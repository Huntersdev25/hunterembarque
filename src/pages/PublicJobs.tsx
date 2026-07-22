import { useState, useEffect } from "react";
import { parseDateLocal } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Anchor, Search, Clock, Eye, Send, CheckCircle2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  function_name: string;
  created_at: string;
  required_certifications_list: string[];
}

export default function PublicJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJobs();
    if (user) fetchApplications();
  }, [user]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map((j) => ({
        ...j,
        required_certifications_list: (() => {
          try {
            if (Array.isArray(j.required_certifications_list)) return j.required_certifications_list as string[];
            if (typeof j.required_certifications_list === "string") return JSON.parse(j.required_certifications_list);
            return [];
          } catch {
            return [];
          }
        })(),
      }));
      setJobs(transformed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("candidate_id", user.id);
    if (data) setAppliedJobs(new Set(data.map((a) => a.job_id)));
  };

  const handleApply = async (jobId: string) => {
    if (!user) {
      localStorage.setItem("redirectAfterLogin", `/vagas`);
      navigate("/register");
      return;
    }
    try {
      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        candidate_id: user.id,
        status: "lista_espera",
      });
      if (error) throw error;
      setAppliedJobs((prev) => new Set(prev).add(jobId));
      toast({ title: "Candidatura enviada!", description: "Boa sorte!" });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao se candidatar." });
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.function_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-maritime-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-3">
            Vagas Disponíveis
          </h1>
          <p className="text-primary-foreground/60 mb-6 max-w-2xl">
            Confira as oportunidades abertas no setor offshore. Cadastre-se para se candidatar.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cargo ou função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
            />
          </div>
        </div>
      </section>

      {/* Jobs Grid */}
      <main className="flex-1 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma vaga encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((job) => {
                const applied = appliedJobs.has(job.id);
                return (
                  <Card
                    key={job.id}
                    className="group relative overflow-hidden border-border/50 bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <div className="relative p-5">
                      {/* Badge row */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 px-3 py-1">
                          <Anchor className="h-3 w-3 mr-1.5" />
                          {job.function_name}
                        </Badge>
                        {applied && (
                          <Badge className="bg-success/15 text-success border border-success/25">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aplicado
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>

                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed whitespace-pre-wrap">
                        {job.description}
                      </p>

                      {/* Certifications */}
                      {job.required_certifications_list.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {job.required_certifications_list.slice(0, 3).map((cert, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              {cert.toUpperCase()}
                            </span>
                          ))}
                          {job.required_certifications_list.length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              +{job.required_certifications_list.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="h-px bg-border mb-4" />

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {format(parseDateLocal(job.created_at), "dd MMM", { locale: ptBR })}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/vagas/${job.id}`)}>
                            <Eye className="h-4 w-4 mr-1.5" />
                            Detalhes
                          </Button>
                          {!applied && (
                            <Button size="sm" onClick={() => handleApply(job.id)}>
                              <Send className="h-4 w-4 mr-1.5" />
                              {user ? "Candidatar" : "Criar Conta"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
