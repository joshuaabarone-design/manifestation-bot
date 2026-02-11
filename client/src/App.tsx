import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Goals from "@/pages/Goals";
import Affirmations from "@/pages/Affirmations";
import Journal from "@/pages/Journal";
import VisionBoard from "@/pages/VisionBoard";
import VisionBoardDetail from "@/pages/VisionBoardDetail";
import ManifestationChat from "@/pages/ManifestationChat";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";
import Rituals from "@/pages/Rituals";
import Training from "@/pages/Training";
import { InstallPrompt } from "@/components/InstallPrompt";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/goals">
        <ProtectedRoute component={Goals} />
      </Route>
      <Route path="/affirmations">
        <ProtectedRoute component={Affirmations} />
      </Route>
      <Route path="/journal">
        <ProtectedRoute component={Journal} />
      </Route>
      <Route path="/vision-board">
        <ProtectedRoute component={VisionBoard} />
      </Route>
      <Route path="/vision-board/:id">
        <ProtectedRoute component={VisionBoardDetail} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={ManifestationChat} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/rituals">
        <ProtectedRoute component={Rituals} />
      </Route>
      <Route path="/training">
        <ProtectedRoute component={Training} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
