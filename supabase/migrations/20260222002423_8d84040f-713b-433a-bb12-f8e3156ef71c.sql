
-- Create task statuses enum
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'definindo_estrategia', 'concluida', 'cancelada');

-- Create task priority enum  
CREATE TYPE public.task_priority AS ENUM ('urgente', 'alta', 'normal', 'baixa');

-- Create task lists/spaces
CREATE TABLE public.task_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#7c3aed',
  icon TEXT DEFAULT 'folder',
  parent_id UUID REFERENCES public.task_lists(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INT DEFAULT 0
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'pendente',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  list_id UUID NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subtasks
CREATE TABLE public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task comments
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins and TI can manage all
CREATE POLICY "Admins can manage task_lists" ON public.task_lists FOR ALL
  USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "TI can manage task_lists" ON public.task_lists FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "TI can manage tasks" ON public.tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage subtasks" ON public.task_subtasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())));

CREATE POLICY "TI can manage subtasks" ON public.task_subtasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage task_comments" ON public.task_comments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "TI can manage task_comments" ON public.task_comments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_tasks_list_id ON public.tasks(list_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_subtasks_task_id ON public.task_subtasks(task_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);

-- Trigger for updated_at
CREATE TRIGGER update_task_lists_updated_at BEFORE UPDATE ON public.task_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
