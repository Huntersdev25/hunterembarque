import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Eye, EyeOff, Loader2, User, FileText, MapPin, Briefcase, Award, Paperclip, DollarSign, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface VisibilitySettings {
  id?: string;
  client_candidate_id: string;
  show_availability: boolean;
  show_salary_expectation: boolean;
  show_certifications: boolean;
  show_documents: boolean;
  show_personal_documents: boolean;
  show_address: boolean;
  show_professional_experience: boolean;
  show_contact_info: boolean;
}

interface VisibilityControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientCandidateId: string;
  candidateName: string;
  clientName: string;
  visibility: VisibilitySettings | null;
  onVisibilityChange?: () => void;
}

const VISIBILITY_CATEGORIES = [
  {
    title: "Informações Pessoais",
    icon: User,
    fields: [
      { key: 'show_contact_info', label: 'Contato', description: 'E-mail e telefone do candidato' },
      { key: 'show_personal_documents', label: 'Documentos Pessoais', description: 'CPF, RG e outros documentos' },
      { key: 'show_address', label: 'Endereço', description: 'Localização completa do candidato' },
    ]
  },
  {
    title: "Informações Profissionais",
    icon: Briefcase,
    fields: [
      { key: 'show_professional_experience', label: 'Experiência', description: 'Histórico de trabalho e experiências' },
      { key: 'show_availability', label: 'Disponibilidade', description: 'Período disponível para embarque' },
      { key: 'show_salary_expectation', label: 'Expectativa Salarial', description: 'Valor pretendido pelo candidato' },
    ]
  },
  {
    title: "Documentação",
    icon: FileText,
    fields: [
      { key: 'show_certifications', label: 'Certificações', description: 'Lista e validade das certificações' },
      { key: 'show_documents', label: 'Anexos', description: 'Arquivos enviados pelo candidato' },
    ]
  }
] as const;

type VisibilityFieldKey = 'show_contact_info' | 'show_personal_documents' | 'show_address' | 
  'show_professional_experience' | 'show_availability' | 'show_salary_expectation' | 
  'show_certifications' | 'show_documents';

export function VisibilityControlDrawer({
  isOpen,
  onClose,
  clientCandidateId,
  candidateName,
  clientName,
  visibility,
  onVisibilityChange
}: VisibilityControlDrawerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_candidate_visibility")
        .update({ 
          [field]: value,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq("client_candidate_id", clientCandidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-candidate-visibility"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-professionals"] });
      onVisibilityChange?.();
      toast.success("Visibilidade atualizada");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar visibilidade: " + error.message);
    },
  });

  const handleToggle = (field: string, currentValue: boolean) => {
    updateVisibilityMutation.mutate({ field, value: !currentValue });
  };

  const handleToggleAll = (enable: boolean) => {
    // Atualiza todos os campos de uma vez
    const updates: Record<string, boolean> = {};
    VISIBILITY_CATEGORIES.forEach(category => {
      category.fields.forEach(field => {
        updates[field.key] = enable;
      });
    });

    supabase
      .from("client_candidate_visibility")
      .update({ 
        ...updates,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq("client_candidate_id", clientCandidateId)
      .then(({ error }) => {
        if (error) {
          toast.error("Erro ao atualizar visibilidade");
        } else {
          queryClient.invalidateQueries({ queryKey: ["client-candidate-visibility"] });
          queryClient.invalidateQueries({ queryKey: ["workflow-professionals"] });
          onVisibilityChange?.();
          toast.success(enable ? "Todos os campos liberados" : "Todos os campos bloqueados");
        }
      });
  };

  // Conta quantos campos estão visíveis
  const totalFields = VISIBILITY_CATEGORIES.reduce((acc, cat) => acc + cat.fields.length, 0);
  const visibleCount = visibility 
    ? VISIBILITY_CATEGORIES.reduce((acc, cat) => 
        acc + cat.fields.filter(f => visibility[f.key as VisibilityFieldKey]).length, 0
      )
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Controle de Visibilidade
          </SheetTitle>
          <SheetDescription>
            Defina quais informações de <strong>{candidateName}</strong> serão visíveis para <strong>{clientName}</strong>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status resumo com ações rápidas */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {visibleCount > totalFields / 2 ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm font-medium">
                {visibleCount} de {totalFields} campos visíveis
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleToggleAll(false)}
                disabled={visibleCount === 0}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Bloquear Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleToggleAll(true)}
                disabled={visibleCount === totalFields}
              >
                <Eye className="h-3 w-3 mr-1" />
                Liberar Todos
              </Button>
            </div>
          </div>

          {/* Lista de campos por categoria */}
          {VISIBILITY_CATEGORIES.map((category, catIndex) => {
            const CategoryIcon = category.icon;
            const categoryVisibleCount = visibility 
              ? category.fields.filter(f => visibility[f.key as VisibilityFieldKey]).length
              : 0;

            return (
              <div key={category.title} className="space-y-3">
                {catIndex > 0 && <Separator />}
                
                <div className="flex items-center gap-2 pt-2">
                  <CategoryIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">{category.title}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {categoryVisibleCount}/{category.fields.length} visíveis
                  </span>
                </div>

                <div className="space-y-2">
                  {category.fields.map((field) => {
                    const isEnabled = visibility?.[field.key as VisibilityFieldKey] ?? false;
                    const isUpdating = updateVisibilityMutation.isPending;

                    return (
                      <div 
                        key={field.key} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isEnabled 
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                            : 'bg-muted/30 border-dashed'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor={field.key} className="font-medium cursor-pointer flex items-center gap-2">
                            {isEnabled ? (
                              <Eye className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {field.label}
                          </Label>
                          <p className="text-xs text-muted-foreground pl-5">
                            {field.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUpdating && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id={field.key}
                            checked={isEnabled}
                            onCheckedChange={() => handleToggle(field.key, isEnabled)}
                            disabled={isUpdating}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Nota informativa */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Nota:</strong> As alterações são aplicadas imediatamente. O cliente verá apenas as informações que você liberar.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
