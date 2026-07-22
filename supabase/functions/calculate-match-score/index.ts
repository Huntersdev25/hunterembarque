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

interface CertificationLabels { [key: string]: string; }
const CERTIFICATION_LABELS: CertificationLabels = {
  cir: "CIR", stcw: "STCW", caaq: "CAAQ", tbs1: "TBS1", espe: "ESPE",
  esrs: "ESRS", ebps: "EBPS", ecin: "ECIN", ecia_caci: "ECIA/CACI",
  eopn: "EOPN", ebcp: "EBCP", epsm: "EPSM", thuet: "THUET", cbsp: "CBSP",
  cess: "CESS", cerr: "CERR", efnt: "EFNT", ebpq: "EBPQ", ebgl: "EBGL",
  esop: "ESOP", bco: "BCO", dp: "DP", alph: "ALPH", cpso: "CPSO",
  cipn: "CIPN", ticb: "TICB", epoe: "EPOE", epor: "EPOR", gmdss: "GMDSS",
  cns014: "CNS 14", lpna: "LPNA", ht: "HT", cft: "CFT",
};

const FUNCTION_GROUPS: { [key: string]: string[] } = {
  "convés": ["marinheiro", "contramestre", "mestre", "imediato", "comandante", "moço de convés", "oficial de náutica"],
  "máquinas": ["motorista", "mecânico", "eletricista", "oficial de máquinas", "chefe de máquinas", "moço de máquinas"],
  "cozinha": ["cozinheiro", "auxiliar de cozinha", "taifeiro", "comissário"],
  "segurança": ["bombeiro", "segurança", "oficial de segurança"],
  "operações": ["operador de guindaste", "operador de dp", "plataformista", "mergulhador"],
};

function calculateFunctionSimilarity(profileFunction: string, jobFunction: string): number {
  if (!profileFunction || !jobFunction) return 0.3;
  const profileLower = profileFunction.toLowerCase().trim();
  const jobLower = jobFunction.toLowerCase().trim();
  if (profileLower === jobLower) return 1.0;
  if (profileLower.includes(jobLower) || jobLower.includes(profileLower)) return 0.85;
  for (const group of Object.values(FUNCTION_GROUPS)) {
    const profileInGroup = group.some(f => profileLower.includes(f) || f.includes(profileLower));
    const jobInGroup = group.some(f => jobLower.includes(f) || f.includes(jobLower));
    if (profileInGroup && jobInGroup) return 0.7;
  }
  const profileWords = profileLower.split(/\s+/);
  const jobWords = jobLower.split(/\s+/);
  const commonWords = profileWords.filter(w => jobWords.includes(w) && w.length > 3);
  if (commonWords.length > 0) return 0.5;
  return 0.25;
}

const matchScoreSchema = z.object({
  profileId: z.string().uuid('profileId deve ser um UUID válido'),
  jobId: z.string().uuid('jobId deve ser um UUID válido'),
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

    const body = await req.json();
    const { profileId, jobId } = matchScoreSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authorization: only the profile owner, admins, or TI can calculate match scores
    const callerId = claimsData.claims.sub;
    const { data: profileOwner } = await supabase.from("profiles").select("user_id").eq("id", profileId).single();
    if (profileOwner?.user_id !== callerId) {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: callerId });
      const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: callerId });
      if (!isAdmin && !isTI) {
        return new Response(
          JSON.stringify({ error: "Acesso não autorizado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch certifications
    const { data: certifications } = await supabase
      .from("certifications")
      .select("*")
      .eq("user_id", profile.user_id)
      .single();

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch boarding history
    const { data: boardingHistory } = await supabase
      .from("professional_boarding_history")
      .select("*")
      .eq("profile_id", profileId);

    // Calculate certification score
    let certificationScore = 100;
    const requiredCerts = job.required_certifications_list || [];
    const missingCertifications: string[] = [];
    const expiredCertifications: string[] = [];
    const validCertifications: string[] = [];
    
    if (requiredCerts.length > 0) {
      let matchedCerts = 0;
      let expiredCerts = 0;
      const today = new Date();

      for (const certKey of requiredCerts) {
        const hasCert = certifications?.[certKey] === true;
        const validityDate = certifications?.[`${certKey}_validity`];
        const certName = CERTIFICATION_LABELS[certKey] || certKey.toUpperCase();
        
        if (hasCert) {
          if (validityDate && new Date(validityDate) < today) {
            expiredCerts++;
            expiredCertifications.push(certName);
          } else {
            matchedCerts++;
            validCertifications.push(certName);
          }
        } else {
          missingCertifications.push(certName);
        }
      }

      const totalRequired = requiredCerts.length;
      certificationScore = Math.round(((matchedCerts - expiredCerts * 0.5) / totalRequired) * 100);
      certificationScore = Math.max(0, Math.min(100, certificationScore));
    }

    // Calculate experience score
    const functionSimilarity = calculateFunctionSimilarity(profile.desired_function, job.function_name);
    let experienceScore = Math.round(30 + (functionSimilarity * 40));

    let totalBoardingDays = 0;
    let relevantExperienceDays = 0;
    
    if (boardingHistory && boardingHistory.length > 0) {
      totalBoardingDays = boardingHistory.reduce((acc, record) => {
        if (record.embarked_at) {
          const start = new Date(record.embarked_at);
          const end = record.disembarked_at ? new Date(record.disembarked_at) : new Date();
          return acc + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
        return acc;
      }, 0);

      const relevantHistory = boardingHistory.filter(b => {
        if (!b.position || !job.function_name) return false;
        return calculateFunctionSimilarity(b.position, job.function_name) >= 0.5;
      });
      
      relevantExperienceDays = relevantHistory.reduce((acc, record) => {
        if (record.embarked_at) {
          const start = new Date(record.embarked_at);
          const end = record.disembarked_at ? new Date(record.disembarked_at) : new Date();
          return acc + Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
        return acc;
      }, 0);

      if (totalBoardingDays > 365) experienceScore += 15;
      else if (totalBoardingDays > 180) experienceScore += 10;
      else if (totalBoardingDays > 90) experienceScore += 7;
      else if (totalBoardingDays > 30) experienceScore += 5;

      if (relevantExperienceDays > 180) experienceScore += 15;
      else if (relevantExperienceDays > 90) experienceScore += 10;
      else if (relevantExperienceDays > 30) experienceScore += 5;
    }

    experienceScore = Math.min(100, Math.max(0, experienceScore));
    const overallScore = Math.round(certificationScore * 0.6 + experienceScore * 0.4);

    const feedback = {
      functionMatch: functionSimilarity >= 0.7 ? "alta" : functionSimilarity >= 0.5 ? "média" : "baixa",
      functionDetails: functionSimilarity < 0.7 
        ? `Sua função desejada (${profile.desired_function || 'não informada'}) tem ${Math.round(functionSimilarity * 100)}% de similaridade com a vaga (${job.function_name}).`
        : null,
      missingCertifications,
      expiredCertifications,
      validCertifications,
      totalBoardingDays,
      relevantExperienceDays,
      recommendations: [] as string[],
    };

    if (missingCertifications.length > 0) {
      feedback.recommendations.push(`Obtenha as certificações: ${missingCertifications.join(', ')}`);
    }
    if (expiredCertifications.length > 0) {
      feedback.recommendations.push(`Renove as certificações vencidas: ${expiredCertifications.join(', ')}`);
    }
    if (functionSimilarity < 0.7 && job.function_name) {
      feedback.recommendations.push(`Considere atualizar sua função desejada para "${job.function_name}" ou funções relacionadas`);
    }
    if (totalBoardingDays < 90) {
      feedback.recommendations.push('Busque mais experiência de embarque para aumentar suas chances');
    }
    if (relevantExperienceDays < 30 && boardingHistory && boardingHistory.length > 0) {
      feedback.recommendations.push(`Busque experiência específica na área de ${job.function_name}`);
    }

    let aiAnalysis = null;
    let aiSummary = null;

    if (lovableApiKey) {
      try {
        const profileSummary = {
          name: profile.full_name,
          desiredFunction: profile.desired_function,
          experience: profile.professional_experience?.substring(0, 500),
          certifications: Object.keys(CERTIFICATION_LABELS)
            .filter(key => certifications?.[key] === true)
            .map(key => CERTIFICATION_LABELS[key]),
          totalBoardingDays,
          relevantExperienceDays,
        };

        const jobSummary = {
          title: job.title,
          function: job.function_name,
          requirements: job.requirements?.substring(0, 500),
          requiredCertifications: requiredCerts.map((c: string) => CERTIFICATION_LABELS[c] || c),
        };

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Você é um especialista em recrutamento marítimo. Analise a compatibilidade entre candidato e vaga de forma construtiva e motivacional. 
                IMPORTANTE: Mesmo que a função desejada seja diferente, analise as habilidades transferíveis e potencial do candidato.
                Responda APENAS em JSON válido com formato: {\"summary\": \"resumo motivacional de 1-2 frases\", \"analysis\": \"análise detalhada\", \"strengths\": [\"pontos fortes do candidato\"], \"improvements\": [\"ações específicas para melhorar o match\"], \"transferableSkills\": [\"habilidades que podem ser aproveitadas mesmo com função diferente\"]}`,
              },
              {
                role: "user",
                content: `Analise o match entre este candidato e vaga:
                
Candidato: ${JSON.stringify(profileSummary)}
Vaga: ${JSON.stringify(jobSummary)}
Scores calculados: Certificações ${certificationScore}%, Experiência ${experienceScore}%, Overall ${overallScore}%
Feedback: ${JSON.stringify(feedback)}

Seja construtivo e mostre caminhos para o candidato melhorar, mesmo que o match atual seja baixo.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                aiSummary = parsed.summary;
                aiAnalysis = JSON.stringify({ ...parsed, feedback });
              } else {
                aiSummary = content.substring(0, 200);
                aiAnalysis = JSON.stringify({ analysis: content, feedback });
              }
            } catch {
              aiSummary = content.substring(0, 200);
              aiAnalysis = JSON.stringify({ analysis: content, feedback });
            }
          }
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        aiAnalysis = JSON.stringify({ feedback });
      }
    } else {
      aiAnalysis = JSON.stringify({ feedback });
    }

    // Upsert match score
    const { error: upsertError } = await supabase
      .from("job_match_scores")
      .upsert({
        profile_id: profileId,
        job_id: jobId,
        overall_score: overallScore,
        certification_score: certificationScore,
        experience_score: experienceScore,
        ai_analysis: aiAnalysis,
        ai_summary: aiSummary,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: "profile_id,job_id",
      });

    if (upsertError) {
      console.error("Error saving match score:", upsertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchScore: {
          overall: overallScore,
          certification: certificationScore,
          experience: experienceScore,
          aiSummary,
          aiAnalysis: aiAnalysis ? JSON.parse(aiAnalysis) : null,
          feedback,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating match score:", error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(
      JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : (error instanceof Error ? error.message : "Unknown error") }),
      { status: isZodError ? 400 : 500, headers: { ...ch, "Content-Type": "application/json" } }
    );
  }
});
