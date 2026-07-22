/**
 * Componente BoardingHistoryPanel
 * Exibe e permite gerenciar o histórico de embarques profissionais
 */
import { useState, useEffect } from "react";
import { parseDateLocal } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Anchor, 
  Plus, 
  Ship, 
  Calendar, 
  MapPin, 
  Briefcase,
  ChevronDown,
  Edit2,
  Trash2,
  Building2,
  Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BoardingHistory {
  id: string;
  company_name: string;
  vessel_name: string | null;
  vessel_type: string | null;
  position: string;
  embarked_at: string;
  disembarked_at: string | null;
  is_internal: boolean;
  notes: string | null;
}

interface BoardingHistoryPanelProps {
  profileId?: string;
  isEditable?: boolean;
  compact?: boolean;
}

const VESSEL_TYPES = [
  "Plataforma",
  "FPSO",
  "Navio Tanque",
  "Navio de Carga",
  "Rebocador",
  "Supply Vessel",
  "PSV",
  "AHTS",
  "Drill Ship",
  "Lancha",
  "Balsa",
  "Outro"
];

export function BoardingHistoryPanel({ 
  profileId, 
  isEditable = false,
  compact = false 
}: BoardingHistoryPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<BoardingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BoardingHistory | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    vessel_name: "",
    vessel_type: "",
    position: "",
    embarked_at: "",
    disembarked_at: "",
    notes: "",
    is_internal: false
  });

  useEffect(() => {
    fetchHistory();
  }, [profileId, user]);

  const fetchHistory = async () => {
    try {
      let targetProfileId = profileId;

      if (!targetProfileId && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        targetProfileId = profile?.id;
      }

      if (!targetProfileId) return;

      const { data, error } = await supabase
        .from("professional_boarding_history")
        .select("*")
        .eq("profile_id", targetProfileId)
        .order("embarked_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching boarding history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      let targetProfileId = profileId;

      if (!targetProfileId && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        targetProfileId = profile?.id;
      }

      if (!targetProfileId) {
        throw new Error("Profile ID not found");
      }

      const payload = {
        profile_id: targetProfileId,
        company_name: formData.company_name,
        vessel_name: formData.vessel_name || null,
        vessel_type: formData.vessel_type || null,
        position: formData.position,
        embarked_at: formData.embarked_at,
        disembarked_at: formData.disembarked_at || null,
        notes: formData.notes || null,
        is_internal: formData.is_internal
      };

      if (editingRecord) {
        const { error } = await supabase
          .from("professional_boarding_history")
          .update(payload)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Registro atualizado com sucesso" });
      } else {
        const { error } = await supabase
          .from("professional_boarding_history")
          .insert(payload);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Embarque registrado com sucesso" });
      }

      setDialogOpen(false);
      setEditingRecord(null);
      resetForm();
      fetchHistory();
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao salvar registro",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (record: BoardingHistory) => {
    setEditingRecord(record);
    setFormData({
      company_name: record.company_name,
      vessel_name: record.vessel_name || "",
      vessel_type: record.vessel_type || "",
      position: record.position,
      embarked_at: record.embarked_at,
      disembarked_at: record.disembarked_at || "",
      notes: record.notes || "",
      is_internal: record.is_internal
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professional_boarding_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Registro removido com sucesso" });
      fetchHistory();
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      vessel_name: "",
      vessel_type: "",
      position: "",
      embarked_at: "",
      disembarked_at: "",
      notes: "",
      is_internal: false
    });
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const days = differenceInDays(endDate, startDate);
    
    if (days < 30) return `${days} dias`;
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return months > 0 ? `${months}m ${remainingDays}d` : `${remainingDays}d`;
  };

  const totalDays = history.reduce((acc, record) => {
    const start = new Date(record.embarked_at);
    const end = record.disembarked_at ? new Date(record.disembarked_at) : new Date();
    return acc + differenceInDays(end, start);
  }, 0);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <ScrollArea className={compact ? "h-[250px]" : "h-[400px]"}>
      <div className="space-y-3 pr-4">
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ship className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum histórico de embarque registrado</p>
            {isEditable && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Embarque
              </Button>
            )}
          </div>
        ) : (
          history.map((record, index) => (
            <div 
              key={record.id} 
              className={`relative p-4 rounded-lg border ${record.is_internal ? 'border-primary/30 bg-primary/5' : 'border-border'} hover:shadow-md transition-shadow`}
            >
              {/* Timeline connector */}
              {index < history.length - 1 && (
                <div className="absolute left-8 top-full w-0.5 h-3 bg-border" />
              )}

              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${record.is_internal ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {record.is_internal ? <Anchor className="h-5 w-5" /> : <Ship className="h-5 w-5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {record.position}
                        {record.is_internal && (
                          <Badge variant="outline" className="text-xs bg-primary/10">
                            Interno
                          </Badge>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {record.company_name}
                      </div>
                    </div>

                    {isEditable && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    {record.vessel_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Ship className="h-4 w-4" />
                        {record.vessel_name}
                        {record.vessel_type && <span className="text-xs">({record.vessel_type})</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(parseDateLocal(record.embarked_at), "MMM yyyy", { locale: ptBR })}
                      {" → "}
                      {record.disembarked_at 
                        ? format(parseDateLocal(record.disembarked_at), "MMM yyyy", { locale: ptBR })
                        : "Atual"
                      }
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {calculateDuration(record.embarked_at, record.disembarked_at)}
                    </div>
                  </div>

                  {record.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      "{record.notes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <>
      {compact ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Anchor className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Histórico de Embarques</CardTitle>
                    <Badge variant="secondary">{history.length}</Badge>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">{content}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Anchor className="h-5 w-5" />
                  Histórico de Embarques
                </CardTitle>
                <CardDescription>
                  {history.length} embarques • {totalDays} dias totais
                </CardDescription>
              </div>
              {isEditable && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setEditingRecord(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRecord ? "Editar Embarque" : "Novo Embarque"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingRecord 
                          ? "Atualize as informações do embarque" 
                          : "Registre uma nova experiência de embarque"
                        }
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company">Empresa *</Label>
                        <Input
                          id="company"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Nome da empresa"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="vessel">Embarcação</Label>
                          <Input
                            id="vessel"
                            value={formData.vessel_name}
                            onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                            placeholder="Nome da embarcação"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="vesselType">Tipo</Label>
                          <Select
                            value={formData.vessel_type}
                            onValueChange={(v) => setFormData({ ...formData, vessel_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {VESSEL_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="position">Função/Cargo *</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          placeholder="Ex: Marinheiro de Convés"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="embarked">Data Embarque *</Label>
                          <Input
                            id="embarked"
                            type="date"
                            value={formData.embarked_at}
                            onChange={(e) => setFormData({ ...formData, embarked_at: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="disembarked">Data Desembarque</Label>
                          <Input
                            id="disembarked"
                            type="date"
                            value={formData.disembarked_at}
                            onChange={(e) => setFormData({ ...formData, disembarked_at: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Detalhes adicionais sobre o embarque..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={!formData.company_name || !formData.position || !formData.embarked_at}
                      >
                        {editingRecord ? "Salvar Alterações" : "Registrar Embarque"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      )}
    </>
  );
}
