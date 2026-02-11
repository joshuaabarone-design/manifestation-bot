import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useGoals } from "@/hooks/use-goals";
import { useAffirmations } from "@/hooks/use-affirmations";
import { motion } from "framer-motion";
import { Target, Sparkles, ArrowRight, BookHeart, MessageCircle, Image, Flame, Trophy, Calendar, Zap } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { UserStreaks } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: goals } = useGoals();
  const { data: affirmations } = useAffirmations();
  const { data: streaks } = useQuery<UserStreaks | null>({
    queryKey: ["/api/streaks"],
  });

  const recentGoals = goals?.slice(0, 3) || [];
  const latestAffirmation = affirmations?.[0];
  const completedGoals = goals?.filter(g => g.isCompleted).length || 0;
  const totalGoals = goals?.length || 0;

  const streakItems = [
    { 
      label: "Affirmations", 
      streak: streaks?.affirmationStreak || 0, 
      longest: streaks?.longestAffirmationStreak || 0,
      icon: Sparkles,
      color: "text-purple-400"
    },
    { 
      label: "Journal", 
      streak: streaks?.journalStreak || 0, 
      longest: streaks?.longestJournalStreak || 0,
      icon: BookHeart,
      color: "text-blue-400"
    },
    { 
      label: "Meditation", 
      streak: streaks?.meditationStreak || 0, 
      longest: 0,
      icon: Zap,
      color: "text-green-400"
    },
  ];

  const quickActions = [
    { href: "/goals", label: "Add Goal", icon: Target, color: "from-amber-500 to-orange-600" },
    { href: "/affirmations", label: "Get Affirmation", icon: Sparkles, color: "from-purple-500 to-pink-600" },
    { href: "/journal", label: "Write Entry", icon: BookHeart, color: "from-blue-500 to-cyan-600" },
    { href: "/chat", label: "Get Advice", icon: MessageCircle, color: "from-green-500 to-emerald-600" },
  ];

  return (
    <Layout>
      <header className="mb-6 lg:mb-10">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-2">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground">The universe is listening. What will you manifest today?</p>
      </header>

      {/* Quick Actions - Mobile First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickActions.map((action, i) => (
          <Link key={i} href={action.href} data-testid={`link-quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors touch-target"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs lg:text-sm font-medium">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Daily Affirmation Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 glass-panel rounded-2xl p-5 lg:p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:bg-primary/10" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 lg:mb-4 text-primary">
              <Sparkles className="h-4 lg:h-5 w-4 lg:w-5" />
              <span className="text-xs lg:text-sm font-bold tracking-wider uppercase">Daily Affirmation</span>
            </div>
            
            {latestAffirmation ? (
              <blockquote className="font-display text-lg lg:text-2xl xl:text-3xl italic leading-relaxed text-white mb-4 lg:mb-6">
                "{latestAffirmation.content}"
              </blockquote>
            ) : (
              <div className="text-center py-6 lg:py-8">
                <p className="text-muted-foreground mb-4 text-sm lg:text-base">You haven't generated any affirmations yet.</p>
                <Link href="/affirmations" data-testid="link-goto-affirmations" className="text-primary hover:underline text-sm lg:text-base">Go to Affirmations</Link>
              </div>
            )}
            
            {latestAffirmation && (
              <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                  {latestAffirmation.category}
                </span>
                <span>• {format(new Date(latestAffirmation.createdAt!), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Streak Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-5 lg:p-6 bg-gradient-to-b from-orange-950/30 to-red-950/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-display text-lg font-bold text-white">Your Streaks</h3>
          </div>
          
          <div className="space-y-4">
            {streakItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    {item.longest > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        Best: {item.longest} days
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {item.streak > 0 && <Flame className="h-4 w-4 text-orange-500" />}
                  <span className={`text-xl font-bold ${item.streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {item.streak}
                  </span>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-muted-foreground">
              {(streaks?.totalAffirmations || 0) + (streaks?.totalJournalEntries || 0)} total activities
            </p>
          </div>
        </motion.div>

        {/* Goals Progress Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-5 lg:p-6 flex flex-col justify-center items-center text-center bg-gradient-to-b from-indigo-950/50 to-purple-950/50"
        >
          <div className="w-14 lg:w-16 h-14 lg:h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3 lg:mb-4 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
            <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-primary shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.5)]" />
          </div>
          <h3 className="font-display text-lg lg:text-xl font-bold text-white mb-1">Goals Progress</h3>
          <p className="text-2xl lg:text-3xl font-bold text-primary">{completedGoals}/{totalGoals}</p>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Completed</p>
          <div className="mt-4 lg:mt-6 w-full pt-4 lg:pt-6 border-t border-white/5">
             <p className="text-xs font-medium text-accent uppercase tracking-widest mb-2">Focus Energy On</p>
             <p className="text-base lg:text-lg text-white">Growth & Abundance</p>
          </div>
        </motion.div>

        {/* Recent Goals */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 lg:col-span-4 glass-panel rounded-2xl p-5 lg:p-6"
        >
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
              <Target className="h-4 lg:h-5 w-4 lg:w-5 text-accent" />
              Recent Goals
            </h2>
            <Link href="/goals" data-testid="link-view-all-goals" className="text-xs lg:text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3 lg:h-4 w-3 lg:w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {recentGoals.length > 0 ? (
              recentGoals.map((goal) => (
                <div key={goal.id} data-testid={`card-goal-${goal.id}`} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white line-clamp-1 text-sm lg:text-base">{goal.title}</h3>
                    <div className={`w-2 h-2 rounded-full shrink-0 ml-2 ${goal.isCompleted ? 'bg-green-500' : 'bg-amber-500'}`} />
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2 mb-3 h-8 lg:h-10">
                    {goal.description || "No description provided."}
                  </p>
                  <div className="text-xs text-muted-foreground/50">
                    Target: {goal.targetDate ? format(new Date(goal.targetDate), "MMM d") : "None"}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-6 lg:py-8 text-center text-muted-foreground text-sm">
                No active goals. <Link href="/goals" data-testid="link-create-goal" className="text-primary hover:underline">Create one</Link> to start manifesting.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
