import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Star, Moon, Download, Share, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Landing() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 px-4 lg:px-8 py-4 lg:py-6 flex justify-between items-center max-w-7xl mx-auto w-full safe-area-top">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
            <Moon className="h-5 w-5 text-black fill-current" />
          </div>
          <span className="font-display text-xl lg:text-2xl font-bold text-foreground">Manifest</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" data-testid="button-email-login">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          </Link>
          <Button onClick={handleLogin} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" data-testid="button-login">
            Login
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-4 relative z-10 max-w-4xl mx-auto py-8 lg:py-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-6 lg:mb-8"
        >
          <span className="px-3 py-1 lg:px-4 lg:py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs lg:text-sm font-medium tracking-wide uppercase">
            Your Digital Sanctuary
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-4 lg:mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50"
        >
          Align Your Life With <br/>
          <span className="text-primary italic">Your Intentions</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-base lg:text-xl text-muted-foreground mb-8 lg:mb-12 max-w-2xl px-4"
        >
          A soulful space to track your goals, generate daily affirmations, 
          create vision boards, and journal your journey to success.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0"
        >
          <Link href="/auth">
            <Button size="lg" className="w-full sm:w-auto px-8 lg:px-12 text-base lg:text-lg shadow-2xl shadow-primary/20" data-testid="button-start-manifesting">
              Start Manifesting
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          {(deferredPrompt || isIOS) && (
            <Button onClick={handleInstall} variant="outline" size="lg" className="w-full sm:w-auto px-8 border-white/20 text-white hover:bg-white/10" data-testid="button-install-app">
              <Download className="mr-2 h-5 w-5" />
              {isIOS ? "Add to iPhone" : "Install App"}
            </Button>
          )}
        </motion.div>

        {/* iOS Instructions Modal */}
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowIOSInstructions(false)}
          >
            <div 
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold text-foreground mb-4">Add to Home Screen</h3>
              
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold shrink-0">1</span>
                  <p className="text-sm text-muted-foreground">
                    Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari's toolbar
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold shrink-0">2</span>
                  <p className="text-sm text-muted-foreground">
                    Scroll down and tap "Add to Home Screen"
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold shrink-0">3</span>
                  <p className="text-sm text-muted-foreground">
                    Tap "Add" to install Manifest on your iPhone
                  </p>
                </div>
              </div>

              <Button onClick={() => setShowIOSInstructions(false)} className="w-full mt-6" data-testid="button-got-it">
                Got it
              </Button>
            </div>
          </motion.div>
        )}

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-12 lg:mt-24 text-left w-full px-4 lg:px-0"
        >
          {[
            { icon: Star, title: "AI Affirmations", desc: "Daily personalized affirmations generated by mystical AI." },
            { icon: Moon, title: "Vision Boards", desc: "Visualize your future with AI-generated imagery and goals." },
            { icon: Sparkles, title: "Soulful Guidance", desc: "Get advice tailored to your unique life situation." },
          ].map((feature, i) => (
            <div key={i} className="glass-panel p-5 lg:p-6 rounded-2xl hover:bg-white/5 transition-colors">
              <feature.icon className="h-6 lg:h-8 w-6 lg:w-8 text-primary mb-3 lg:mb-4" />
              <h3 className="text-lg lg:text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-16 lg:mt-24 w-full px-4 lg:px-0"
        >
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-center mb-8 lg:mb-12">Your Manifestation Journey</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Set Goals", desc: "Define what you want to manifest in your life" },
              { step: "2", title: "Affirm Daily", desc: "Generate and save powerful affirmations" },
              { step: "3", title: "Visualize", desc: "Create vision boards with AI imagery" },
              { step: "4", title: "Reflect", desc: "Journal your progress and insights" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center mx-auto mb-3 text-lg lg:text-xl">
                  {item.step}
                </div>
                <h3 className="font-bold text-base lg:text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-sm text-muted-foreground safe-area-bottom">
        <p>Manifest your dreams into reality</p>
      </footer>
    </div>
  );
}
