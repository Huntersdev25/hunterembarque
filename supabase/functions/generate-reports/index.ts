import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabase.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'generate-reports', p_max_requests: 3, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const schema = z.object({ type: z.enum(['applications', 'candidates', 'jobs', 'certifications']), filters: z.object({ startDate: z.string().optional(), endDate: z.string().optional(), status: z.string().optional(), jobId: z.string().uuid().optional() }).optional() });
    const { type, filters = {} } = schema.parse(body);

    console.log(`Generating ${type} report for admin: ${user.id}`);

    let reportData; let summary;

    switch (type) {
      case 'applications': {
        const { data: applications } = await supabase.from('applications').select(`*, jobs:job_id (title, function_name), profiles:candidate_id (full_name, email, phone)`).order('applied_at', { ascending: false });
        const statusCounts = applications?.reduce((acc, app) => { acc[app.status] = (acc[app.status] || 0) + 1; return acc; }, {} as Record<string, number>) || {};
        reportData = applications; summary = { total: applications?.length || 0, byStatus: statusCounts, recentApplications: applications?.slice(0, 10) || [] }; break;
      }
      case 'candidates': {
        const { data: candidates } = await supabase.from('profiles').select(`*, certifications (*)`).eq('role', 'candidate').order('created_at', { ascending: false });
        const completedProfiles = candidates?.filter(c => c.profile_complete).length || 0;
        const withCertifications = candidates?.filter(c => c.certifications && c.certifications.length > 0).length || 0;
        reportData = candidates; summary = { total: candidates?.length || 0, completed: completedProfiles, withCertifications, completionRate: candidates?.length ? Math.round((completedProfiles / candidates.length) * 100) : 0 }; break;
      }
      case 'jobs': {
        const { data: jobs } = await supabase.from('jobs').select(`*, applications (id, status, applied_at)`).order('created_at', { ascending: false });
        const activeJobs = jobs?.filter(j => j.is_active).length || 0;
        const totalApplications = jobs?.reduce((acc, job) => acc + (job.applications?.length || 0), 0) || 0;
        reportData = jobs; summary = { total: jobs?.length || 0, active: activeJobs, totalApplications, avgApplicationsPerJob: jobs?.length ? Math.round(totalApplications / jobs.length) : 0 }; break;
      }
      case 'certifications': {
        const { data: certificationData } = await supabase.from('certifications').select(`*, profiles:user_id (full_name, email)`);
        const certTypes = ['stcw','tbs1','cbsp','thuet','lpn','gmdss','cft','caaq','cns014','espe','esrs','ebps','ecin','ecia_caci','ebcp','eopn','epsm','cess','cerr','efnt','ebpq','ebgl','esop','alph','cir'];
        const certStats = certTypes.reduce((acc, cert) => { acc[cert] = certificationData?.filter(c => c[cert] === true).length || 0; return acc; }, {} as Record<string, number>);
        reportData = certificationData; summary = { totalRecords: certificationData?.length || 0, certificationStats: certStats, mostCommon: Object.entries(certStats).sort(([, a], [, b]) => b - a).slice(0, 5) }; break;
      }
    }

    return new Response(JSON.stringify({ success: true, reportType: type, generatedAt: new Date().toISOString(), summary, data: reportData, filters }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Report generation error:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
