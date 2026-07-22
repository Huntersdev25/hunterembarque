import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

interface CertificationField {
  key: string;
  name: string;
  validityField: string;
}

const CERTIFICATION_FIELDS: CertificationField[] = [
  { key: "cir", name: "CIR – Carteira de Inscrição e Registro", validityField: "cir_validity" },
  { key: "stcw", name: "STCW", validityField: "stcw_validity" },
  { key: "caaq", name: "CAAQ", validityField: "caaq_validity" },
  { key: "tbs1", name: "TBS1", validityField: "tbs1_validity" },
  { key: "espe", name: "ESPE", validityField: "espe_validity" },
  { key: "esrs", name: "ESRS", validityField: "esrs_validity" },
  { key: "ebps", name: "EBPS", validityField: "ebps_validity" },
  { key: "ecin", name: "ECIN", validityField: "ecin_validity" },
  { key: "ecia_caci", name: "ECIA/CACI", validityField: "ecia_caci_validity" },
  { key: "eopn", name: "EOPN", validityField: "eopn_validity" },
  { key: "ebcp", name: "EBCP", validityField: "ebcp_validity" },
  { key: "epsm", name: "EPSM", validityField: "epsm_validity" },
  { key: "thuet", name: "THUET", validityField: "thuet_validity" },
  { key: "cbsp", name: "CBSP", validityField: "cbsp_validity" },
  { key: "cess", name: "CESS", validityField: "cess_validity" },
  { key: "cerr", name: "CERR", validityField: "cerr_validity" },
  { key: "efnt", name: "EFNT", validityField: "efnt_validity" },
  { key: "ebpq", name: "EBPQ", validityField: "ebpq_validity" },
  { key: "ebgl", name: "EBGL", validityField: "ebgl_validity" },
  { key: "esop", name: "ESOP", validityField: "esop_validity" },
  { key: "dp", name: "Dynamic Positioning", validityField: "dp_validity" },
  { key: "alph", name: "ALPH", validityField: "alph_validity" },
  { key: "cns014", name: "CNS 14", validityField: "cns014_validity" },
  { key: "gmdss", name: "GMDSS", validityField: "gmdss_validity" },
  { key: "cft", name: "CFT", validityField: "cft_validity" },
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: user.id });

    if (!isAdmin && !isTI) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin or TI access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🔒 Certificate alert check triggered by ${user.email} (${isAdmin ? 'admin' : 'ti'})`);

    const { data: certifications, error: certError } = await supabase
      .from("certifications").select("*, profiles!inner(id, full_name, email)");
    if (certError) throw certError;

    const today = new Date();
    const alerts: { profileId: string; certKey: string; certName: string; validityDate: string; alertType: string; daysUntilExpiry: number; }[] = [];

    for (const cert of certifications || []) {
      const profileId = cert.profiles?.id;
      if (!profileId) continue;
      for (const field of CERTIFICATION_FIELDS) {
        const hasCert = cert[field.key] === true;
        const validityDate = cert[field.validityField];
        const isIndeterminate = cert[`${field.key}_indeterminate`] === true;
        if (hasCert && validityDate && !isIndeterminate) {
          const validity = new Date(validityDate);
          const daysUntilExpiry = Math.floor((validity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          let alertType: string | null = null;
          if (daysUntilExpiry < 0) alertType = "expired";
          else if (daysUntilExpiry <= 7) alertType = "expiring_7";
          else if (daysUntilExpiry <= 15) alertType = "expiring_15";
          else if (daysUntilExpiry <= 30) alertType = "expiring_30";
          if (alertType) alerts.push({ profileId, certKey: field.key, certName: field.name, validityDate, alertType, daysUntilExpiry });
        }
      }
    }

    let createdAlerts = 0;
    let updatedAlerts = 0;

    for (const alert of alerts) {
      const { data: existingAlert } = await supabase
        .from("certificate_alerts").select("id, alert_type, is_read")
        .eq("profile_id", alert.profileId).eq("certification_key", alert.certKey).single();

      if (existingAlert) {
        if (existingAlert.alert_type !== alert.alertType) {
          await supabase.from("certificate_alerts")
            .update({ alert_type: alert.alertType, validity_date: alert.validityDate, is_read: false })
            .eq("id", existingAlert.id);
          updatedAlerts++;
        }
      } else {
        const { error: insertError } = await supabase.from("certificate_alerts").insert({
          profile_id: alert.profileId, certification_key: alert.certKey,
          certification_name: alert.certName, validity_date: alert.validityDate,
          alert_type: alert.alertType, is_read: false,
        });
        if (!insertError) {
          createdAlerts++;
          const notificationTitle = alert.alertType === "expired"
            ? `Certificado ${alert.certName} vencido!`
            : `Certificado ${alert.certName} vence em ${alert.daysUntilExpiry} dias`;
          const notificationMessage = alert.alertType === "expired"
            ? `Seu certificado ${alert.certName} está vencido desde ${new Date(alert.validityDate).toLocaleDateString('pt-BR')}. Renove o mais rápido possível.`
            : `Seu certificado ${alert.certName} vence em ${new Date(alert.validityDate).toLocaleDateString('pt-BR')}. Providencie a renovação.`;
          await supabase.from("notifications").insert({
            user_id: alert.profileId, title: notificationTitle, message: notificationMessage,
            type: "certificate_alert", reference_id: null, reference_type: "certification",
            is_read: false, email_sent: false,
          });
        }
      }
    }

    const { data: allAlerts } = await supabase.from("certificate_alerts").select("id, profile_id, certification_key");
    for (const existingAlert of allAlerts || []) {
      const stillRelevant = alerts.some(a => a.profileId === existingAlert.profile_id && a.certKey === existingAlert.certification_key);
      if (!stillRelevant) await supabase.from("certificate_alerts").delete().eq("id", existingAlert.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalAlertsFound: alerts.length, created: createdAlerts, updated: updatedAlerts,
          breakdown: {
            expired: alerts.filter(a => a.alertType === "expired").length,
            expiring7Days: alerts.filter(a => a.alertType === "expiring_7").length,
            expiring15Days: alerts.filter(a => a.alertType === "expiring_15").length,
            expiring30Days: alerts.filter(a => a.alertType === "expiring_30").length,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking certificate alerts:", error);
    const ch = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...ch, "Content-Type": "application/json" } }
    );
  }
});
