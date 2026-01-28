import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateTask } from '@/hooks/useTasks';
import { useTemplates, type TaskTemplate } from '@/hooks/useTemplates';
import type { TaskType, TaskPriority, Subtask } from '@veritas-kanban/shared';
import { FileText, X, Check, AlertCircle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { 
  interpolateVariables, 
  extractCustomVariables,
  type VariableContext 
} from '@/lib/template-variables';
import { getCategoryIcon } from '@/lib/template-categories';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('code');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [project, setProject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [customVars, setCustomVars] = useState<Record<string, string>>({});
  const [requiredCustomVars, setRequiredCustomVars] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const createTask = useCreateTask();
  const { data: templates } = useTemplates();

  // Filter templates by selected category
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (categoryFilter === 'all') return templates;
    return templates.filter(t => (t.category || 'custom') === categoryFilter);
  }, [templates, categoryFilter]);

  const applyTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template.id);
    if (template.taskDefaults.type) setType(template.taskDefaults.type);
    if (template.taskDefaults.priority) setPriority(template.taskDefaults.priority);
    if (template.taskDefaults.project) setProject(template.taskDefaults.project);
    
    // Extract custom variables from description template and subtasks
    const allTemplateText = [
      template.taskDefaults.descriptionTemplate || '',
      ...(template.subtaskTemplates?.map(st => st.title) || [])
    ].join(' ');
    
    const customVarNames = extractCustomVariables(allTemplateText);
    setRequiredCustomVars(customVarNames);
    
    // Initialize custom vars
    const initialCustomVars: Record<string, string> = {};
    customVarNames.forEach(name => {
      initialCustomVars[name] = '';
    });
    setCustomVars(initialCustomVars);
    
    // Store raw template (will be interpolated when custom vars are filled)
    if (template.taskDefaults.descriptionTemplate) {
      setDescription(template.taskDefaults.descriptionTemplate);
    }
    
    // Convert subtask templates to actual subtasks (will be interpolated on submit)
    if (template.subtaskTemplates && template.subtaskTemplates.length > 0) {
      const now = new Date().toISOString();
      const templateSubtasks: Subtask[] = template.subtaskTemplates
        .sort((a, b) => a.order - b.order)
        .map(st => ({
          id: nanoid(),
          title: st.title, // Will be interpolated on submit
          completed: false,
          created: now,
        }));
      setSubtasks(templateSubtasks);
    } else {
      setSubtasks([]);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setSubtasks([]);
    setCustomVars({});
    setRequiredCustomVars([]);
  };

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    // Build variable context
    const context: VariableContext = {
      project: project.trim() || undefined,
      author: 'Brad', // TODO: Get from user config
      customVars,
    };

    // Interpolate variables in description
    const interpolatedDescription = interpolateVariables(description, context);

    // Interpolate variables in subtask titles
    const interpolatedSubtasks = subtasks.map(st => ({
      ...st,
      title: interpolateVariables(st.title, context),
    }));

    await createTask.mutateAsync({
      title: title.trim(),
      description: interpolatedDescription.trim(),
      type,
      priority,
      project: project.trim() || undefined,
      subtasks: interpolatedSubtasks.length > 0 ? interpolatedSubtasks : undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setType('code');
    setPriority('medium');
    setProject('');
    setSelectedTemplate(null);
    setSubtasks([]);
    setCustomVars({});
    setRequiredCustomVars([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="border-b pb-2">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Template</Label>
              </div>
              <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="bug" className="text-xs">🐛</TabsTrigger>
                  <TabsTrigger value="feature" className="text-xs">✨</TabsTrigger>
                  <TabsTrigger value="sprint" className="text-xs">🔄</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select
                value={selectedTemplate || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    clearTemplate();
                  } else {
                    const template = templates.find(t => t.id === value);
                    if (template) applyTemplate(template);
                  }
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.category && `${getCategoryIcon(template.category)} `}
                      {template.name}
                      {template.description && (
                        <span className="text-muted-foreground ml-2">
                          — {template.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="project">Project (optional)</Label>
              <Input
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g., rubicon"
              />
            </div>

            {/* Custom variable inputs */}
            {requiredCustomVars.length > 0 && (
              <div className="grid gap-3 border rounded-md p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <Label className="text-sm font-medium">Template Variables</Label>
                </div>
                {requiredCustomVars.map((varName) => (
                  <div key={varName} className="grid gap-1.5">
                    <Label htmlFor={`var-${varName}`} className="text-xs">
                      {varName}
                    </Label>
                    <Input
                      id={`var-${varName}`}
                      value={customVars[varName] || ''}
                      onChange={(e) => setCustomVars(prev => ({ ...prev, [varName]: e.target.value }))}
                      placeholder={`Enter ${varName}...`}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Subtasks from template */}
            {subtasks.length > 0 && (
              <div className="grid gap-2">
                <Label>Subtasks ({subtasks.length})</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Check className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{subtask.title}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeSubtask(subtask.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
