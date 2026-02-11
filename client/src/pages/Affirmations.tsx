import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAffirmations, useGenerateAffirmation, useCreateAffirmation } from "@/hooks/use-affirmations";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Copy, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AffirmationsPageSkeleton } from "@/components/ui/loading-skeleton";

export default function Affirmations() {
  const { data: affirmations, isLoading } = useAffirmations();
  const [generatedAffirmation, setGeneratedAffirmation] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Daily Affirmations</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Words of power to shape your reality.</p>
          </div>
        </div>
        <AffirmationsPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Daily Affirmations</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Words of power to shape your reality.</p>
        </div>
        <GenerateAffirmationDialog onGenerate={setGeneratedAffirmation} />
      </div>

      {generatedAffirmation && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
           <GeneratedAffirmationCard 
             content={generatedAffirmation} 
             onSave={() => setGeneratedAffirmation(null)}
             onDismiss={() => setGeneratedAffirmation(null)}
           />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {affirmations?.map((affirmation) => (
          <div key={affirmation.id} className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(affirmation.content);
                  toast({ title: "Copied to clipboard" });
                }}
                data-testid={`button-copy-affirmation-${affirmation.id}`}
                aria-label="Copy affirmation to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="font-display text-xl leading-relaxed text-white mb-4">
              "{affirmation.content}"
            </p>
            
            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 pt-4">
              <span className="capitalize">{affirmation.category}</span>
              <span>{format(new Date(affirmation.createdAt!), "MMM d, yyyy")}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function GeneratedAffirmationCard({ content, onSave, onDismiss }: { content: string, onSave: () => void, onDismiss: () => void }) {
  const createAffirmation = useCreateAffirmation();
  
  const handleSave = () => {
    createAffirmation.mutate({ content, category: "AI Generated" }, {
      onSuccess: () => {
        toast({ title: "Affirmation saved" });
        onSave();
      }
    });
  };

  return (
    <div className="bg-gradient-to-br from-primary/20 to-purple-900/40 border border-primary/30 p-8 rounded-2xl text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
      <Sparkles className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
      
      <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-8 leading-tight drop-shadow-lg">
        "{content}"
      </h2>
      
      <div className="flex justify-center gap-4 relative z-10">
        <Button variant="ghost" onClick={onDismiss} data-testid="button-discard-affirmation">Discard</Button>
        <Button onClick={handleSave} isLoading={createAffirmation.isPending} data-testid="button-save-affirmation">
          <Save className="h-4 w-4 mr-2" />
          Save to Collection
        </Button>
      </div>
    </div>
  );
}

function GenerateAffirmationDialog({ onGenerate }: { onGenerate: (text: string) => void }) {
  const generate = useGenerateAffirmation();
  const [theme, setTheme] = useState("");
  const [open, setOpen] = useState(false);

  const handleGenerate = () => {
    generate.mutate({ theme }, {
      onSuccess: (data) => {
        onGenerate(data.affirmation);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-lg shadow-primary/20" data-testid="button-generate-affirmation">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate New
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Manifestation Focus</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What area do you want to focus on?</Label>
            <Input 
              placeholder="e.g. Career success, Inner peace, Love" 
              className="glass-input"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              data-testid="input-affirmation-theme"
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleGenerate} 
            isLoading={generate.isPending}
            disabled={!theme}
            data-testid="button-channel-affirmation"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Channel Affirmation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
