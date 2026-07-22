import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = [
  'https://preview--hunterembarque.lovable.app',
  'https://hunterembarque.com',
  'https://hunterembarque.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const CERTIFICATION_LABELS: { [key: string]: string } = {
  cir: "CIR", stcw: "STCW", caaq: "CAAQ", tbs1: "TBS1", espe: "ESPE",
  esrs: "ESRS", ebps: "EBPS", ecin: "ECIN", ecia_caci: "ECIA/CACI",
  eopn: "EOPN", ebcp: "EBCP", epsm: "EPSM", thuet: "THUET", cbsp: "CBSP",
  cess: "CESS", cerr: "CERR", efnt: "EFNT", ebpq: "EBPQ", ebgl: "EBGL",
  esop: "ESOP", bco: "BCO", dp: "DP", alph: "ALPH", cpso: "CPSO",
  cipn: "CIPN", ticb: "TICB", epoe: "EPOE", epor: "EPOR", gmdss: "GMDSS",
  cns014: "CNS 14", lpna: "LPNA", ht: "HT", cft: "CFT",
};

const requestSchema = z.object({
  userId: z.string().uuid().optional(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub;

    const body = await req.json();
    const { userId: requestedUserId } = requestSchema.parse(body);

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userId = requestedUserId || callerId;
    if (userId !== callerId) {
      const { data: adminCheck } = await supabase
        .from('administrators').select('id').eq('user_id', callerId).single();
      const { data: tiCheck } = await supabase
        .from('ti_users').select('id').eq('user_id', callerId).single();
      if (!adminCheck && !tiCheck) {
        return new Response(
          JSON.stringify({ error: "Acesso não autorizado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("*").eq("user_id", userId).single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch certifications
    const { data: certifications } = await supabase
      .from("certifications").select("*").eq("user_id", userId).single();

    // Fetch boarding history
    const { data: boardingHistory } = await supabase
      .from("professional_boarding_history").select("*").eq("profile_id", profile.id);

    // Fetch active jobs
    const { data: activeJobs } = await supabase
      .from("jobs")
      .select("id, title, function_name, required_certifications_list, requirements, short_description")
      .eq("is_active", true).limit(20);

    // Calculate profile completeness
    const profileFields = [
      profile.full_name, profile.email, profile.phone, profile.birth_date,
      profile.cpf, profile.desired_function, profile.street, profile.city, profile.state,
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const profileCompleteness = Math.round((completedFields / profileFields.length) * 100);

    // Get user's certifications
    const userCertifications = Object.keys(CERTIFICATION_LABELS)
      .filter(key => certifications?.[key] === true)
      .map(key => {
        const validity = certifications?.[`${key}_validity`];
        const isExpired = validity && new Date(validity) < new Date();
        return { name: CERTIFICATION_LABELS[key], key, isExpired, validity };
      });

    const validCertifications = userCertifications.filter(c => !c.isExpired);
    const expiredCertifications = userCertifications.filter(c => c.isExpired);

    // Calculate total boarding days
    const totalBoardingDays = boardingHistory?.reduce((acc, record) => {
      if (record.embarked_at) {
        const start = new Date(record.embarked_at);
        const end = record.disembarked_at ? new Date(record.disembarked_at) : new Date();
        return acc + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, 0) || 0;

    // Analyze job compatibility
    const jobAnalysis = activeJobs?.map(job => {
      const requiredCerts = (job.required_certifications_list || []) as string[];
      const matchedCerts = requiredCerts.filter(cert => validCertifications.some(vc => vc.key === cert));
      const missingCerts = requiredCerts.filter(cert => !userCertifications.some(uc => uc.key === cert))
        .map(cert => CERTIFICATION_LABELS[cert] || cert);
      const certMatch = requiredCerts.length > 0 ? Math.round((matchedCerts.length / requiredCerts.length) * 100) : 100;
      const functionMatch = profile.desired_function && job.function_name
        ? (profile.desired_function.toLowerCase().includes(job.function_name.toLowerCase()) ||
           job.function_name.toLowerCase().includes(profile.desired_function.toLowerCase()))
        : false;
      return {
        jobId: job.id, jobTitle: job.title, jobFunction: job.function_name,
        certMatch, functionMatch, missingCerts,
        potentialScore: Math.round(certMatch * 0.6 + (functionMatch ? 70 : 40) * 0.4),
      };
    }) || [];

    jobAnalysis.sort((a, b) => b.potentialScore - a.potentialScore);
    const topJobs = jobAnalysis.slice(0, 5);
    const compatibleJobs = jobAnalysis.filter(j => j.potentialScore >= 60);

    // Get most requested certifications from all jobs
    const allRequiredCerts: { [key: string]: number } = {};
    activeJobs?.forEach(job => {
      const certs = (job.required_certifications_list || []) as string[];
      certs.forEach(cert => { allRequiredCerts[cert] = (allRequiredCerts[cert] || 0) + 1; });
    });

    const sortedCerts = Object.entries(allRequiredCerts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key, name: CERTIFICATION_LABELS[key] || key, demandCount: count,
        userHas: validCertifications.some(vc => vc.key === key),
      }));

    const recommendedCerts = sortedCerts.filter(c => !c.userHas).slice(0, 5);

    // Generate AI analysis
    const profileSummary = {
      name: profile.full_name, desiredFunction: profile.desired_function,
      currentCertifications: validCertifications.map(c => c.name),
      expiredCertifications: expiredCertifications.map(c => c.name),
      totalBoardingDays, profileCompleteness,
      topCompatibleJobs: topJobs.slice(0, 3).map(j => ({ title: j.jobTitle, score: j.potentialScore, missing: j.missingCerts })),
      marketDemandCerts: recommendedCerts.map(c => ({ name: c.name, demandCount: c.demandCount })),
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um consultor de carreira especializado no setor marítimo brasileiro. 
Analise o perfil do profissional e forneça feedback construtivo e motivacional.
Foque em ações práticas que o profissional pode tomar para melhorar sua empregabilidade.

Responda APENAS em JSON válido com o formato:
{
  "overallAssessment": "Avaliação geral do perfil em 2-3 frases motivacionais",
  "strengths": ["lista de 3-5 pontos fortes do candidato"],
  "improvementAreas": [{"area": "nome da área", "priority": "alta|média|baixa", "action": "ação específica a tomar", "impact": "impacto esperado"}],
  "certificationStrategy": {"immediate": ["certificações prioritárias para obter agora"], "shortTerm": ["certificações para os próximos 6 meses"], "reasoning": "explicação da estratégia"},
  "careerTips": ["3-5 dicas práticas para o mercado marítimo"],
  "profileScore": number entre 0-100,
  "marketReadiness": "pronto|quase pronto|em desenvolvimento|iniciante"
}`,
          },
          {
            role: "user",
            content: `Analise este perfil profissional marítimo e forneça feedback para melhorias:\n\n${JSON.stringify(profileSummary, null, 2)}\n\nConsidere:\n1. A completude do perfil (${profileCompleteness}%)\n2. As certificações atuais vs. demanda do mercado\n3. A experiência de embarque (${totalBoardingDays} dias)\n4. As vagas mais compatíveis disponíveis\n5. Certificações mais demandadas que o profissional não possui`,
          },
        ],
      }),
    });

    let aiAnalysis = null;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) aiAnalysis = JSON.parse(jsonMatch[0]);
        } catch (e) { console.error("Error parsing AI response:", e); }
      }
    }

    // Build response
    const response = {
      success: true,
      profile: { name: profile.full_name, desiredFunction: profile.desired_function, completeness: profileCompleteness },
      certifications: {
        valid: validCertifications.length, expired: expiredCertifications.length,
        expiredList: expiredCertifications.map(c => c.name), validList: validCertifications.map(c => c.name),
      },
      experience: { totalBoardingDays, totalRecords: boardingHistory?.length || 0 },
      marketAnalysis: {
        totalActiveJobs: activeJobs?.length || 0, compatibleJobs: compatibleJobs.length,
        topOpportunities: topJobs, recommendedCertifications: recommendedCerts,
      },
      aiAnalysis,
    };

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error analyzing profile:", error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(
      JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : (error instanceof Error ? error.message : "Unknown error") }),
      { status: isZodError ? 400 : 500, headers: { ...ch, "Content-Type": "application/json" } }
    );
  }
});
