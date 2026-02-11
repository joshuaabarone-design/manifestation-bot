import { Layout } from "@/components/layout/Layout";
import { useJournalEntries, useCreateJournalEntry } from "@/hooks/use-journal";
import { Button } from "@/components/ui/button";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJournalEntrySchema } from "@shared/schema";
import type { CreateJournalEntryRequest } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";
import { JournalPageSkeleton } from "@/components/ui/loading-skeleton";

interface JournalEditorProps {
  form: UseFormReturn<CreateJournalEntryRequest>;
  onSubmit: (data: CreateJournalEntryRequest) => void;
  isPending: boolean;
}

function JournalEditor({ form, onSubmit, isPending }: JournalEditorProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 lg:p-8 border border-white/5 flex flex-col">
      <h2 className="text-xl lg:text-2xl font-display font-bold text-white mb-4 lg:mb-6 flex items-center gap-2">
        <PenTool className="h-4 lg:h-5 w-4 lg:w-5 text-primary" />
        New Entry
      </h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="manifestationFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Focus</FormLabel>
                  <FormControl>
                    <Input placeholder="What are you manifesting?" className="glass-input" data-testid="input-journal-focus" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Mood</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'neutral'}>
                    <FormControl>
                      <SelectTrigger className="glass-input" data-testid="select-journal-mood">
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="happy">Happy & High Vibrational</SelectItem>
                      <SelectItem value="grateful">Grateful</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="anxious">Anxious</SelectItem>
                      <SelectItem value="sad">Low Energy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Journal</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Write your thoughts, dreams, and intentions here..." 
                    className="glass-input resize-none text-base lg:text-lg leading-relaxed min-h-[150px] lg:min-h-[200px]" 
                    data-testid="input-journal-content"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" isLoading={isPending} className="px-6 lg:px-8" data-testid="button-save-journal">
              Save Entry
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function Journal() {
  const { data: entries, isLoading } = useJournalEntries();
  const createEntry = useCreateJournalEntry();
  
  const form = useForm<CreateJournalEntryRequest>({
    resolver: zodResolver(insertJournalEntrySchema),
    defaultValues: { content: "", mood: "neutral", manifestationFocus: "" },
  });

  const onSubmit = (data: CreateJournalEntryRequest) => {
    createEntry.mutate(data, {
      onSuccess: () => {
        form.reset();
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <JournalPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Editor - shown first on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <JournalEditor form={form} onSubmit={onSubmit} isPending={createEntry.isPending} />
        </div>
        
        {/* Entry List - shown second on mobile */}
        <div className="order-2 lg:order-1 lg:col-span-1 space-y-4">
          <h2 className="text-lg lg:text-xl font-display font-bold text-white mb-3 lg:mb-4">
            Past Entries
          </h2>
          {entries?.map((entry) => (
            <div key={entry.id} data-testid={`card-journal-entry-${entry.id}`} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-primary/20 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  {format(new Date(entry.createdAt!), "MMM d")}
                </span>
                <span className="text-xs text-muted-foreground capitalize bg-white/5 px-2 py-0.5 rounded-full">
                  {entry.mood}
                </span>
              </div>
              <h3 className="font-bold text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors text-sm lg:text-base">
                {entry.manifestationFocus || "Daily Reflection"}
              </h3>
              <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">
                {entry.content}
              </p>
            </div>
          ))}
          {entries?.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">No entries yet.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
