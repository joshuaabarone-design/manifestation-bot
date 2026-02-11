import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useManifestationAdvice } from "@/hooks/use-manifestation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MessageSquare, ListTodo, Lightbulb, Plus, BookOpen, Check, History, Trash2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ChatConversation, ChatMessage } from "@shared/schema";

type ConversationWithMessages = ChatConversation & { messages: ChatMessage[] };

export default function ManifestationChat() {
  const getAdvice = useManifestationAdvice();
  const { toast } = useToast();
  const [situation, setSituation] = useState("");
  const [goal, setGoal] = useState("");
  const [savedAffirmations, setSavedAffirmations] = useState<Set<number>>(new Set());
  const [journalSaved, setJournalSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const advice = getAdvice.data;

  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/conversations"],
  });

  const { data: activeConversation } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/chat/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/chat/conversations", { title: "New Guidance Session" });
    },
    onSuccess: async (data) => {
      const conv = await data.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setActiveConversationId(conv.id);
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: async ({ conversationId, role, content }: { conversationId: number; role: "user" | "assistant"; content: string }) => {
      return apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, { role, content });
    },
    onSuccess: () => {
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", activeConversationId] });
      }
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/chat/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      if (activeConversationId) {
        setActiveConversationId(null);
      }
    },
  });

  const saveAffirmationMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", "/api/affirmations", { content: text, category: "guidance" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affirmations"] });
      toast({ title: "Affirmation saved", description: "Added to your affirmations collection." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save affirmation.", variant: "destructive" });
    },
  });

  const saveToJournalMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/journal", { content, mood: "inspired" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      setJournalSaved(true);
      toast({ title: "Saved to journal", description: "Your guidance session has been recorded." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save to journal.", variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAffirmations(new Set());
    setJournalSaved(false);
    
    let conversationId = activeConversationId;
    
    if (!conversationId) {
      const response = await apiRequest("POST", "/api/chat/conversations", { 
        title: situation.slice(0, 50) + (situation.length > 50 ? "..." : "") 
      });
      const conv = await response.json();
      conversationId = conv.id;
      setActiveConversationId(conversationId);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    }

    const userMessage = `Situation: ${situation}\n\nGoal: ${goal || "General guidance"}`;
    await addMessageMutation.mutateAsync({ conversationId: conversationId!, role: "user", content: userMessage });

    getAdvice.mutate({ situation, goal }, {
      onSuccess: async (data) => {
        if (conversationId && data) {
          const assistantContent = `**Guidance:**\n${data.advice}\n\n**Affirmations:**\n${data.suggestedAffirmations.map(a => `• "${a}"`).join("\n")}\n\n**Action Steps:**\n${data.suggestedActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
          await addMessageMutation.mutateAsync({ conversationId, role: "assistant", content: assistantContent });
        }
      }
    });
  };

  const handleSaveAffirmation = (text: string, index: number) => {
    saveAffirmationMutation.mutate(text);
    setSavedAffirmations(prev => new Set(prev).add(index));
  };

  const handleSaveToJournal = () => {
    if (!advice) return;
    const content = `**Situation:** ${situation}\n\n**Goal:** ${goal || "General guidance"}\n\n**Guidance Received:**\n${advice.advice}\n\n**Affirmations:**\n${advice.suggestedAffirmations.map(a => `- "${a}"`).join("\n")}\n\n**Action Steps:**\n${advice.suggestedActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
    saveToJournalMutation.mutate(content);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setSituation("");
    setGoal("");
    setSavedAffirmations(new Set());
    setJournalSaved(false);
    getAdvice.reset();
  };

  const loadConversation = (conv: ChatConversation) => {
    setActiveConversationId(conv.id);
    setShowHistory(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  return (
    <Layout>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 h-full">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:col-span-1 glass-panel p-4 lg:p-6 rounded-2xl overflow-y-auto max-h-[60vh] lg:max-h-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Chat History
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-2">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                      activeConversationId === conv.id ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(conv)}
                      className="flex-1 text-left"
                      data-testid={`button-load-conversation-${conv.id}`}
                    >
                      <p className="text-sm font-medium text-white truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conv.createdAt && format(new Date(conv.createdAt), "MMM d, yyyy")}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteConversationMutation.mutate(conv.id)}
                      data-testid={`button-delete-conversation-${conv.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {(!conversations || conversations.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No previous conversations</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="lg:col-span-1 glass-panel p-5 lg:p-8 rounded-2xl h-fit"
            >
              <div className="flex items-start justify-between mb-5 lg:mb-8">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Soul Guidance</h1>
                  <p className="text-sm lg:text-base text-muted-foreground">Get spiritual guidance aligned with your goals.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)} data-testid="button-show-history">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNewConversation} data-testid="button-new-conversation">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Current Situation</label>
                  <Textarea 
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="I'm feeling stuck in my career..."
                    className="glass-input min-h-[100px] lg:min-h-[120px]"
                    data-testid="input-chat-situation"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Desired Outcome (Optional)</label>
                  <Textarea 
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="I want to feel confident and find a job I love..."
                    className="glass-input min-h-[80px]"
                    data-testid="input-chat-goal"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" isLoading={getAdvice.isPending} disabled={!situation} data-testid="button-ask-universe">
                  <Send className="h-4 w-4 mr-2" />
                  Ask the Universe
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="lg:col-span-2 relative">
          {advice ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 lg:space-y-6"
            >
              <div className="glass-panel p-4 lg:p-6 rounded-2xl border-l-4 border-primary">
                <div className="flex items-start justify-between gap-3 mb-3 lg:mb-4">
                  <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <Lightbulb className="h-4 lg:h-5 w-4 lg:w-5 text-primary" />
                    Guidance
                  </h3>
                  <Button
                    size="sm"
                    variant={journalSaved ? "secondary" : "outline"}
                    onClick={handleSaveToJournal}
                    disabled={journalSaved || saveToJournalMutation.isPending}
                    data-testid="button-save-to-journal"
                  >
                    {journalSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Saved
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4 mr-1" />
                        Save to Journal
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm lg:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {advice.advice}
                </p>
              </div>

              <div className="glass-panel p-4 lg:p-6 rounded-2xl">
                <h3 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 lg:h-5 w-4 lg:w-5 text-accent" />
                  Affirmations to Use
                </h3>
                <ul className="space-y-3 lg:space-y-4">
                  {advice.suggestedAffirmations.map((aff, i) => (
                    <li key={i} className="flex items-start justify-between gap-3">
                      <div className="flex gap-2 lg:gap-3 text-sm lg:text-base text-muted-foreground">
                        <span className="text-primary">•</span>
                        <span className="italic text-white">"{aff}"</span>
                      </div>
                      <Button
                        size="sm"
                        variant={savedAffirmations.has(i) ? "secondary" : "ghost"}
                        onClick={() => handleSaveAffirmation(aff, i)}
                        disabled={savedAffirmations.has(i) || saveAffirmationMutation.isPending}
                        data-testid={`button-save-affirmation-${i}`}
                      >
                        {savedAffirmations.has(i) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-panel p-4 lg:p-6 rounded-2xl">
                <h3 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4 flex items-center gap-2">
                  <ListTodo className="h-4 lg:h-5 w-4 lg:w-5 text-green-400" />
                  Action Steps
                </h3>
                <ul className="space-y-2 lg:space-y-3">
                  {advice.suggestedActions.map((action, i) => (
                    <li key={i} className="flex gap-2 lg:gap-3 text-sm lg:text-base text-muted-foreground">
                      <span className="text-green-400 font-bold">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ) : activeConversation && activeConversation.messages.length > 0 ? (
            <div className="glass-panel p-4 lg:p-6 rounded-2xl h-full overflow-y-auto max-h-[70vh]">
              <h3 className="text-lg font-bold text-white mb-4">Previous Session</h3>
              <div className="space-y-4">
                {activeConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 border-l-2 border-primary' : 'bg-white/5'}`}
                  >
                    <p className="text-xs text-muted-foreground mb-2">
                      {msg.role === 'user' ? 'You' : 'Soul Guide'}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            <div className="min-h-[200px] lg:h-full flex flex-col items-center justify-center text-center p-6 lg:p-8 opacity-50">
              <div className="w-16 lg:w-24 h-16 lg:h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 lg:mb-6 animate-pulse">
                <Sparkles className="h-7 lg:h-10 w-7 lg:w-10 text-primary" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-white mb-2">Ready to receive</h3>
              <p className="text-sm lg:text-base text-muted-foreground max-w-sm">
                Your guidance will appear here once you share your situation.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
