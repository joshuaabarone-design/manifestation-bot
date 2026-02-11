import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mail, Lock, User, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error?.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, firstName, lastName });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/")}
          data-testid="button-back-to-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="glass-panel border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to continue your manifestation journey"
                : "Start your manifestation journey today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        data-testid="input-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                isLoading={isLoading}
                data-testid="button-submit-auth"
              >
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-primary hover:underline font-medium"
                  data-testid="button-toggle-mode"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-replit-auth"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Sign in with Replit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
