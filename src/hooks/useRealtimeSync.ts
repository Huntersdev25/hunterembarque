import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeSyncOptions {
  table: string;
  queryKey: string[];
  filter?: {
    column: string;
    value: string;
  };
  enabled?: boolean;
}

/**
 * Hook para sincronização em tempo real de dados do Supabase
 * Invalida automaticamente as queries quando há alterações na tabela
 */
export function useRealtimeSync({
  table,
  queryKey,
  filter,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = filter 
      ? `realtime:${table}:${filter.column}:${filter.value}`
      : `realtime:${table}`;

    console.log(`🔄 Realtime: Subscribing to ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          console.log(`📡 Realtime update on ${table}:`, payload.eventType, payload);
          
          // Invalidar todas as queries relacionadas
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime: Connected to ${channelName}`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`❌ Realtime: Error on ${channelName}`, err);
          // Retry after 3 seconds
          setTimeout(() => {
            channel.subscribe();
          }, 3000);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Realtime: Unsubscribing from ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, queryKey, filter?.column, filter?.value, enabled, queryClient]);

  return null;
}
