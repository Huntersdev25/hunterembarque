import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText, Download, CalendarIcon, RefreshCw,
  CheckCircle2, Clock, Briefcase, Users, Building2,
  ListTodo, TrendingUp
} from "lucide-react";

interface DailyActivityLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: string;
  action_type: string;
  action_description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_title: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  task_created: { label: "Tarefa Criada", icon: ListTodo, color: "text-blue-500" },
  task_updated: { label: "Tarefa Atualizada", icon: ListTodo, color: "text-amber-500" },
  task_completed: { label: "Tarefa Concluída", icon: CheckCircle2, color: "text-emerald-500" },
  task_status_changed: { label: "Status Alterado", icon: Clock, color: "text-violet-500" },
  candidate_added: { label: "Candidato Adicionado", icon: Users, color: "text-blue-500" },
  job_created: { label: "Vaga Criada", icon: Briefcase, color: "text-emerald-500" },
  job_updated: { label: "Vaga Atualizada", icon: Briefcase, color: "text-amber-500" },
  client_added: { label: "Cliente Adicionado", icon: Building2, color: "text-violet-500" },
  application_received: { label: "Candidatura Recebida", icon: FileText, color: "text-blue-500" },
  report_generated: { label: "Relatório Gerado", icon: FileText, color: "text-emerald-500" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyActivityReport({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ["daily-activity-logs", dateStr],
    queryFn: async () => {
      const startOfDay = `${dateStr}T00:00:00.000Z`;
      const endOfDay = `${dateStr}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("daily_activity_logs")
        .select("*")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as DailyActivityLog[];
    },
    enabled: open,
  });

  const syncTodayTasks = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Get admin name
      const { data: adminData } = await supabase
        .from("administrators")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const userName = adminData?.full_name || "Admin";

      // Fetch today's tasks from the tasks table
      const todayStart = `${dateStr}T00:00:00.000Z`;
      const todayEnd = `${dateStr}T23:59:59.999Z`;

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      if (!tasks || tasks.length === 0) {
        toast.info("Nenhuma tarefa encontrada para hoje.");
        return;
      }

      // Check which tasks are already logged
      const { data: existingLogs } = await supabase
        .from("daily_activity_logs")
        .select("entity_id")
        .eq("entity_type", "task")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      const loggedIds = new Set((existingLogs || []).map((l) => l.entity_id));

      const newLogs = tasks
        .filter((t) => !loggedIds.has(t.id))
        .map((task) => {
          const isCompleted = (task.status_name || "").toUpperCase() === "CONCLUÍDO";
          return {
            user_id: user.id,
            user_name: userName,
            user_role: "admin",
            action_type: isCompleted ? "task_completed" : "task_created",
            action_description: isCompleted
              ? `Tarefa "${task.title}" concluída`
              : `Tarefa "${task.title}" criada com status "${task.status_name}"`,
            entity_type: "task",
            entity_id: task.id,
            entity_title: task.title,
            metadata: {
              status: task.status_name,
              priority: task.priority,
              assigned_to: task.assigned_to,
            },
          };
        });

      if (newLogs.length === 0) {
        toast.info("Todas as tarefas já estão registradas.");
        return;
      }

      const { error } = await supabase.from("daily_activity_logs").insert(newLogs);
      if (error) throw error;

      toast.success(`${newLogs.length} atividade(s) sincronizada(s)`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-activity-logs", dateStr] });
    },
    onError: (err) => {
      toast.error("Erro ao sincronizar: " + (err as Error).message);
    },
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const formattedDate = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    // Header
    doc.setFillColor(15, 76, 129); // maritime-blue
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Relatório Executivo Diário", 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${formattedDate}`, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 36);

    // Summary section
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text("Resumo das Atividades", 14, 52);

    const summary = activities.reduce((acc, a) => {
      acc[a.action_type] = (acc[a.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summaryRows = Object.entries(summary).map(([type, count]) => [
      ACTION_TYPE_LABELS[type]?.label || type,
      String(count),
    ]);

    summaryRows.push(["Total de Atividades", String(activities.length)]);

    autoTable(doc, {
      startY: 56,
      head: [["Tipo de Atividade", "Quantidade"]],
      body: summaryRows,
      theme: "striped",
      headStyles: { fillColor: [15, 76, 129] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    // Detail table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.text("Detalhamento", 14, finalY + 12);

    const detailRows = activities.map((a) => [
      format(new Date(a.created_at), "HH:mm"),
      ACTION_TYPE_LABELS[a.action_type]?.label || a.action_type,
      a.action_description,
      a.user_name || "—",
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Hora", "Tipo", "Descrição", "Usuário"]],
      body: detailRows,
      theme: "striped",
      headStyles: { fillColor: [15, 76, 129] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 100 },
        3: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Hunters Embarque - Relatório Executivo | Página ${i} de ${pageCount}`,
        105,
        290,
        { align: "center" }
      );
    }

    doc.save(`relatorio-executivo-${dateStr}.pdf`);

    // Log report generation
    if (user) {
      supabase.from("daily_activity_logs").insert({
        user_id: user.id,
        user_name: "Admin",
        user_role: "admin",
        action_type: "report_generated",
        action_description: `Relatório executivo gerado para ${formattedDate}`,
        entity_type: "report",
        metadata: { date: dateStr, total_activities: activities.length },
      });
    }

    toast.success("Relatório PDF gerado com sucesso!");
  };

  const groupedByType = activities.reduce((acc, a) => {
    const type = a.action_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(a);
    return acc;
  }, {} as Record<string, DailyActivityLog[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-maritime-blue" />
            Relatório Executivo Diário
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncTodayTasks.mutate()}
            disabled={syncTodayTasks.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncTodayTasks.isPending ? "animate-spin" : ""}`} />
            Sincronizar Tarefas
          </Button>

          <Button
            size="sm"
            onClick={generatePDF}
            disabled={activities.length === 0}
            className="gap-2 bg-maritime-blue hover:bg-maritime-blue/90 ml-auto"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activities.length}</p>
            <p className="text-xs text-muted-foreground">Atividades</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {activities.filter((a) => a.action_type === "task_completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {Object.keys(groupedByType).length}
            </p>
            <p className="text-xs text-muted-foreground">Tipos</p>
          </div>
        </div>

        <ScrollArea className="max-h-[400px] pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maritime-blue" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma atividade registrada para esta data.</p>
              <p className="text-xs mt-1">Clique em "Sincronizar Tarefas" para importar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByType).map(([type, logs]) => {
                const config = ACTION_TYPE_LABELS[type] || {
                  label: type,
                  icon: FileText,
                  color: "text-muted-foreground",
                };
                const Icon = config.icon;

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-semibold">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                        >
                          <span className="text-foreground truncate max-w-[350px]">
                            {log.action_description}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(log.created_at), "HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
