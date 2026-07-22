import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Briefcase, 
  CheckCircle, 
  FileText, 
  Award, 
  LogIn, 
  Send, 
  Users, 
  Shield,
  Anchor,
  Waves,
  Compass,
  Ship,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileValidation } from "@/hooks/useProfileValidation";
import { JobApplicationButton } from "@/components/JobApplicationButton";

interface Job {
  id: string;
  title: string;
  function_name: string;
  description: string;
  requirements: string;
  required_certifications_list?: string[];
  is_active: boolean;
  created_at: string;
}

const CERTIFICATION_LABELS: { [key: string]: string } = {
  stcw: "STCW",
  cerr: "CERR",
  efnt: "EFNT", 
  ebpq: "EBPQ",
  ebgl: "EBGL",
  esop: "ESOP",
  cns014: "CNS-014",
  lpn: "LPN",
  gmdss: "GMDSS",
  cft: "CFT",
  caaq: "CAAQ",
  cbsp: "CBSP",
  tbs1: "TBS-1",
  cir: "CIR",
  thuet: "THUET",
  alph: "ALPH",
  espe: "ESPE",
  esrs: "ESRS",
  ebps: "EBPS",
  ecin: "ECIN",
  ecia_caci: "ECIA/CACI",
  ebcp: "EBCP",
  eopn: "EOPN",
  epsm: "EPSM",
  cess: "CESS"
};

export default function JobDetails() {
  const params = useParams<{ id?: string; jobId?: string }>();
  const id = params.jobId || params.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userCertifications, setUserCertifications] = useState<any>(null);

  const validation = useProfileValidation({ profile: userProfile, certifications: userCertifications });

  useEffect(() => {
    if (!id) return;
    fetchAllData();
  }, [id, user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const jobPromise = supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      const userPromises = user
        ? Promise.all([
            supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('certifications').select('*').eq('user_id', user.id).maybeSingle(),
            supabase.from('applications').select('id').eq('job_id', id).eq('candidate_id', user.id).maybeSingle(),
          ])
        : Promise.resolve(null);

      const [jobResult, userResults] = await Promise.all([jobPromise, userPromises]);

      if (jobResult.error || !jobResult.data) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Vaga não encontrada ou não está mais ativa"
        });
        navigate('/');
        return;
      }

      const data = jobResult.data;
      const transformedJob = {
        ...data,
        required_certifications_list: (() => {
          try {
            if (Array.isArray(data.required_certifications_list)) {
              return data.required_certifications_list;
            }
            if (typeof data.required_certifications_list === 'string') {
              return JSON.parse(data.required_certifications_list);
            }
            return [];
          } catch {
            return [];
          }
        })()
      };
      setJob(transformedJob);

      if (userResults) {
        const [profileRes, certRes, appRes] = userResults as any[];
        if (profileRes?.data) setUserProfile(profileRes.data);
        if (certRes?.data) setUserCertifications(certRes.data);
        if (appRes?.data) setHasApplied(true);
      }
    } catch (error) {
      console.error('Erro ao carregar vaga:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login');
      return;
    }

    const jobValidation = validation.validateForJobApplication(job?.required_certifications_list || []);
    if (!jobValidation.canApplyToJob) {
      toast({
        variant: "destructive",
        title: "Não é possível se candidatar",
        description: jobValidation.validationMessage
      });
      return;
    }

    setApplying(true);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: id,
          candidate_id: user.id,
          status: 'lista_espera'
        });

      if (error) throw error;
      setHasApplied(true);
      toast({
        title: "Sucesso!",
        description: "Candidatura enviada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao se candidatar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar candidatura. Tente novamente."
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/30 border-t-cyan-400"></div>
          <Anchor className="absolute inset-0 m-auto h-6 w-6 text-cyan-400 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
        </div>
        <div className="text-center relative z-10">
          <Ship className="h-20 w-20 text-slate-600 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-4">Vaga não encontrada</h2>
          <p className="text-slate-400 mb-8">Esta vaga não existe ou não está mais disponível</p>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/25"
          >
            <Anchor className="h-4 w-4 mr-2" />
            Voltar às Vagas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Surreal Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
        
        {/* Waves at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden opacity-20">
          <Waves className="absolute bottom-10 left-20 h-16 w-16 text-cyan-400 animate-pulse" />
          <Waves className="absolute bottom-5 left-1/4 h-12 w-12 text-blue-400 animate-pulse delay-300" />
          <Waves className="absolute bottom-8 right-1/3 h-14 w-14 text-cyan-300 animate-pulse delay-500" />
          <Waves className="absolute bottom-3 right-20 h-10 w-10 text-blue-300 animate-pulse delay-700" />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-3deg); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
      `}</style>

      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="mb-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 border border-cyan-500/20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {user ? 'Voltar ao Dashboard' : 'Voltar às Vagas'}
        </Button>

        {/* Hero Header */}
        <div className="relative mb-10">
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-3xl blur-xl" />
          <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl shadow-cyan-500/5">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
              <Compass className="h-5 w-5 text-blue-400 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            
            <div className="flex flex-col lg:flex-row items-start gap-6">
              {/* Icon */}
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Anchor className="h-10 w-10 text-white" />
                </div>
              </div>
              
              {/* Title & Info */}
              <div className="flex-1">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
                  {job.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 px-4 py-2 text-sm backdrop-blur-sm">
                    <Briefcase className="h-4 w-4 mr-2" />
                    {job.function_name}
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Vaga Ativa
                  </Badge>
                </div>
                <div className="flex items-center text-slate-400 text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                  Publicada em {new Date(job.created_at).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description Card */}
            <Card className="bg-slate-800/60 backdrop-blur-xl border-slate-700/50 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/20">
                    <FileText className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">Sobre a Oportunidade</CardTitle>
                    <CardDescription className="text-slate-400">
                      Conheça os detalhes desta posição
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base">
                    {job.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card className="bg-slate-800/60 backdrop-blur-xl border-slate-700/50 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-indigo-500/20">
                      <Award className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">Requisitos Necessários</CardTitle>
                      <CardDescription className="text-slate-400">
                        Qualificações essenciais para esta vaga
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    {job.requirements.split('\n').map((req, index) => (
                      req.trim() && (
                        <div 
                          key={index} 
                          className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-indigo-500/30 transition-colors duration-300"
                        >
                          <div className="h-3 w-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mt-2 flex-shrink-0 shadow-lg shadow-indigo-500/30" />
                          <p className="text-slate-300 leading-relaxed">{req.trim()}</p>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {job.required_certifications_list && job.required_certifications_list.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-xl border-slate-700/50 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center border border-emerald-500/20">
                      <Shield className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">Certificações Obrigatórias</CardTitle>
                      <CardDescription className="text-slate-400">
                        Você deve possuir as seguintes certificações válidas
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {job.required_certifications_list.map((cert, index) => (
                      <div 
                        key={index} 
                        className="group/cert relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 text-center hover:border-emerald-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/10"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover/cert:opacity-100 rounded-xl transition-opacity duration-300" />
                        <Shield className="h-6 w-6 text-emerald-400 mx-auto mb-2 relative z-10" />
                        <p className="font-bold text-emerald-300 text-sm relative z-10">
                          {CERTIFICATION_LABELS[cert] || cert.toUpperCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="bg-slate-800/60 backdrop-blur-xl border-slate-700/50 shadow-2xl sticky top-6 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Status da Vaga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative group/status">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl blur opacity-0 group-hover/status:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-300">Recrutamento Ativo</p>
                      <p className="text-sm text-slate-400">Aceitando candidaturas</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Publicada em:</span>
                    <span className="font-medium text-white">
                      {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-700/30">
                    <span className="text-slate-400">Função:</span>
                    <span className="font-medium text-cyan-300">{job.function_name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Card */}
            <Card className="bg-slate-800/60 backdrop-blur-xl border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-400" />
                  Sua Candidatura
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center space-y-4">
                    <div className="relative group/login">
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover/login:opacity-100 transition-opacity duration-500" />
                      <div className="relative p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <LogIn className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Faça login para se candidatar
                        </h3>
                        <p className="text-sm text-slate-400">
                          É necessário ter uma conta para enviar sua candidatura
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        localStorage.setItem('redirectAfterLogin', window.location.pathname);
                        navigate('/login');
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/25"
                      size="lg"
                    >
                      <LogIn className="h-5 w-5 mr-2" />
                      Fazer Login
                    </Button>
                  </div>
                ) : hasApplied ? (
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur" />
                      <div className="relative p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="relative">
                          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                          <Sparkles className="absolute top-0 right-1/4 h-4 w-4 text-emerald-300 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                          Candidatura Enviada!
                        </h3>
                        <p className="text-sm text-slate-400">
                          Sua candidatura foi enviada com sucesso. Acompanhe o status no seu dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <JobApplicationButton
                      jobId={job.id}
                      jobTitle={job.title}
                      jobFunctionName={job.function_name}
                      requiredCertifications={job.required_certifications_list || []}
                      profile={userProfile}
                      certifications={userCertifications}
                      hasApplied={hasApplied}
                      onApply={async (jobId: string) => {
                        if (!user) return;
                        try {
                          const { error } = await supabase
                            .from('applications')
                            .insert({
                              job_id: jobId,
                              candidate_id: user.id,
                              status: 'lista_espera'
                            });

                          if (error) throw error;
                          setHasApplied(true);
                          await fetchAllData();
                        } catch (error) {
                          console.error('Erro ao se candidatar:', error);
                          throw error;
                        }
                      }}
                      fetchUserProfile={fetchAllData}
                      fetchUserCertifications={fetchAllData}
                      disabled={applying}
                      userId={user.id}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
