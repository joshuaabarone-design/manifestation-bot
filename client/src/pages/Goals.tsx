import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/use-goals";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Circle, Edit, Target, Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGoalSchema } from "@shared/schema";
import type { CreateGoalRequest, Goal } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoalsPageSkeleton } from "@/components/ui/loading-skeleton";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { z } from "zod";

export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());

  const toggleExpanded = (goalId: number) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Your Goals</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Set your intentions and watch them manifest.</p>
          </div>
        </div>
        <GoalsPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Your Goals</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Set your intentions and watch them manifest.</p>
        </div>
        
        <CreateGoalDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals?.map((goal) => {
          const isExpanded = expandedGoals.has(goal.id);
          const progress = goal.progress || 0;
          const beliefLevelRaw = goal.beliefLevel ?? 50;
          const beliefLevel = Math.round(beliefLevelRaw / 10);
          const milestones = goal.milestones || [];
          
          return (
            <div 
              key={goal.id} 
              className={`glass-panel p-6 rounded-2xl border transition-all duration-300 ${
                goal.isCompleted ? 'border-green-500/20 bg-green-900/10' : 'border-white/5 hover:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => updateGoal.mutate({ id: goal.id, isCompleted: !goal.isCompleted })}
                  className={`mt-1 transition-colors ${goal.isCompleted ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                  data-testid={`button-toggle-goal-${goal.id}`}
                  aria-label={goal.isCompleted ? "Mark goal as incomplete" : "Mark goal as complete"}
                >
                  {goal.isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={`text-xl font-bold mb-2 ${goal.isCompleted ? 'text-muted-foreground line-through decoration-primary/50' : 'text-white'}`}>
                      {goal.title}
                    </h3>
                    <div className="flex gap-1 -mt-1 -mr-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setEditingGoal(goal)}
                        data-testid={`button-edit-goal-${goal.id}`}
                        aria-label="Edit goal"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteGoal.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                        aria-label="Delete goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {goal.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-primary font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Belief Level</span>
                          <span className="text-accent font-medium">{beliefLevel}/10</span>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-2 flex-1 rounded-sm ${i < beliefLevel ? 'bg-accent' : 'bg-white/10'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleExpanded(goal.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-4 transition-colors"
                    data-testid={`button-expand-goal-${goal.id}`}
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      {milestones.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Milestones</h4>
                          <div className="space-y-2">
                            {milestones.map((milestone, i) => (
                              <div key={milestone.id || i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className={`h-1.5 w-1.5 rounded-full ${milestone.completed ? 'bg-green-500' : 'bg-primary'}`} />
                                <span className={milestone.completed ? 'line-through opacity-60' : ''}>{milestone.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {goal.evidenceNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Evidence & Notes</h4>
                          <p className="text-sm text-muted-foreground">{goal.evidenceNotes}</p>
                        </div>
                      )}

                      {goal.targetDate && (
                        <div className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 inline-block text-accent">
                          Target: {format(new Date(goal.targetDate), "MMMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {goals?.length === 0 && (
          <div className="col-span-full py-20 text-center glass-panel rounded-2xl border-dashed border-2 border-white/10">
            <h3 className="text-xl font-bold text-muted-foreground mb-2">No goals yet</h3>
            <p className="text-sm text-muted-foreground/50 mb-6">The first step to manifesting is clarity.</p>
            <Button onClick={() => setIsCreateOpen(true)} variant="secondary" data-testid="button-create-first-goal">Create your first goal</Button>
          </div>
        )}
      </div>

      {editingGoal && (
        <EditGoalDialog 
          goal={editingGoal} 
          open={!!editingGoal} 
          onOpenChange={(open) => !open && setEditingGoal(null)} 
        />
      )}
    </Layout>
  );
}

const milestoneSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

const updateGoalSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  beliefLevel: z.number().min(0).max(100).optional(),
  milestones: z.array(milestoneSchema).optional(),
  evidenceNotes: z.string().optional(),
});

type UpdateGoalFormData = z.infer<typeof updateGoalSchema>;

function EditGoalDialog({ goal, open, onOpenChange }: { goal: Goal, open: boolean, onOpenChange: (open: boolean) => void }) {
  const updateGoal = useUpdateGoal();
  const [newMilestone, setNewMilestone] = useState("");
  const [beliefLevelUI, setBeliefLevelUI] = useState(Math.round((goal.beliefLevel ?? 50) / 10));
  const form = useForm<UpdateGoalFormData>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      progress: goal.progress || 0,
      beliefLevel: goal.beliefLevel ?? 50,
      milestones: goal.milestones || [],
      evidenceNotes: goal.evidenceNotes || "",
    },
  });

  useEffect(() => {
    if (open) {
      setBeliefLevelUI(Math.round((goal.beliefLevel ?? 50) / 10));
      form.reset({
        progress: goal.progress || 0,
        beliefLevel: goal.beliefLevel ?? 50,
        milestones: goal.milestones || [],
        evidenceNotes: goal.evidenceNotes || "",
      });
    }
  }, [open, goal.id]);

  const milestones = form.watch("milestones") || [];

  const addMilestone = () => {
    if (newMilestone.trim()) {
      const newItem = { id: crypto.randomUUID(), text: newMilestone.trim(), completed: false };
      form.setValue("milestones", [...milestones, newItem]);
      setNewMilestone("");
    }
  };

  const removeMilestone = (index: number) => {
    form.setValue("milestones", milestones.filter((_, i) => i !== index));
  };

  const toggleMilestoneComplete = (index: number) => {
    const updated = milestones.map((m, i) => i === index ? { ...m, completed: !m.completed } : m);
    form.setValue("milestones", updated);
  };

  const onSubmit = (data: UpdateGoalFormData) => {
    updateGoal.mutate({ id: goal.id, ...data }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/10 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Update Progress</DialogTitle>
          <p className="text-muted-foreground text-sm">{goal.title}</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>Progress</span>
                    <span className="text-primary font-medium">{field.value}%</span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value || 0]}
                      onValueChange={(v) => field.onChange(v[0])}
                      min={0}
                      max={100}
                      step={5}
                      className="py-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="beliefLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>Belief Level</span>
                    <span className="text-accent font-medium">{beliefLevelUI}/10</span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[beliefLevelUI]}
                      onValueChange={(v) => {
                        setBeliefLevelUI(v[0]);
                        field.onChange(v[0] * 10);
                      }}
                      min={1}
                      max={10}
                      step={1}
                      className="py-2"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">How strongly do you believe this will manifest?</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Milestones</FormLabel>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Add a milestone..."
                  className="glass-input"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                  data-testid="input-new-milestone"
                />
                <Button type="button" variant="secondary" onClick={addMilestone} data-testid="button-add-milestone">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {milestones.length > 0 && (
                <div className="mt-3 space-y-2">
                  {milestones.map((milestone, i) => (
                    <div key={milestone.id} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleMilestoneComplete(i)}
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${milestone.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground hover:border-primary'}`}
                        data-testid={`button-toggle-milestone-${i}`}
                      >
                        {milestone.completed && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <span className={`flex-1 ${milestone.completed ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>{milestone.text}</span>
                      <button 
                        type="button" 
                        onClick={() => removeMilestone(i)}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`button-remove-milestone-${i}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="evidenceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence & Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Document signs, synchronicities, and evidence of manifestation..."
                      className="glass-input min-h-[80px]"
                      data-testid="input-evidence-notes"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={updateGoal.isPending} data-testid="button-save-progress">
                Save Progress
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateGoalDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const createGoal = useCreateGoal();
  const form = useForm<CreateGoalRequest>({
    resolver: zodResolver(insertGoalSchema),
    defaultValues: { title: "", description: "" },
  });

  const onSubmit = (data: CreateGoalRequest) => {
    createGoal.mutate(data, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-goal">
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create New Goal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Launch my business" className="glass-input" data-testid="input-goal-title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what success looks like..." 
                      className="glass-input min-h-[100px]" 
                      data-testid="input-goal-description"
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="glass-input"
                      {...field} 
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={createGoal.isPending} data-testid="button-submit-goal">
                Set Intention
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
