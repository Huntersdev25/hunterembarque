import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-callback-secret",
};

const BodySchema = z.object({
  application_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  event_type: z.string().min(1).max(60).default("ai_update"),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  metadata: z.record(z.any()).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Optional shared secret: if RECRUITMENT_AI_CALLBACK_SECRET is set, require header match
    const expectedSecret = Deno.env.get("RECRUITMENT_AI_CALLBACK_SECRET");
    if (expectedSecret) {
      const header = req.headers.get("x-callback-secret");
      if (header !== expectedSecret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payload", details: parsed.error.flatten() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let { application_id, job_id, candidate_id } = data;

    // If only application_id is provided, hydrate job/candidate
    if (application_id && (!job_id || !candidate_id)) {
      const { data: app } = await supabase
        .from("applications")
        .select("job_id, candidate_id")
        .eq("id", application_id)
        .maybeSingle();
      if (app) {
        job_id = job_id ?? app.job_id;
        candidate_id = candidate_id ?? app.candidate_id;
      }
    }

    if (!job_id || !candidate_id) {
      return new Response(
        JSON.stringify({ success: false, error: "missing job_id or candidate_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase.from("candidate_onboarding_timeline").insert({
      job_id,
      candidate_id,
      application_id: application_id ?? null,
      event_type: data.event_type,
      title: data.title,
      description: data.description ?? null,
      source: "ai",
      metadata: data.metadata ?? {},
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-timeline-callback error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
