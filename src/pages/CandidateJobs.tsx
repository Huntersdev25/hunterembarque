/**
 * CandidateJobs - Página dedicada para exibição de vagas com design surreal
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { SurrealJobsGrid } from "@/components/SurrealJobsGrid";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Anchor } from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  function_name: string;
  is_active: boolean;
  created_at: string;
  required_certifications_list: string[];
}

interface Application {
  id: string;
  job_id: string;
  status: string;
}

interface ProfileData {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  city: string | null;
  state: string | null;
}

export default function CandidateJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [applyingToJob, setApplyingToJob] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [profileResponse, jobsResponse, applicationsResponse] = await Promise.all([
        supabase.from('profiles').select('id, full_name, cpf, birth_date, city, state').eq('user_id', user.id).single(),
        supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('applications').select('id, job_id, status').eq('candidate_id', user.id)
      ]);

      if (profileResponse.data) {
        setProfile(profileResponse.data);
      }

      if (jobsResponse.data) {
        setJobs(jobsResponse.data.map(job => ({
          ...job,
          required_certifications_list: Array.isArray(job.required_certifications_list) 
            ? job.required_certifications_list 
            : job.required_certifications_list 
              ? JSON.parse(job.required_certifications_list as string) 
              : []
        })));
      }

      if (applicationsResponse.data) {
        setApplications(applicationsResponse.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProfileComplete = useMemo(() => {
    if (!profile) return false;
    return !!(profile.full_name && profile.cpf && profile.birth_date && profile.city && profile.state);
  }, [profile]);

  const handleApply = useCallback(async (jobId: string) => {
    if (!user || applyingToJob) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (!isProfileComplete) {
      toast({
        title: "Perfil incompleto",
        description: "Complete seu perfil antes de se candidatar.",
        variant: "destructive",
      });
      return;
    }

    setApplyingToJob(jobId);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          candidate_id: user.id,
          job_id: jobId,
          status: 'lista_espera'
        });

      if (error) throw error;

      await fetchData();
      
      toast({
        title: "Candidatura enviada!",
        description: `Sua candidatura para "${job.title}" foi enviada com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao se candidatar:', error);
      toast({
        title: "Erro na candidatura",
        description: error.message || "Houve um erro ao enviar sua candidatura.",
        variant: "destructive",
      });
    } finally {
      setApplyingToJob(null);
    }
  }, [user, applyingToJob, jobs, isProfileComplete, toast]);

  if (loading) {
    return (
      <DashboardLayout userType="candidate">
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <Anchor className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="candidate">
      <div className="min-h-screen -m-0 sm:-m-4 lg:-m-6">
        <SurrealJobsGrid
          jobs={jobs}
          applications={applications}
          onApply={handleApply}
          applyingToJob={applyingToJob}
          profileId={profile?.id}
          isProfileComplete={isProfileComplete}
        />
      </div>
    </DashboardLayout>
  );
}
