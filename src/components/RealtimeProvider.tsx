import { useEffect, ReactNode, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeProviderProps {
  children: ReactNode;
}

type WatchEntry = { table: string; queryKeys: string[][] };

// Mapas por papel para limitar drasticamente o número de canais Realtime
// e o tráfego associado. Assinar ~30 tabelas para todo usuário causa
// gargalo de navegação e de memória.
const ADMIN_TABLES: WatchEntry[] = [
  { table: "client_candidates", queryKeys: [["client-approved-candidates"], ["workflow-professionals"], ["client-candidates"], ["client-dashboard"], ["client-dashboard-candidates"], ["client-stats"], ["boarding"]] },
  { table: "client_candidate_visibility", queryKeys: [["client-candidate-visibility"]] },
  { table: "client_candidate_documents", queryKeys: [["client-candidate-documents"]] },
  { table: "professional_requests", queryKeys: [["professional-requests"], ["client-requests"]] },
  { table: "applications", queryKeys: [["applications"], ["candidate-applications"], ["admin-stats"]] },
  { table: "jobs", queryKeys: [["jobs"], ["active-jobs"], ["admin-stats"], ["public-jobs"]] },
  { table: "profiles", queryKeys: [["profiles"], ["candidates"], ["admin-candidates"], ["admin-stats"], ["candidate-profile"]] },
  { table: "certifications", queryKeys: [["certifications"], ["candidate-certifications"]] },
  { table: "clients", queryKeys: [["clients"], ["admin-clients"], ["ti-clients"]] },
  { table: "company_users", queryKeys: [["company-users"]] },
  { table: "notifications", queryKeys: [["notifications"]] },
  { table: "boarding_companies", queryKeys: [["boarding-companies"], ["boarding"]] },
  { table: "boarding_units", queryKeys: [["boarding-units"], ["boarding"]] },
  { table: "boarding_employees", queryKeys: [["boarding-employees"], ["boarding"]] },
  { table: "tasks", queryKeys: [["tasks"]] },
];

const CLIENT_TABLES: WatchEntry[] = [
  { table: "client_candidates", queryKeys: [["client-approved-candidates"], ["client-candidates"], ["client-dashboard"], ["client-dashboard-candidates"], ["client-stats"], ["boarding"]] },
  { table: "client_candidate_visibility", queryKeys: [["client-candidate-visibility"]] },
  { table: "client_candidate_documents", queryKeys: [["client-candidate-documents"]] },
  { table: "professional_requests", queryKeys: [["professional-requests"], ["client-requests"]] },
  { table: "jobs", queryKeys: [["jobs"], ["active-jobs"], ["public-jobs"]] },
  { table: "notifications", queryKeys: [["notifications"]] },
];

const CANDIDATE_TABLES: WatchEntry[] = [
  { table: "applications", queryKeys: [["applications"], ["candidate-applications"]] },
  { table: "jobs", queryKeys: [["jobs"], ["active-jobs"], ["public-jobs"]] },
  { table: "profiles", queryKeys: [["candidate-profile"]] },
  { table: "certifications", queryKeys: [["candidate-certifications"]] },
  { table: "notifications", queryKeys: [["notifications"]] },
  { table: "certificate_alerts", queryKeys: [["certificate-alerts"]] },
];

const TI_TABLES: WatchEntry[] = [
  { table: "audit_logs", queryKeys: [["ti-recent-activities"], ["audit-logs"]] },
  { table: "profiles", queryKeys: [["profiles"]] },
  { table: "clients", queryKeys: [["ti-clients"]] },
  { table: "administrators", queryKeys: [["administrators"]] },
  { table: "notifications", queryKeys: [["notifications"]] },
];

/**
 * Provider global para sincronização em tempo real.
 * Inscreve apenas as tabelas relevantes ao papel do usuário,
 * reduzindo significativamente o overhead de WebSocket.
 */
export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const { userRole, user } = useAuth();

  const tablesToWatch = useMemo<WatchEntry[]>(() => {
    if (!user) return [];
    switch (userRole) {
      case "admin":
        return ADMIN_TABLES;
      case "client":
        return CLIENT_TABLES;
      case "candidate":
        return CANDIDATE_TABLES;
      case "ti":
        return TI_TABLES;
      default:
        return [];
    }
  }, [userRole, user]);

  useEffect(() => {
    if (tablesToWatch.length === 0) return;

    const channels: RealtimeChannel[] = [];

    tablesToWatch.forEach(({ table, queryKeys }) => {
      const channel = supabase
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
          },
          () => {
            queryKeys.forEach((queryKey) => {
              queryClient.invalidateQueries({ queryKey });
            });
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient, tablesToWatch]);

  return <>{children}</>;
}
