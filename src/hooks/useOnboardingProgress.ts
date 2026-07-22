/**
 * Hook de dados da Trilha de Cadastro.
 *
 * Carrega o perfil + certificações do candidato, expõe o estado da trilha
 * (onboarding_data / onboarding_step) e as funções de persistência usadas
 * por cada etapa. O autosave por etapa grava direto nas tabelas reais
 * (`profiles`, `certifications`), tornando o progresso naturalmente retomável.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type OnboardingData,
  type ProfileRow,
  type CertRow,
  getAllStepStatuses,
  computeReadiness,
  firstIncompleteStepIndex,
  isReadyToComplete,
} from "@/lib/onboarding";

interface UseOnboardingProgress {
  loading: boolean;
  saving: boolean;
  profile: ProfileRow;
  certs: CertRow;
  onboardingData: OnboardingData;
  reload: () => Promise<void>;
  saveProfilePatch: (patch: Record<string, any>) => Promise<boolean>;
  saveCertsPatch: (patch: Record<string, any>) => Promise<boolean>;
  saveOnboarding: (patch: { onboarding_step?: number; onboarding_data?: OnboardingData }) => Promise<boolean>;
  markCertsAnswered: (ids: string[]) => Promise<boolean>;
  completeOnboarding: () => Promise<boolean>;
  // derivados
  stepStatuses: ReturnType<typeof getAllStepStatuses>;
  readiness: number;
  firstIncompleteIndex: number;
  ready: boolean;
}

export function useOnboardingProgress(userId: string | undefined): UseOnboardingProgress {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow>(null);
  const [certs, setCerts] = useState<CertRow>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [{ data: profileData }, { data: certData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("certifications").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (!mounted.current) return;
      setProfile(profileData ?? null);
      setCerts(certData ?? null);
      const od = (profileData?.onboarding_data as OnboardingData) ?? {};
      setOnboardingData(od && typeof od === "object" ? od : {});
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveProfilePatch = useCallback(
    async (patch: Record<string, any>): Promise<boolean> => {
      if (!userId) return false;
      setSaving(true);
      try {
        const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
        if (error) throw error;
        if (mounted.current) setProfile((prev) => ({ ...(prev ?? {}), ...patch }));
        return true;
      } catch (err) {
        console.error("Erro ao salvar perfil (onboarding):", err);
        return false;
      } finally {
        if (mounted.current) setSaving(false);
      }
    },
    [userId],
  );

  const saveCertsPatch = useCallback(
    async (patch: Record<string, any>): Promise<boolean> => {
      if (!userId) return false;
      setSaving(true);
      try {
        const payload = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("certifications").upsert(payload, { onConflict: "user_id" });
        if (error) throw error;
        if (mounted.current) setCerts((prev) => ({ ...(prev ?? {}), ...patch }));
        return true;
      } catch (err) {
        console.error("Erro ao salvar certificações (onboarding):", err);
        return false;
      } finally {
        if (mounted.current) setSaving(false);
      }
    },
    [userId],
  );

  const saveOnboarding = useCallback(
    async (patch: { onboarding_step?: number; onboarding_data?: OnboardingData }): Promise<boolean> => {
      if (!userId) return false;
      const nextData = patch.onboarding_data ?? onboardingData;
      const update: Record<string, any> = {};
      if (patch.onboarding_step !== undefined) update.onboarding_step = patch.onboarding_step;
      if (patch.onboarding_data !== undefined) update.onboarding_data = patch.onboarding_data;
      if (Object.keys(update).length === 0) return true;

      try {
        const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
        if (error) throw error;
        if (mounted.current) {
          if (patch.onboarding_data !== undefined) setOnboardingData(nextData);
          setProfile((prev) => ({ ...(prev ?? {}), ...update }));
        }
        return true;
      } catch (err) {
        console.error("Erro ao salvar progresso da trilha:", err);
        return false;
      }
    },
    [userId, onboardingData],
  );

  const markCertsAnswered = useCallback(
    async (ids: string[]): Promise<boolean> => {
      const current = new Set(onboardingData.certs_answered ?? []);
      ids.forEach((id) => current.add(id));
      const nextData: OnboardingData = { ...onboardingData, certs_answered: Array.from(current) };
      return saveOnboarding({ onboarding_data: nextData });
    },
    [onboardingData, saveOnboarding],
  );

  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          profile_complete: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (error) throw error;
      if (mounted.current) {
        setProfile((prev) => ({ ...(prev ?? {}), profile_complete: true }));
      }
      return true;
    } catch (err) {
      console.error("Erro ao concluir a trilha:", err);
      return false;
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [userId]);

  const stepStatuses = useMemo(
    () => getAllStepStatuses(profile, certs, onboardingData),
    [profile, certs, onboardingData],
  );
  const readiness = useMemo(
    () => computeReadiness(profile, certs, onboardingData),
    [profile, certs, onboardingData],
  );
  const firstIncompleteIndex = useMemo(
    () => firstIncompleteStepIndex(profile, certs, onboardingData),
    [profile, certs, onboardingData],
  );
  const ready = useMemo(
    () => isReadyToComplete(profile, certs, onboardingData),
    [profile, certs, onboardingData],
  );

  return {
    loading,
    saving,
    profile,
    certs,
    onboardingData,
    reload,
    saveProfilePatch,
    saveCertsPatch,
    saveOnboarding,
    markCertsAnswered,
    completeOnboarding,
    stepStatuses,
    readiness,
    firstIncompleteIndex,
    ready,
  };
}
