import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sun, Moon, Repeat, Check, Play, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DailyRitual, RitualCompletion } from "@shared/schema";
import { insertDailyRitualSchema } from "@shared/schema";
import { format } from "date-fns";

const ritualTypes = [
  { value: "morning", label: "Morning Ritual", icon: Sun, color: "text-amber-400" },
  { value: "evening", label: "Evening Ritual", icon: Moon, color: "text-indigo-400" },
  { value: "33x3", label: "33x3 Method", icon: Repeat, color: "text-pink-400" },
];

const presetRituals = [
  {
    type: "morning",
    name: "Morning Manifestation",
    description: "Start your day aligned with abundance and gratitude",
    steps: [
      { id: "1", text: "Take 5 deep breaths and center yourself", duration: 2 },
      { id: "2", text: "Express gratitude for 3 things in your life", duration: 3 },
      { id: "3", text: "Visualize your ideal day unfolding perfectly", duration: 5 },
      { id: "4", text: "Repeat your morning affirmation 3 times", duration: 2 },
      { id: "5", text: "Set your intention for the day", duration: 3 },
    ],
  },
  {
    type: "evening",
    name: "Evening Reflection",
    description: "Release the day and prepare for manifestation while you sleep",
    steps: [
      { id: "1", text: "Review the wins and blessings of today", duration: 3 },
      { id: "2", text: "Release any tension or negative thoughts", duration: 2 },
      { id: "3", text: "Affirm that your desires are manifesting", duration: 2 },
      { id: "4", text: "Visualize waking up to wonderful opportunities", duration: 5 },
      { id: "5", text: "Express gratitude and trust the universe", duration: 3 },
    ],
  },
  {
    type: "33x3",
    name: "33x3 Manifestation",
    description: "Write your affirmation 33 times for 3 days to imprint it",
    steps: [
      { id: "1", text: "Choose one specific desire to focus on", duration: 2 },
      { id: "2", text: "Write your affirmation as if it's already true", duration: 1 },
      { id: "3", text: "Repeat writing 33 times with feeling", duration: 20 },
      { id: "4", text: "Visualize the feeling of having it", duration: 5 },
      { id: "5", text: "Release and trust the process", duration: 2 },
    ],
  },
];

const createRitualSchema = insertDailyRitualSchema.pick({
  type: true,
  name: true,
  description: true,
}).extend({
  type: z.string().min(1, "Please select a ritual type"),
  name: z.string().min(1, "Please enter a name"),
});

type CreateRitualFormData = z.infer<typeof createRitualSchema>;

export default function Rituals() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeRitual, setActiveRitual] = useState<DailyRitual | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const { data: rituals, isLoading } = useQuery<DailyRitual[]>({
    queryKey: ["/api/rituals"],
  });

  const createRitualMutation = useMutation({
    mutationFn: async (data: CreateRitualFormData) => {
      const preset = presetRituals.find(p => p.type === data.type);
      return apiRequest("POST", "/api/rituals", {
        ...data,
        steps: preset?.steps || [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituals"] });
      setIsCreateOpen(false);
      toast({ title: "Ritual created", description: "Your new ritual is ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create ritual.", variant: "destructive" });
    },
  });

  const completeRitualMutation = useMutation({
    mutationFn: async (ritualId: number) => {
      return apiRequest("POST", `/api/rituals/${ritualId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rituals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/streaks"] });
      setActiveRitual(null);
      setCurrentStep(0);
      setIsRunning(false);
      toast({ title: "Ritual complete!", description: "Well done on your practice today." });
    },
    onError: () => {
      setIsRunning(false);
      toast({ title: "Error", description: "Failed to save ritual completion. Please try again.", variant: "destructive" });
    },
  });

  const startRitual = (ritual: DailyRitual) => {
    setActiveRitual(ritual);
    setCurrentStep(0);
    setIsRunning(true);
  };

  const nextStep = () => {
    if (!activeRitual) return;
    const steps = activeRitual.steps || [];
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeRitualMutation.mutate(activeRitual.id);
    }
  };

  const getRitualIcon = (type: string) => {
    const found = ritualTypes.find(t => t.value === type);
    return found ? found.icon : Sun;
  };

  const getRitualColor = (type: string) => {
    const found = ritualTypes.find(t => t.value === type);
    return found ? found.color : "text-amber-400";
  };

  if (activeRitual && isRunning) {
    const steps = (activeRitual.steps || []) as { id: string; text: string; duration?: number }[];
    const step = steps[currentStep];
    const RitualIcon = getRitualIcon(activeRitual.type);

    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl p-8 text-center"
          >
            <div className={`w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 ${getRitualColor(activeRitual.type)}`}>
              <RitualIcon className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">{activeRitual.name}</h2>
            <p className="text-sm text-muted-foreground mb-8">Step {currentStep + 1} of {steps.length}</p>

            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-6 mb-8"
            >
              <p className="text-xl text-white leading-relaxed">{step?.text}</p>
              {step?.duration && (
                <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">~{step.duration} minutes</span>
                </div>
              )}
            </motion.div>

            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i < currentStep ? 'w-8 bg-green-500' : i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => { setActiveRitual(null); setIsRunning(false); }}>
                Exit
              </Button>
              <Button onClick={nextStep} size="lg" isLoading={completeRitualMutation.isPending}>
                {currentStep < steps.length - 1 ? (
                  <>Next Step</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Complete
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Daily Rituals</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Structured practices for manifestation and mindfulness.</p>
        </div>
        
        <CreateRitualDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSubmit={(data) => createRitualMutation.mutate(data)}
          isPending={createRitualMutation.isPending}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel rounded-2xl p-6 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-white/10 mb-4" />
              <div className="h-6 w-32 bg-white/10 rounded mb-2" />
              <div className="h-4 w-48 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rituals?.map((ritual) => {
            const RitualIcon = getRitualIcon(ritual.type);
            const steps = ritual.steps || [];
            
            return (
              <motion.div
                key={ritual.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-6 hover:border-primary/30 transition-colors border border-white/5"
              >
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 ${getRitualColor(ritual.type)}`}>
                  <RitualIcon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{ritual.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{ritual.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{steps.length} steps</span>
                  <Button onClick={() => startRitual(ritual)} size="sm" data-testid={`button-start-ritual-${ritual.id}`}>
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {(!rituals || rituals.length === 0) && (
            <div className="col-span-full py-16 text-center glass-panel rounded-2xl border-dashed border-2 border-white/10">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-muted-foreground mb-2">No rituals yet</h3>
              <p className="text-sm text-muted-foreground/50 mb-6">Create your first daily ritual to start your practice.</p>
              <Button onClick={() => setIsCreateOpen(true)} variant="secondary" data-testid="button-create-first-ritual">
                Create Ritual
              </Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function CreateRitualDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (data: CreateRitualFormData) => void;
  isPending: boolean;
}) {
  const form = useForm<CreateRitualFormData>({
    resolver: zodResolver(createRitualSchema),
    defaultValues: { type: "", name: "", description: "" },
  });

  const selectedType = form.watch("type");
  const preset = presetRituals.find(p => p.type === selectedType);

  const handleTypeChange = (value: string) => {
    form.setValue("type", value);
    const preset = presetRituals.find(p => p.type === value);
    if (preset) {
      form.setValue("name", preset.name);
      form.setValue("description", preset.description);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-ritual">
          <Plus className="h-4 w-4 mr-2" />
          New Ritual
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Daily Ritual</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ritual Type</FormLabel>
                  <Select onValueChange={handleTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input" data-testid="select-ritual-type">
                        <SelectValue placeholder="Select a ritual type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ritualTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My morning ritual" className="glass-input" data-testid="input-ritual-name" {...field} />
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
                      placeholder="What is this ritual about..." 
                      className="glass-input min-h-[80px]" 
                      data-testid="input-ritual-description"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {preset && (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">This ritual includes {preset.steps.length} guided steps</p>
                <div className="space-y-1">
                  {preset.steps.slice(0, 3).map((step, i) => (
                    <p key={i} className="text-xs text-muted-foreground/70">• {step.text}</p>
                  ))}
                  {preset.steps.length > 3 && (
                    <p className="text-xs text-muted-foreground/50">+ {preset.steps.length - 3} more steps</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isPending} data-testid="button-submit-ritual">
                Create Ritual
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
