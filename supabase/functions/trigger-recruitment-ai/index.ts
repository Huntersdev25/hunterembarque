import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  application_id: z.string().uuid(),
  job_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  candidate_name: z.string().nullable().optional(),
  candidate_phone: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  function_name: z.string().nullable().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = parsed.data;

    // Webhook oficial da IA de recrutamento
    const webhookUrl =
      Deno.env.get("RECRUITMENT_AI_WEBHOOK_URL") ||
      Deno.env.get("JOB_APPLICATION_WEBHOOK_URL");

    if (!webhookUrl) {
      await supabase.from("candidate_onboarding_timeline").insert({
        job_id: data.job_id,
        candidate_id: data.candidate_id,
        application_id: data.application_id,
        event_type: "ai_webhook_failed",
        title: "Webhook da IA não configurado",
        description: "Configure a secret JOB_APPLICATION_WEBHOOK_URL para iniciar o contato automático.",
        source: "system",
        metadata: { reason: "missing_webhook_url" },
      });
      return new Response(JSON.stringify({ success: false, error: "webhook_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hidratar dados básicos do candidato e da vaga, caso não tenham vindo no body
    let candidateName = data.candidate_name ?? null;
    let candidatePhone = data.candidate_phone ?? null;
    let candidateEmail: string | null = null;
    let desiredFunction: string | null = null;
    let jobTitle = data.job_title ?? null;
    let functionName = data.function_name ?? null;
    let clientName: string | null = null;

    const [profileRes, jobRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, phone, desired_function")
        .eq("user_id", data.candidate_id)
        .maybeSingle(),
      supabase
        .from("jobs")
        .select("id, title, function_name, client_id, clients(company_name)")
        .eq("id", data.job_id)
        .maybeSingle(),
    ]);

    const profile = profileRes.data as any;
    const job = jobRes.data as any;
    if (profile) {
      candidateName = candidateName ?? profile.full_name ?? null;
      candidatePhone = candidatePhone ?? profile.phone ?? null;
      candidateEmail = profile.email ?? null;
      desiredFunction = profile.desired_function ?? null;
    }
    if (job) {
      jobTitle = jobTitle ?? job.title ?? null;
      functionName = functionName ?? job.function_name ?? null;
      clientName = job.clients?.company_name ?? null;
    }

    // Mesmo formato de payload usado em notify-job-application (dados básicos)
    const payload = {
      event: "candidate_applied_to_job",
      timestamp: new Date().toISOString(),
      candidate: {
        id: data.candidate_id,
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
        desired_function: desiredFunction,
      },
      job: {
        id: data.job_id,
        title: jobTitle,
        function_name: functionName,
        client_name: clientName,
      },
      application_id: data.application_id,
      retry: true,
    };

    let success = false;
    let responseText = "";
    let status = 0;

    try {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      status = r.status;
      responseText = await r.text();
      success = r.ok;
    } catch (e) {
      responseText = e instanceof Error ? e.message : String(e);
    }

    await supabase.from("candidate_onboarding_timeline").insert({
      job_id: data.job_id,
      candidate_id: data.candidate_id,
      application_id: data.application_id,
      event_type: success ? "ai_webhook_dispatched" : "ai_webhook_failed",
      title: success ? "Contato com IA reenviado" : "Falha ao reenviar contato com IA",
      description: success
        ? `IA recebeu os dados do candidato (${candidatePhone ?? "sem telefone"}) para a vaga "${jobTitle ?? ""}".`
        : `Erro ao chamar webhook (status ${status}).`,
      source: "system",
      metadata: { status, response: responseText.substring(0, 500) },
    });

    return new Response(JSON.stringify({ success }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("trigger-recruitment-ai error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
