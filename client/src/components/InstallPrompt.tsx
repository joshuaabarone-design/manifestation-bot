import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("install-dismissed")) {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Android/Desktop Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS Safari detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ("standalone" in window.navigator) && (window.navigator as any).standalone;
    
    if (isIOS && !isInStandaloneMode) {
      // Delay showing on iOS so page loads first
      setTimeout(() => setShowIOSPrompt(true), 2000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSPrompt(false);
    setDeferredPrompt(null);
    sessionStorage.setItem("install-dismissed", "true");
  };

  if (dismissed) return null;

  // iOS prompt
  if (showIOSPrompt) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 z-[60] lg:bottom-4 lg:left-auto lg:right-4 lg:w-80"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl">
            <button 
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-purple-600 rounded-xl">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Add to Home Screen</h3>
                <p className="text-sm text-muted-foreground">Install Manifest for the best experience</p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                <span className="text-muted-foreground">Tap the <Share className="inline h-4 w-4 mx-1" /> Share button below</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                <span className="text-muted-foreground">Scroll and tap "Add to Home Screen"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
                <span className="text-muted-foreground">Tap "Add" to install</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Android/Desktop prompt
  if (deferredPrompt) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 z-[60] lg:bottom-4 lg:left-auto lg:right-4 lg:w-80"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl">
            <button 
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-purple-600 rounded-xl">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Install Manifest</h3>
                <p className="text-sm text-muted-foreground">Add to your home screen for quick access</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleDismiss} variant="ghost" size="sm" className="flex-1" data-testid="button-install-dismiss">
                Not Now
              </Button>
              <Button onClick={handleInstall} size="sm" className="flex-1" data-testid="button-install-app">
                <Download className="mr-2 h-4 w-4" />
                Install
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
