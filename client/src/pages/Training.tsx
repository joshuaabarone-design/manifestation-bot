import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Loader2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Target,
  Lightbulb,
  MessageSquare,
  Shield,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface TrainingMetrics {
  personalityDriftScore: number;
  factualAccuracyScore: number;
  responseConsistencyScore: number;
  behavioralComplianceScore: number;
  overallScore: number;
  passesThreshold: boolean;
}

interface TrainingResult {
  agentId: number;
  agentName: string;
  testPrompt: string;
  response: string;
  metrics: TrainingMetrics;
  feedback: string[];
  timestamp: string;
}

interface TrainingSuiteResult {
  results: TrainingResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    averageScore: number;
    meetsThreshold: boolean;
  };
}

interface TrainingRecommendation {
  recommendations: string[];
  priorityAreas: string[];
  suggestedActions: string[];
}

const THRESHOLD = 0.85;

function ScoreCard({ 
  label, 
  score, 
  icon: Icon,
  threshold = THRESHOLD,
  testId
}: { 
  label: string; 
  score: number; 
  icon: React.ElementType;
  threshold?: number;
  testId?: string;
}) {
  const percentage = Math.round(score * 100);
  const passes = score >= threshold;
  
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-card/50" data-testid={testId}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Badge variant={passes ? "default" : "destructive"} className="text-xs" data-testid={testId ? `${testId}-badge` : undefined}>
          {percentage}%
        </Badge>
      </div>
      <Progress value={percentage} className={passes ? "" : "[&>div]:bg-destructive"} />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {passes ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 text-destructive" />
        )}
        <span>Threshold: {Math.round(threshold * 100)}%</span>
      </div>
    </div>
  );
}

export default function Training() {
  const { toast } = useToast();
  const [suiteResults, setSuiteResults] = useState<TrainingSuiteResult | null>(null);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation | null>(null);

  const { data: agents, isLoading: agentsLoading, isError: agentsError } = useQuery<any[]>({
    queryKey: ["/api/agents"],
  });

  const runSuiteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/training/suite", { agentId: 22 });
      return response.json();
    },
    onSuccess: (data: TrainingSuiteResult) => {
      setSuiteResults(data);
      toast({
        title: "Training Suite Complete",
        description: `${data.summary.passedTests}/${data.summary.totalTests} tests passed with ${Math.round(data.summary.averageScore * 100)}% average score.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Training Failed",
        description: error.message || "Failed to run training suite.",
        variant: "destructive",
      });
    },
  });

  const getRecommendationsMutation = useMutation({
    mutationFn: async (results: TrainingResult[]) => {
      const response = await apiRequest("POST", "/api/training/recommendations", { results });
      return response.json();
    },
    onSuccess: (data: TrainingRecommendation) => {
      setRecommendations(data);
      toast({
        title: "Recommendations Ready",
        description: "The Training Orchestrator has provided improvement suggestions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Get Recommendations",
        description: error.message || "Could not get recommendations from Training Orchestrator.",
        variant: "destructive",
      });
    },
  });

  const manifestationAgent = agents?.find((a: any) => a.id === 22);

  const getAgentStatus = (agentId: number) => {
    if (agentsLoading) return "Loading...";
    if (agentsError) return "Unavailable";
    const agent = agents?.find((a: any) => a.id === agentId);
    return agent?.status === "active" ? "Active" : "Inactive";
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-training-header">
              <Brain className="h-6 w-6 text-primary" />
              Agent Training Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Evaluate and improve the Manifestation Agent using the CALM behavioral framework
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="card-agent-manifestation">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Manifestation Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-agent-22-id">#22</div>
              <p className="text-xs text-muted-foreground" data-testid="text-agent-22-status">
                {getAgentStatus(22)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-agent-architect">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Behavior Architect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-agent-23-id">#23</div>
              <p className="text-xs text-muted-foreground" data-testid="text-agent-23-status">{getAgentStatus(23)}</p>
            </CardContent>
          </Card>

          <Card data-testid="card-agent-orchestrator">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Training Orchestrator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-agent-26-id">#26</div>
              <p className="text-xs text-muted-foreground" data-testid="text-agent-26-status">{getAgentStatus(26)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Run Training Evaluation
            </CardTitle>
            <CardDescription>
              Test the Manifestation Agent with 5 standard prompts and evaluate against CALM behavioral standards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => runSuiteMutation.mutate()} 
                disabled={runSuiteMutation.isPending}
                data-testid="button-run-training"
              >
                {runSuiteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Training Suite
                  </>
                )}
              </Button>

              {suiteResults && !suiteResults.summary.meetsThreshold && (
                <Button 
                  variant="outline"
                  onClick={() => getRecommendationsMutation.mutate(suiteResults.results)}
                  disabled={getRecommendationsMutation.isPending}
                  data-testid="button-get-recommendations"
                >
                  {getRecommendationsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Recommendations...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Get Improvements
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Training Thresholds:</strong>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Personality Consistency: 85%+</li>
                <li>Response Consistency: 85%+</li>
                <li>Behavioral Compliance: 95%+</li>
                <li>Factual Accuracy: 90%+</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {suiteResults && (
          <>
            <Card data-testid="card-results-summary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Training Results Summary
                  </CardTitle>
                  <Badge 
                    variant={suiteResults.summary.meetsThreshold ? "default" : "destructive"}
                    className="text-sm"
                    data-testid="badge-overall-status"
                  >
                    {suiteResults.summary.meetsThreshold ? "PASSED" : "NEEDS IMPROVEMENT"}
                  </Badge>
                </div>
                <CardDescription data-testid="text-tests-passed">
                  {suiteResults.summary.passedTests} of {suiteResults.summary.totalTests} tests passed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <ScoreCard 
                    label="Overall Score" 
                    score={suiteResults.summary.averageScore}
                    icon={Target}
                    testId="score-overall"
                  />
                  <ScoreCard 
                    label="Personality Consistency" 
                    score={suiteResults.results.reduce((acc, r) => acc + r.metrics.personalityDriftScore, 0) / suiteResults.results.length}
                    icon={Brain}
                    testId="score-personality"
                  />
                  <ScoreCard 
                    label="Response Consistency" 
                    score={suiteResults.results.reduce((acc, r) => acc + r.metrics.responseConsistencyScore, 0) / suiteResults.results.length}
                    icon={MessageSquare}
                    testId="score-consistency"
                  />
                  <ScoreCard 
                    label="Behavioral Compliance" 
                    score={suiteResults.results.reduce((acc, r) => acc + r.metrics.behavioralComplianceScore, 0) / suiteResults.results.length}
                    icon={Shield}
                    threshold={0.95}
                    testId="score-compliance"
                  />
                  <ScoreCard 
                    label="Factual Accuracy" 
                    score={suiteResults.results.reduce((acc, r) => acc + r.metrics.factualAccuracyScore, 0) / suiteResults.results.length}
                    icon={CheckCircle2}
                    threshold={0.90}
                    testId="score-accuracy"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Test Results Detail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {suiteResults.results.map((result, idx) => (
                  <div key={idx} className="space-y-2 p-4 rounded-lg border" data-testid={`card-test-result-${idx + 1}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-test-${idx + 1}`}>Test {idx + 1}</Badge>
                          {result.metrics.passesThreshold ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <p className="text-sm font-medium" data-testid={`text-test-prompt-${idx + 1}`}>{result.testPrompt}</p>
                      </div>
                      <Badge variant={result.metrics.passesThreshold ? "default" : "secondary"} data-testid={`badge-test-score-${idx + 1}`}>
                        {Math.round(result.metrics.overallScore * 100)}%
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Response:</strong>
                      <p className="mt-1 text-foreground line-clamp-3" data-testid={`text-test-response-${idx + 1}`}>{result.response}</p>
                    </div>

                    {result.feedback.length > 0 && (
                      <div className="text-sm">
                        <strong className="text-muted-foreground">Feedback:</strong>
                        <ul className="mt-1 list-disc list-inside space-y-1 text-amber-600 dark:text-amber-400" data-testid={`list-test-feedback-${idx + 1}`}>
                          {result.feedback.map((fb, i) => (
                            <li key={i}>{fb}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {recommendations && (
          <Card className="border-primary/50" data-testid="card-recommendations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Training Orchestrator Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered suggestions for improving the Manifestation Agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.priorityAreas && recommendations.priorityAreas.length > 0 && (
                <div data-testid="section-priority-areas">
                  <h4 className="font-medium text-sm mb-2">Priority Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.priorityAreas.map((area, i) => (
                      <Badge key={i} variant="destructive" data-testid={`badge-priority-${i}`}>{area}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.recommendations && recommendations.recommendations.length > 0 && (
                <div data-testid="section-recommendations">
                  <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {recommendations.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-recommendation-${i}`}>
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendations.suggestedActions && recommendations.suggestedActions.length > 0 && (
                <div data-testid="section-suggested-actions">
                  <h4 className="font-medium text-sm mb-2">Suggested Actions</h4>
                  <ul className="space-y-2">
                    {recommendations.suggestedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-action-${i}`}>
                        <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
