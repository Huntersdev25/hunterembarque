import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("JOB_APPLICATION_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { job_id, candidate_id } = body;

    if (!job_id || !candidate_id) {
      return new Response(
        JSON.stringify({ error: "job_id and candidate_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is the candidate
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user || user.id !== candidate_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch basic candidate + job data
    const [profileRes, jobRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, phone, desired_function")
        .eq("user_id", candidate_id)
        .maybeSingle(),
      supabase
        .from("jobs")
        .select("id, title, function_name, client_id, clients(company_name)")
        .eq("id", job_id)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const job: any = jobRes.data;

    const payload = {
      event: "candidate_applied_to_job",
      timestamp: new Date().toISOString(),
      candidate: {
        id: candidate_id,
        name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        desired_function: profile?.desired_function ?? null,
      },
      job: {
        id: job?.id ?? job_id,
        title: job?.title ?? null,
        function_name: job?.function_name ?? null,
        client_name: job?.clients?.company_name ?? null,
      },
    };

    const webhookResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({
        success: webhookResp.ok,
        status: webhookResp.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("notify-job-application error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
