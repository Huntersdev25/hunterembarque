import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, ChevronDown, ChevronRight, MoreHorizontal, Calendar,
  Flag, User, Search, Trash2, X, Circle, Clock, Bell,
  MessageSquare, ListChecks, CheckCircle2, ListTodo, LayoutGrid,
  Edit2, Tag, Users, Palette, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, parseDateLocal } from "@/lib/utils";

type TaskPriority = "urgente" | "alta" | "normal" | "baixa";
type ViewMode = "list" | "board";

interface TaskComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface SubTask {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status_name: string;
  status_color: string;
  priority: TaskPriority;
  assigned_to: string[];
  created_by: string;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  reminder_at: string | null;
  tags: string[];
  estimate_minutes: number | null;
  time_spent_minutes: number | null;
  client_id: string | null;
  project: string | null;
  comments: TaskComment[];
  subtasks: SubTask[];
}
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; flagColor: string }> = {
  urgente: { label: "Urgente", color: "text-red-600", flagColor: "text-red-500" },
  alta: { label: "Alta", color: "text-orange-600", flagColor: "text-orange-500" },
  normal: { label: "Normal", color: "text-blue-600", flagColor: "text-blue-500" },
  baixa: { label: "Baixa", color: "text-muted-foreground", flagColor: "text-muted-foreground" },
};

const INITIAL_STATUSES = [
  { name: "A FAZER", color: "#6b7280" },
  { name: "EM ANDAMENTO", color: "#3b82f6" },
  { name: "REVISÃO", color: "#f59e0b" },
  { name: "CONCLUÍDO", color: "#22c55e" },
];

function loadStatuses() {
  try {
    const saved = localStorage.getItem("task_statuses_config");
    if (saved) return JSON.parse(saved) as { name: string; color: string }[];
  } catch {}
  return INITIAL_STATUSES;
}

function saveStatuses(statuses: { name: string; color: string }[]) {
  localStorage.setItem("task_statuses_config", JSON.stringify(statuses));
}

const TAG_COLORS: Record<string, string> = {};
const TAG_COLOR_PALETTE = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
function getTagColor(tag: string): string {
  if (!TAG_COLORS[tag]) {
    const idx = Object.keys(TAG_COLORS).length % TAG_COLOR_PALETTE.length;
    TAG_COLORS[tag] = TAG_COLOR_PALETTE[idx];
  }
  return TAG_COLORS[tag];
}

export default function AdminTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [statuses, setStatuses] = useState(loadStatuses);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [editingStatuses, setEditingStatuses] = useState<{ name: string; color: string }[]>([]);

  // Drag-and-drop state for board view
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Task detail
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  // New Task Dialog
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    status_name: "A FAZER",
    status_color: "#6b7280",
    priority: "normal" as TaskPriority,
    assigned_to: [] as string[],
    due_date: "",
    start_date: "",
    tags: [] as string[],
    estimate_minutes: "",
    time_spent_minutes: "",
    client_id: "",
    project: "",
    reminder_minutes: "",
  });
  const [newTagInput, setNewTagInput] = useState("");
  const [detailTagInput, setDetailTagInput] = useState("");

  // Fetch admins
  const { data: admins = [] } = useQuery({
    queryKey: ["admin-users-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("administrators").select("user_id, full_name, email, cargo");
      return data || [];
    },
  });

  // Fetch all users (profiles) for task assignment
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
      return data || [];
    },
  });

  // Current user's cargo
  const currentUserCargo = admins.find(a => a.user_id === user?.id)?.cargo;
  const canAssignToOthers = currentUserCargo === 'Diretor' || currentUserCargo === 'Coordenador de Operações' || currentUserCargo === 'Supervisor';
  const canDeleteTasks = canAssignToOthers;

  // Fetch clients
  const { data: clientsList = [] } = useQuery({
    queryKey: ["clients-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name");
      return data || [];
    },
  });

  // Fetch ALL tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, status_name, status_color, priority, assigned_to, created_by, due_date, start_date, completed_at, sort_order, created_at, reminder_at, tags, estimate_minutes, time_spent_minutes, client_id, project, comments, subtasks")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        comments: Array.isArray(t.comments) ? t.comments : [],
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      })) as Task[];
    },
  });

  // Comments and subtasks are now embedded in the task object
  const taskComments: TaskComment[] = selectedTask?.comments || [];
  const subtasks: SubTask[] = selectedTask?.subtasks || [];

  // Check for task reminders
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date().toISOString();
      const { data: dueTasks } = await supabase
        .from("tasks")
        .select("id, title, reminder_at")
        .not("reminder_at", "is", null)
        .lte("reminder_at", now)
        .is("completed_at", null);
      if (dueTasks && dueTasks.length > 0) {
        dueTasks.forEach((task: any) => {
          toast.warning(`⏰ Lembrete: "${task.title}"`, { duration: 10000 });
          supabase.from("tasks").update({ reminder_at: null } as any).eq("id", task.id).then(() => {
            queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
          });
        });
      }
    };
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // === HELPERS: Date sanitization ===
  /** Converts pt-BR "dd/MM/yyyy" or "dd/MM/yy" to "yyyy-MM-dd"; passes through ISO dates unchanged */
  const sanitizeDate = (value: string | null | undefined): string | null => {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    // pt-BR dd/MM/yyyy or dd/MM/yy
    const ptBRMatch = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (ptBRMatch) {
      const day = ptBRMatch[1].padStart(2, "0");
      const month = ptBRMatch[2].padStart(2, "0");
      let year = ptBRMatch[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
    return null; // invalid → drop
  };

  // === MUTATIONS ===

  const createTask = useMutation({
    mutationFn: async (data: typeof newTaskData) => {
      const reminder_at = data.reminder_minutes ? new Date(Date.now() + parseInt(data.reminder_minutes) * 60 * 1000).toISOString() : null;
      // Non-privileged users auto-assign to themselves
      const finalAssignedTo = canAssignToOthers ? data.assigned_to : [user!.id];
      const { error } = await supabase.from("tasks").insert({
        title: data.title,
        description: data.description || null,
        status_name: data.status_name,
        status_color: data.status_color,
        priority: data.priority,
        assigned_to: finalAssignedTo.filter(id => typeof id === "string" && id.length > 10),
        due_date: sanitizeDate(data.due_date),
        start_date: sanitizeDate(data.start_date),
        tags: (data.tags || []).filter(t => typeof t === "string"),
        estimate_minutes: data.estimate_minutes ? parseInt(data.estimate_minutes) : null,
        time_spent_minutes: data.time_spent_minutes ? parseInt(data.time_spent_minutes) : 0,
        client_id: data.client_id || null,
        project: data.project || null,
        reminder_at,
        created_by: user!.id,
        sort_order: tasks.length,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      resetNewTaskData();
      setShowNewTaskDialog(false);
      toast.success("Tarefa criada!");

      // Log activity
      supabase.from("daily_activity_logs").insert({
        user_id: user!.id,
        user_name: getAdminName(user!.id) || user?.email,
        user_role: "admin",
        action_type: "task_created",
        action_description: `Tarefa "${data.title}" criada com prioridade ${PRIORITY_CONFIG[data.priority]?.label || "Normal"}`,
        entity_type: "task",
        entity_title: data.title,
        metadata: { priority: data.priority, status: data.status_name },
      }).then(() => {});


      // Webhook
      const assignedNames = data.assigned_to.map(id => getAdminName(id) || "Desconhecido").join(", ") || "Não atribuído";
      const createdByName = getAdminName(user?.id || null) || user?.email || "Desconhecido";
      supabase.functions.invoke("notify-webhook", {
        body: {
          type: "task_created",
          data: {
            task_title: data.title,
            created_by: createdByName,
            created_by_id: user?.id || null,
            assigned_to: assignedNames,
            assigned_to_ids: data.assigned_to,
            start_date: data.start_date || "Sem data",
            due_date: data.due_date || "Sem data",
            priority: PRIORITY_CONFIG[data.priority]?.label || "Normal",
          },
        },
      }).catch(err => console.error("Webhook error:", err));
    },
    onError: (error: any) => {
      toast.error("Erro ao criar tarefa: " + (error?.message || "Erro desconhecido"));
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      // Sanitize date fields before sending to DB
      const sanitized = { ...updates } as any;
      if ("due_date" in sanitized) sanitized.due_date = sanitizeDate(sanitized.due_date);
      if ("start_date" in sanitized) sanitized.start_date = sanitizeDate(sanitized.start_date);
      if ("tags" in sanitized) sanitized.tags = (sanitized.tags || []).filter((t: any) => typeof t === "string");
      if ("assigned_to" in sanitized) sanitized.assigned_to = (sanitized.assigned_to || []).filter((id: any) => typeof id === "string" && id.length > 10);
      const { error } = await supabase.from("tasks").update(sanitized).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      if (selectedTask && selectedTask.id === variables.id) {
        setSelectedTask(prev => prev ? { ...prev, ...variables } : null);
      }

      // Log activity
      const isCompleted = variables.status_name?.toUpperCase() === "CONCLUÍDO";
      const actionType = isCompleted ? "task_completed" : variables.status_name ? "task_status_changed" : "task_updated";
      const desc = isCompleted
        ? `Tarefa concluída`
        : variables.status_name
        ? `Status alterado para "${variables.status_name}"`
        : "Tarefa atualizada";
      supabase.from("daily_activity_logs").insert({
        user_id: user!.id,
        user_name: getAdminName(user!.id) || user?.email,
        user_role: "admin",
        action_type: actionType,
        action_description: desc,
        entity_type: "task",
        entity_id: variables.id,
        entity_title: selectedTask?.title || variables.title || "",
        metadata: { changes: Object.keys(variables).filter(k => k !== "id") },
      }).then(() => {});
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      setShowTaskDetail(false);
      setSelectedTask(null);
      toast.success("Tarefa excluída!");
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!selectedTask || !newComment.trim()) return;
      const newCommentObj: TaskComment = {
        id: crypto.randomUUID(),
        user_id: user!.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      };
      const updatedComments = [...(selectedTask.comments || []), newCommentObj];
      const { error } = await supabase.from("tasks").update({ comments: updatedComments } as any).eq("id", selectedTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      setNewComment("");
    },
  });

  const addSubtask = useMutation({
    mutationFn: async () => {
      if (!selectedTask || !newSubtask.trim()) return;
      const newSubObj: SubTask = {
        id: crypto.randomUUID(),
        title: newSubtask.trim(),
        is_completed: false,
        sort_order: (selectedTask.subtasks || []).length,
      };
      const updatedSubtasks = [...(selectedTask.subtasks || []), newSubObj];
      const { error } = await supabase.from("tasks").update({ subtasks: updatedSubtasks } as any).eq("id", selectedTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      setNewSubtask("");
    },
  });

  const toggleSubtask = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      if (!selectedTask) return;
      const updatedSubtasks = (selectedTask.subtasks || []).map(s =>
        s.id === id ? { ...s, is_completed } : s
      );
      const { error } = await supabase.from("tasks").update({ subtasks: updatedSubtasks } as any).eq("id", selectedTask.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-all"] }),
  });

  // === HELPERS ===

  const resetNewTaskData = () => {
    setNewTaskData({ title: "", description: "", status_name: "A FAZER", status_color: "#6b7280", priority: "normal", assigned_to: [], due_date: "", start_date: "", tags: [], estimate_minutes: "", time_spent_minutes: "", client_id: "", project: "", reminder_minutes: "" });
    setNewTagInput("");
  };

  const getAdminName = (userId: string | null) => {
    if (!userId) return null;
    const admin = admins.find(a => a.user_id === userId);
    if (admin) return admin.full_name;
    const profile = allUsers.find(u => u.user_id === userId);
    if (profile) return profile.full_name;
    return "Desconhecido";
  };

  const getAdminInitials = (userId: string | null) => {
    const name = getAdminName(userId);
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterTag && !(t.tags || []).includes(filterTag)) return false;
    return true;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || [])));

  // Group tasks by tag
  const tasksByTag: Record<string, Task[]> = {};
  const untaggedTasks: Task[] = [];
  filteredTasks.forEach(t => {
    if (!t.tags || t.tags.length === 0) {
      untaggedTasks.push(t);
    } else {
      t.tags.forEach(tag => {
        if (!tasksByTag[tag]) tasksByTag[tag] = [];
        // Avoid duplicates if task has multiple tags
        if (!tasksByTag[tag].find(existing => existing.id === t.id)) {
          tasksByTag[tag].push(t);
        }
      });
    }
  });

  // Group tasks by status for board view
  const tasksByStatus: Record<string, Task[]> = {};
  statuses.forEach(s => { tasksByStatus[s.name] = []; });
  filteredTasks.forEach(t => {
    const statusName = t.status_name || "A FAZER";
    if (!tasksByStatus[statusName]) tasksByStatus[statusName] = [];
    tasksByStatus[statusName].push(t);
  });

  const toggleAssignee = (userId: string, currentList: string[]) => {
    if (currentList.includes(userId)) {
      return currentList.filter(id => id !== userId);
    }
    return [...currentList, userId];
  };

  // === RENDER: Task Row ===
  const renderTaskRow = (task: Task) => {
    const pConfig = PRIORITY_CONFIG[task.priority || "normal"];
    return (
      <div
        key={task.id}
        className="grid grid-cols-[1fr_120px_140px_140px_100px] gap-2 items-center px-6 py-2.5 rounded-md hover:bg-accent/60 cursor-pointer transition-colors group/task border-b border-border/30"
        onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: task.status_color || "#6b7280" }} />
          <span className="text-sm truncate text-foreground font-medium">{task.title}</span>
          {(task.tags || []).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0" style={{ backgroundColor: `${getTagColor(tag)}15`, color: getTagColor(tag), borderColor: `${getTagColor(tag)}30` }}>
              {tag}
            </Badge>
          ))}
        </div>
        <div>
          <Badge className="text-[10px] font-semibold border px-2 py-0.5" style={{ backgroundColor: `${task.status_color || "#6b7280"}15`, color: task.status_color || "#6b7280", borderColor: `${task.status_color || "#6b7280"}30` }}>
            {task.status_name || "A FAZER"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {(task.assigned_to || []).length > 0 ? (
            (task.assigned_to || []).slice(0, 3).map(uid => (
              <Avatar key={uid} className="h-6 w-6 -ml-1 first:ml-0 ring-2 ring-background">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                  {getAdminInitials(uid)}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {(task.assigned_to || []).length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1">+{(task.assigned_to || []).length - 3}</span>
          )}
        </div>
        <div>
          {task.due_date ? (
            <span className={cn("text-xs font-medium", parseDateLocal(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground")}>
              {format(parseDateLocal(task.due_date), "dd/MM/yy", { locale: ptBR })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Flag className={cn("h-3.5 w-3.5", pConfig.flagColor)} />
          <span className={cn("text-xs font-medium", pConfig.color)}>{pConfig.label}</span>
        </div>
      </div>
    );
  };

  // === RENDER: List View (grouped by status) ===
  const renderListView = () => (
    <div className="p-6 space-y-1">
      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_140px_140px_100px] gap-2 px-6 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-2">
        <span>Nome</span>
        <span>Responsáveis</span>
        <span>Data de vencimento</span>
        <span>Prioridade</span>
      </div>

      {/* Groups by status */}
      {statuses.map(status => {
        const statusTasks = (tasksByStatus[status.name] || []);
        const isCollapsed = collapsedStatuses.has(status.name);
        return (
          <div key={status.name} className="mb-1">
            <button
              className="flex items-center gap-2 py-2 w-full"
              onClick={() => setCollapsedStatuses(prev => {
                const next = new Set(prev);
                next.has(status.name) ? next.delete(status.name) : next.add(status.name);
                return next;
              })}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              <Badge className="text-[10px] font-bold tracking-wider border px-2.5 py-0.5" style={{ backgroundColor: `${status.color}15`, color: status.color, borderColor: `${status.color}30` }}>
                <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: status.color }} />
                {status.name}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">{statusTasks.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-px">
                {statusTasks.map(task => {
                  const pConfig = PRIORITY_CONFIG[task.priority || "normal"];
                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-[1fr_140px_140px_100px] gap-2 items-center px-6 py-2.5 rounded-md hover:bg-accent/60 cursor-pointer transition-colors border-b border-border/30"
                      onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={task.status_name === "CONCLUÍDO"}
                          onCheckedChange={(checked) => {
                            const targetStatus = checked ? statuses.find(s => s.name === "CONCLUÍDO") || statuses[statuses.length - 1] : statuses[0];
                            updateTask.mutate({ id: task.id, status_name: targetStatus.name, status_color: targetStatus.color, completed_at: checked ? new Date().toISOString() : null } as any);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className={cn("text-sm truncate font-medium", task.status_name === "CONCLUÍDO" ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</span>
                        {(task.tags || []).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0" style={{ backgroundColor: `${getTagColor(tag)}15`, color: getTagColor(tag), borderColor: `${getTagColor(tag)}30` }}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        {(task.assigned_to || []).length > 0 ? (
                          (task.assigned_to || []).slice(0, 3).map(uid => (
                            <Avatar key={uid} className="h-6 w-6 -ml-1 first:ml-0 ring-2 ring-background">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">{getAdminInitials(uid)}</AvatarFallback>
                            </Avatar>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {(task.assigned_to || []).length > 3 && <span className="text-[10px] text-muted-foreground ml-1">+{(task.assigned_to || []).length - 3}</span>}
                      </div>
                      <div>
                        {task.due_date ? (
                          <span className={cn("text-xs font-medium", parseDateLocal(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground")}>
                            {format(parseDateLocal(task.due_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Flag className={cn("h-3.5 w-3.5", pConfig.flagColor)} />
                        <span className={cn("text-xs font-medium", pConfig.color)}>{pConfig.label}</span>
                      </div>
                    </div>
                  );
                })}
                {statusTasks.length === 0 && (
                  <div className="px-6 py-3 text-xs text-muted-foreground/50 italic">Nenhuma tarefa</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ListTodo className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">Nenhuma tarefa encontrada</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowNewTaskDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Tarefa
          </Button>
        </div>
      )}
    </div>
  );

  // === RENDER: Board View (grouped by status) with drag-and-drop ===
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string, targetColor: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;
    setDraggedTaskId(null);
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status_name !== targetStatus) {
      updateTask.mutate({
        id: taskId,
        status_name: targetStatus,
        status_color: targetColor,
        ...(targetStatus === "CONCLUÍDO" ? { completed_at: new Date().toISOString() } : { completed_at: null }),
      } as any);
      toast.success(`Tarefa movida para ${targetStatus}`);
    }
  };

  const renderBoardView = () => (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {statuses.map(status => {
        const statusTasks = tasksByStatus[status.name] || [];
        return (
          <div
            key={status.name}
            className="flex flex-col w-72 min-w-[288px] shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.name, status.color)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] font-bold tracking-wider border px-2.5 py-0.5" style={{ backgroundColor: `${status.color}15`, color: status.color, borderColor: `${status.color}30` }}>
                  <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: status.color }} />
                  {status.name}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">{statusTasks.length}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setNewTaskData(prev => ({ ...prev, status_name: status.name, status_color: status.color })); setShowNewTaskDialog(true); }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pb-4 min-h-[100px] rounded-lg transition-colors"
              style={{ backgroundColor: draggedTaskId ? `${status.color}08` : undefined }}
            >
              {statusTasks.map(task => {
                const pConfig = PRIORITY_CONFIG[task.priority || "normal"];
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    className={cn(
                      "bg-card border border-border rounded-lg p-3 cursor-grab hover:shadow-md transition-all active:cursor-grabbing",
                      draggedTaskId === task.id && "opacity-40 ring-2 ring-primary"
                    )}
                    onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                  >
                    <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>
                    <div className="flex items-center gap-1 flex-wrap mb-2">
                      {(task.tags || []).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1" style={{ backgroundColor: `${getTagColor(tag)}15`, color: getTagColor(tag) }}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(task.assigned_to || []).slice(0, 2).map(uid => (
                        <Avatar key={uid} className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{getAdminInitials(uid)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {task.due_date && (
                        <span className={cn("text-[10px] font-medium flex items-center gap-1", parseDateLocal(task.due_date) < new Date() ? "text-destructive" : "text-muted-foreground")}>
                          <Calendar className="h-3 w-3" />
                          {format(parseDateLocal(task.due_date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-auto">
                        <Flag className={cn("h-3 w-3", pConfig.flagColor)} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors" onClick={() => { setNewTaskData(prev => ({ ...prev, status_name: status.name, status_color: status.color })); setShowNewTaskDialog(true); }}>
                <Plus className="h-3 w-3" /> Adicionar Tarefa
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // === RENDER: Assignee Multi-Select ===
  const renderAssigneeMultiSelect = (selectedIds: string[], onChange: (ids: string[]) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors px-1 min-h-[28px]">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-1">
              {selectedIds.slice(0, 2).map(uid => (
                <Avatar key={uid} className="h-5 w-5">
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{getAdminInitials(uid)}</AvatarFallback>
                </Avatar>
              ))}
              {selectedIds.length > 2 && <span className="text-xs text-muted-foreground">+{selectedIds.length - 2}</span>}
            </div>
          ) : (
            <span className="text-muted-foreground/60">Selecionar</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="max-h-60">
          {admins.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Equipe Admin</p>
              <div className="space-y-0.5">
                {admins.map(a => (
                  <button
                    key={a.user_id}
                    className={cn("flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors", selectedIds.includes(a.user_id) && "bg-accent")}
                    onClick={() => onChange(toggleAssignee(a.user_id, selectedIds))}
                  >
                    <Checkbox checked={selectedIds.includes(a.user_id)} className="h-3.5 w-3.5" />
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{a.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{a.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {allUsers.filter(u => !admins.some(a => a.user_id === u.user_id)).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Outros Usuários</p>
              <div className="space-y-0.5">
                {allUsers.filter(u => !admins.some(a => a.user_id === u.user_id)).map(u => (
                  <button
                    key={u.user_id}
                    className={cn("flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors", selectedIds.includes(u.user_id) && "bg-accent")}
                    onClick={() => onChange(toggleAssignee(u.user_id, selectedIds))}
                  >
                    <Checkbox checked={selectedIds.includes(u.user_id)} className="h-3.5 w-3.5" />
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">{u.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{u.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar userType="admin" />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="border-b border-border bg-card px-4 sm:px-6 py-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  <h1 className="text-sm font-semibold text-foreground whitespace-nowrap">Todas as Tarefas</h1>
                </div>
                <div className="flex items-center gap-0.5 border-l border-border pl-4">
                  <button className={cn("flex items-center gap-1.5 text-xs font-medium py-1.5 px-2.5 rounded-md transition-colors", viewMode === "list" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent")} onClick={() => setViewMode("list")}>
                    <ListTodo className="h-3.5 w-3.5" /> Lista
                  </button>
                  <button className={cn("flex items-center gap-1.5 text-xs font-medium py-1.5 px-2.5 rounded-md transition-colors", viewMode === "board" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent")} onClick={() => setViewMode("board")}>
                    <LayoutGrid className="h-3.5 w-3.5" /> Quadro
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-40 h-8 text-xs" />
                </div>
                {/* Tag filter */}
                {allTags.length > 0 && (
                  <Select value={filterTag || "all"} onValueChange={val => setFilterTag(val === "all" ? null : val)}>
                    <SelectTrigger className="h-8 text-xs w-36 gap-1">
                      <Tag className="h-3 w-3" />
                      <SelectValue placeholder="Etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas etiquetas</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setEditingStatuses([...statuses]); setShowStatusEditor(true); }}>
                  <Settings2 className="h-3.5 w-3.5 mr-1" /> Status
                </Button>
                <Button size="sm" className="h-8 text-xs font-semibold" onClick={() => setShowNewTaskDialog(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova Tarefa
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <ScrollArea className="flex-1 bg-background">
            {viewMode === "list" ? renderListView() : renderBoardView()}
          </ScrollArea>
        </main>
      </div>

      {/* === NEW TASK DIALOG === */}
      <Dialog open={showNewTaskDialog} onOpenChange={(open) => { setShowNewTaskDialog(open); if (!open) resetNewTaskData(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] p-0 overflow-hidden [&>button]:hidden rounded-2xl border border-border/40 shadow-2xl bg-background">
          <div className="flex flex-col sm:flex-row h-[85vh] sm:h-[600px]">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-7 py-3.5 border-b border-border/40 shrink-0">
                <span className="text-sm font-semibold text-foreground tracking-tight">Nova Tarefa</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setShowNewTaskDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col px-7 pt-6 pb-4 overflow-y-auto">
                <Input autoFocus placeholder="Título da tarefa" value={newTaskData.title} onChange={e => setNewTaskData(prev => ({ ...prev, title: e.target.value }))} className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground mb-6" />

                <div className="space-y-0">
                  {/* Status | Responsáveis */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Circle className="h-4 w-4" /> Status</div>
                      <Select value={newTaskData.status_name} onValueChange={val => { const s = statuses.find(s => s.name === val); setNewTaskData(prev => ({ ...prev, status_name: val, status_color: s?.color || "#6b7280" })); }}>
                        <SelectTrigger className="h-7 min-h-0 border border-border/50 shadow-none text-sm font-medium px-2.5 rounded-md w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => (
                            <SelectItem key={s.name} value={s.name}>
                              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {canAssignToOthers ? (
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Users className="h-4 w-4" /> Responsáveis</div>
                        {renderAssigneeMultiSelect(newTaskData.assigned_to, (ids) => setNewTaskData(prev => ({ ...prev, assigned_to: ids })))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Users className="h-4 w-4" /> Responsável</div>
                        <span className="text-sm text-foreground">Você</span>
                      </div>
                    )}
                  </div>

                  {/* Datas | Prioridade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Calendar className="h-4 w-4" /> Datas</div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-sm font-medium text-foreground hover:text-primary transition-colors px-1">
                              {newTaskData.start_date ? format(parseDateLocal(newTaskData.start_date), "dd/MM/yy", { locale: ptBR }) : "Início"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={newTaskData.start_date ? parseDateLocal(newTaskData.start_date) : undefined} onSelect={(date) => setNewTaskData(prev => ({ ...prev, start_date: date ? format(date, "yyyy-MM-dd") : "" }))} />
                          </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground/50">→</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-sm font-medium text-foreground hover:text-primary transition-colors px-1">
                              {newTaskData.due_date ? format(parseDateLocal(newTaskData.due_date), "dd/MM/yy", { locale: ptBR }) : "Entrega"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={newTaskData.due_date ? parseDateLocal(newTaskData.due_date) : undefined} onSelect={(date) => setNewTaskData(prev => ({ ...prev, due_date: date ? format(date, "yyyy-MM-dd") : "" }))} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Flag className="h-4 w-4" /> Prioridade</div>
                      <Select value={newTaskData.priority} onValueChange={val => setNewTaskData(prev => ({ ...prev, priority: val as TaskPriority }))}>
                        <SelectTrigger className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}><div className="flex items-center gap-2"><Flag className={cn("h-3 w-3", cfg.flagColor)} />{cfg.label}</div></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Etiquetas | Cliente */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Tag className="h-4 w-4" /> Etiquetas</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {newTaskData.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs h-5 gap-1 px-1.5">
                            {tag}
                            <button onClick={() => setNewTaskData(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                        {newTaskData.tags.length === 0 && <span className="text-sm text-muted-foreground/60">Vazio</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><User className="h-4 w-4" /> Cliente</div>
                      <Select value={newTaskData.client_id || "none"} onValueChange={val => setNewTaskData(prev => ({ ...prev, client_id: val === "none" ? "" : val }))}>
                        <SelectTrigger className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3"><SelectValue placeholder="Vazio" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {clientsList.map(c => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Estimativa | Lembrete */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Clock className="h-4 w-4" /> Estimativa</div>
                      <Input type="number" placeholder="min" value={newTaskData.estimate_minutes} onChange={e => setNewTaskData(prev => ({ ...prev, estimate_minutes: e.target.value }))} className="h-7 min-h-0 w-20 border-none shadow-none text-sm px-1 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Bell className="h-4 w-4" /> Lembrete</div>
                      <Select value={newTaskData.reminder_minutes || "none"} onValueChange={val => setNewTaskData(prev => ({ ...prev, reminder_minutes: val === "none" ? "" : val }))}>
                        <SelectTrigger className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3"><SelectValue placeholder="Sem lembrete" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem lembrete</SelectItem>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="1440">1 dia</SelectItem>
                          <SelectItem value="10080">1 semana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Projeto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center gap-4 px-1 py-2.5">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><ListChecks className="h-4 w-4" /> Projeto</div>
                      <Input placeholder="Nome do projeto" value={newTaskData.project} onChange={e => setNewTaskData(prev => ({ ...prev, project: e.target.value }))} className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-36 focus-visible:ring-0 placeholder:text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6 border-t border-border/30 pt-5">
                  <Textarea placeholder="Adicione uma descrição..." value={newTaskData.description} onChange={e => setNewTaskData(prev => ({ ...prev, description: e.target.value }))} className="resize-none border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 text-sm min-h-[48px]" rows={2} />
                </div>

                {/* Tags input */}
                <div className="flex items-center gap-3 mt-6">
                  <Input placeholder="Adicionar etiqueta..." value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newTagInput.trim()) { e.preventDefault(); setNewTaskData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] })); setNewTagInput(""); } }} className="h-8 text-xs w-44 bg-muted/30 border-border/40 rounded-lg" />
                  <button className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors" onClick={() => { if (newTagInput.trim()) { setNewTaskData(prev => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] })); setNewTagInput(""); } }}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 mt-auto pt-6">
                  <Button variant="outline" size="sm" className="h-9 px-5 text-sm rounded-lg border-border/60" onClick={() => setShowNewTaskDialog(false)}>Cancelar</Button>
                  <Button size="sm" className="h-9 px-6 text-sm font-semibold rounded-lg" onClick={() => { if (newTaskData.title.trim()) createTask.mutate(newTaskData); }} disabled={!newTaskData.title.trim()}>
                    Criar Tarefa
                  </Button>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex w-56 border-l border-border/30 bg-muted/10 flex-col shrink-0">
              <div className="px-5 py-3.5 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Activity</h3>
              </div>
              <div className="px-5 py-6">
                <p className="text-xs text-muted-foreground/70 leading-relaxed">Salve a tarefa para adicionar comentários</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === TASK DETAIL DIALOG === */}
      <Dialog open={showTaskDetail} onOpenChange={(open) => { setShowTaskDetail(open); if (!open) setSelectedTask(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] p-0 overflow-hidden [&>button]:hidden rounded-2xl border border-border/40 shadow-2xl bg-background">
          {selectedTask && (
            <div className="flex flex-col sm:flex-row h-[85vh] sm:h-[620px]">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-7 py-3.5 border-b border-border/40 shrink-0">
                  <span className="text-sm font-semibold text-foreground tracking-tight">Tarefa</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Criada em {format(new Date(selectedTask.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                    {canDeleteTasks && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive text-xs" onClick={() => deleteTask.mutate(selectedTask.id)}>
                            <Trash2 className="h-3 w-3 mr-2" /> Excluir Tarefa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setShowTaskDetail(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col px-7 pt-6 pb-4 overflow-y-auto">
                  <Input value={selectedTask.title} onChange={e => setSelectedTask(prev => prev ? { ...prev, title: e.target.value } : null)} onBlur={() => { if (selectedTask.title.trim()) updateTask.mutate({ id: selectedTask.id, title: selectedTask.title.trim() }); }} className="text-lg font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 text-foreground mb-6 uppercase" />

                  <div className="space-y-0">
                    {/* Status | Responsáveis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Circle className="h-4 w-4" /> Status</div>
                        <Select value={selectedTask.status_name || "A FAZER"} onValueChange={val => { const s = statuses.find(s => s.name === val); updateTask.mutate({ id: selectedTask.id, status_name: val, status_color: s?.color || "#6b7280" } as any); }}>
                          <SelectTrigger className="h-7 min-h-0 border border-border/50 shadow-none text-sm font-medium px-2.5 rounded-md w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3 bg-muted/30 hover:bg-muted/50 transition-colors"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s.name} value={s.name}><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {canAssignToOthers ? (
                        <div className="flex items-center gap-4 px-1 py-2.5">
                          <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Users className="h-4 w-4" /> Responsáveis</div>
                          {renderAssigneeMultiSelect(selectedTask.assigned_to || [], (ids) => updateTask.mutate({ id: selectedTask.id, assigned_to: ids } as any))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 px-1 py-2.5">
                          <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Users className="h-4 w-4" /> Responsáveis</div>
                          <div className="flex items-center gap-1">
                            {(selectedTask.assigned_to || []).map(uid => (
                              <Avatar key={uid} className="h-5 w-5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{getAdminInitials(uid)}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Datas | Prioridade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Calendar className="h-4 w-4" /> Datas</div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-sm font-medium text-foreground hover:text-primary transition-colors px-1">
                                {selectedTask.start_date ? format(parseDateLocal(selectedTask.start_date), "dd/MM/yy", { locale: ptBR }) : "Início"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent mode="single" selected={selectedTask.start_date ? parseDateLocal(selectedTask.start_date) : undefined} onSelect={(date) => updateTask.mutate({ id: selectedTask.id, start_date: date ? format(date, "yyyy-MM-dd") : null })} />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground/50">→</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-sm font-medium text-foreground hover:text-primary transition-colors px-1">
                                {selectedTask.due_date ? format(parseDateLocal(selectedTask.due_date), "dd/MM/yy", { locale: ptBR }) : "Entrega"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent mode="single" selected={selectedTask.due_date ? parseDateLocal(selectedTask.due_date) : undefined} onSelect={(date) => updateTask.mutate({ id: selectedTask.id, due_date: date ? format(date, "yyyy-MM-dd") : null })} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Flag className="h-4 w-4" /> Prioridade</div>
                        <Select value={selectedTask.priority || "normal"} onValueChange={val => updateTask.mutate({ id: selectedTask.id, priority: val as TaskPriority })}>
                          <SelectTrigger className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}><div className="flex items-center gap-2"><Flag className={cn("h-3 w-3", cfg.flagColor)} />{cfg.label}</div></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Etiquetas | Cliente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Tag className="h-4 w-4" /> Etiquetas</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(selectedTask.tags || []).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs h-5 gap-1 px-1.5">
                              {tag}
                              <button onClick={() => { const newTags = [...(selectedTask.tags || [])]; newTags.splice(i, 1); updateTask.mutate({ id: selectedTask.id, tags: newTags } as any); }} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                            </Badge>
                          ))}
                          <Input placeholder="+ etiqueta" value={detailTagInput} onChange={e => setDetailTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && detailTagInput.trim()) { e.preventDefault(); updateTask.mutate({ id: selectedTask.id, tags: [...(selectedTask.tags || []), detailTagInput.trim()] } as any); setDetailTagInput(""); } }} className="h-5 w-20 border-none shadow-none text-xs px-1 focus-visible:ring-0 placeholder:text-muted-foreground/40" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><User className="h-4 w-4" /> Cliente</div>
                        <Select value={(selectedTask as any).client_id || "none"} onValueChange={val => updateTask.mutate({ id: selectedTask.id, client_id: val === "none" ? null : val } as any)}>
                          <SelectTrigger className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-auto gap-1.5 [&>svg]:h-3 [&>svg]:w-3"><SelectValue placeholder="Vazio" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {clientsList.map(c => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Estimativa | Tempo gasto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><Clock className="h-4 w-4" /> Estimativa</div>
                        <Input type="number" value={selectedTask.estimate_minutes || 0} onChange={e => setSelectedTask(prev => prev ? { ...prev, estimate_minutes: parseInt(e.target.value) || 0 } : null)} onBlur={() => updateTask.mutate({ id: selectedTask.id, estimate_minutes: selectedTask.estimate_minutes || 0 } as any)} className="h-7 min-h-0 w-14 border-none shadow-none text-sm font-medium px-1 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[120px]"><Clock className="h-4 w-4" /> Tempo gasto</div>
                        <Input type="number" value={selectedTask.time_spent_minutes || 0} onChange={e => setSelectedTask(prev => prev ? { ...prev, time_spent_minutes: parseInt(e.target.value) || 0 } : null)} onBlur={() => updateTask.mutate({ id: selectedTask.id, time_spent_minutes: selectedTask.time_spent_minutes || 0 } as any)} className="h-7 min-h-0 w-14 border-none shadow-none text-sm font-medium px-1 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </div>

                    {/* Projeto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center gap-4 px-1 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-w-[100px]"><ListChecks className="h-4 w-4" /> Projeto</div>
                        <Input placeholder="Vazio" value={selectedTask.project || ""} onChange={e => setSelectedTask(prev => prev ? { ...prev, project: e.target.value } : null)} onBlur={() => updateTask.mutate({ id: selectedTask.id, project: selectedTask.project || null } as any)} className="h-7 min-h-0 border-none shadow-none text-sm px-1 w-36 focus-visible:ring-0 placeholder:text-muted-foreground/50" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-6 border-t border-border/30 pt-5">
                    <Textarea placeholder="Adicione uma descrição..." value={selectedTask.description || ""} onChange={e => setSelectedTask(prev => prev ? { ...prev, description: e.target.value } : null)} onBlur={() => updateTask.mutate({ id: selectedTask.id, description: selectedTask.description || null })} className="resize-none border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 text-sm min-h-[48px]" rows={2} />
                  </div>

                  {/* Subtasks */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Subtarefas</span>
                      <Badge variant="secondary" className="text-[10px] h-4">{subtasks.filter(s => s.is_completed).length}/{subtasks.length}</Badge>
                    </div>
                    {subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 pl-6">
                        <Checkbox checked={sub.is_completed} onCheckedChange={(checked) => toggleSubtask.mutate({ id: sub.id, is_completed: !!checked })} className="h-3.5 w-3.5" />
                        <span className={cn("text-sm", sub.is_completed && "line-through text-muted-foreground")}>{sub.title}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pl-6">
                      <Input placeholder="Nova subtarefa..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addSubtask.mutate(); }} className="h-7 text-xs border-none shadow-none px-0 focus-visible:ring-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Sidebar */}
              <div className="hidden sm:flex w-56 border-l border-border/30 bg-muted/10 flex-col shrink-0">
                <div className="px-5 py-3.5 border-b border-border/30">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Atividade</h3>
                </div>
                <ScrollArea className="flex-1 px-5 py-4">
                  <div className="space-y-3">
                    {taskComments.map(comment => (
                      <div key={comment.id} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getAdminInitials(comment.user_id)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-medium">{getAdminName(comment.user_id)}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(comment.created_at), "dd/MM HH:mm")}</span>
                        </div>
                        <p className="text-xs text-foreground pl-5">{comment.content}</p>
                      </div>
                    ))}
                    {taskComments.length === 0 && <p className="text-xs text-muted-foreground/60">Nenhum comentário</p>}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border/30">
                  <div className="flex gap-1.5">
                    <Input placeholder="Comentar..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addComment.mutate(); }} className="h-7 text-xs" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => addComment.mutate()} disabled={!newComment.trim()}>
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === STATUS EDITOR DIALOG === */}
      <Dialog open={showStatusEditor} onOpenChange={setShowStatusEditor}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Editar Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editingStatuses.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="color"
                  value={s.color}
                  onChange={e => setEditingStatuses(prev => prev.map((item, i) => i === idx ? { ...item, color: e.target.value } : item))}
                  className="h-8 w-8 rounded border border-border cursor-pointer shrink-0"
                />
                <Input
                  value={s.name}
                  onChange={e => setEditingStatuses(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                  className="h-8 text-sm"
                />
                {editingStatuses.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setEditingStatuses(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditingStatuses(prev => [...prev, { name: "NOVO STATUS", color: "#6b7280" }])}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Status
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowStatusEditor(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              const valid = editingStatuses.filter(s => s.name.trim());
              setStatuses(valid);
              saveStatuses(valid);
              setShowStatusEditor(false);
              toast.success("Status atualizados!");
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
