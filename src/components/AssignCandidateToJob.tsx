import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface AssignCandidateToJobProps {
  candidateId: string;
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignCandidateToJob({ 
  candidateId, 
  candidateName, 
  isOpen, 
  onClose 
}: AssignCandidateToJobProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar vagas ativas
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, function_name')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  // Mutation para criar a candidatura
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) {
        throw new Error('Selecione uma vaga');
      }

      // Verificar se já existe candidatura
      const { data: existingApplication } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', candidateId)
        .eq('job_id', selectedJobId)
        .maybeSingle();

      if (existingApplication) {
        throw new Error('Este candidato já foi atribuído a esta vaga');
      }

      // Criar a candidatura
      const { error } = await supabase
        .from('applications')
        .insert({
          candidate_id: candidateId,
          job_id: selectedJobId,
          status: 'lista_espera'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: `${candidateName} foi atribuído à vaga com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setSelectedJobId("");
      setNotes("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atribuir Candidato a Vaga</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Candidato</Label>
            <div className="mt-1 p-2 bg-muted rounded-md">
              {candidateName}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job">Vaga *</Label>
            {loadingJobs ? (
              <div className="flex items-center gap-2 p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando vagas...</span>
              </div>
            ) : (
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma vaga" />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} {job.function_name && `- ${job.function_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre esta atribuição..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignMutation.isPending || !selectedJobId}>
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir à Vaga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
