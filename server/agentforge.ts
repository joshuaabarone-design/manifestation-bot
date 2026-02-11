const AGENTFORGE_BASE_URL = "https://2c3035d7-d662-4049-945d-8792c12b7c65-00-2422uhh2w3n9i.picard.replit.dev/api/agents";

// Agent IDs for the manifestation app
export const AGENT_IDS = {
  MANIFESTATION: 22,        // Main manifestation coach
  BEHAVIOR_ARCHITECT: 23,   // CALM Behavior Architect
  TRAINING_ORCHESTRATOR: 26 // Training Orchestrator
};

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface CommunicationStyle {
  tone: string;
  formality: string;
  verbosity: string;
}

export interface CharacterBible {
  coreIdentity: string;
  personalityTraits: PersonalityTraits;
  communicationStyle: CommunicationStyle;
  knowledgeDomains: string[];
  ethicalBoundaries: string[];
}

export interface BehavioralRule {
  id: string;
  rule: string;
  priority: string;
  category: string;
}

export interface ConstitutionalRules {
  behavioralRules: BehavioralRule[];
  safetyBoundaries: string[];
  prohibitedBehaviors: string[];
}

export interface MemoryArchitecture {
  shortTermCapacity: number;
  longTermEnabled: boolean;
  contextWindowSize: number;
  memoryDecayRate: number;
}

export interface ConsistencyMetrics {
  personalityDriftThreshold: number;
  factualAccuracyTarget: number;
  responseConsistencyTarget: number;
}

export interface AgentConfig {
  id: number;
  userId: string;
  name: string;
  description: string;
  role: string;
  knowledgeFiles: string[];
  styleFiles: string[];
  styleWeight: number;
  capabilities: string[];
  status: string;
  createdAt: string;
  characterBible?: CharacterBible;
  constitutionalRules?: ConstitutionalRules;
  memoryArchitecture?: MemoryArchitecture;
  consistencyMetrics?: ConsistencyMetrics;
}

// Cache for multiple agents
const agentCache: Map<number, { config: AgentConfig; lastFetch: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearAgentCache(agentId?: number): void {
  if (agentId) {
    agentCache.delete(agentId);
    console.log(`[agentforge] Cache cleared for agent ${agentId}`);
  } else {
    agentCache.clear();
    console.log("[agentforge] All agent caches cleared");
  }
}

export async function refreshAgentConfig(agentId: number = AGENT_IDS.MANIFESTATION): Promise<AgentConfig | null> {
  clearAgentCache(agentId);
  return getAgentConfigById(agentId);
}

export async function getAgentConfigById(agentId: number): Promise<AgentConfig | null> {
  const now = Date.now();
  const cached = agentCache.get(agentId);
  
  if (cached && (now - cached.lastFetch) < CACHE_TTL) {
    return cached.config;
  }
  
  try {
    const response = await fetch(`${AGENTFORGE_BASE_URL}/${agentId}/public`);
    if (!response.ok) {
      console.error(`[agentforge] Failed to fetch agent ${agentId}:`, response.status);
      return cached?.config || null;
    }
    
    const config = await response.json();
    agentCache.set(agentId, { config, lastFetch: now });
    console.log(`[agentforge] Loaded agent config: ${config.name} (ID: ${agentId})`);
    return config;
  } catch (error) {
    console.error(`[agentforge] Error fetching agent ${agentId}:`, error);
    return cached?.config || null;
  }
}

// Legacy function for backward compatibility
export async function getAgentConfig(): Promise<AgentConfig | null> {
  return getAgentConfigById(AGENT_IDS.MANIFESTATION);
}

// Get all registered agents
export async function getAllAgents(): Promise<{ [key: string]: AgentConfig | null }> {
  const [manifestation, behaviorArchitect, trainingOrchestrator] = await Promise.all([
    getAgentConfigById(AGENT_IDS.MANIFESTATION),
    getAgentConfigById(AGENT_IDS.BEHAVIOR_ARCHITECT),
    getAgentConfigById(AGENT_IDS.TRAINING_ORCHESTRATOR)
  ]);
  
  return {
    manifestation,
    behaviorArchitect,
    trainingOrchestrator
  };
}

// Build CALM-compliant system prompt from agent config
export function buildCALMPrompt(agent: AgentConfig): string {
  let prompt = "";

  // IDENTITY section
  prompt += `# IDENTITY
You are ${agent.name}.`;

  if (agent.characterBible?.coreIdentity) {
    prompt += ` ${agent.characterBible.coreIdentity}`;
  }
  
  prompt += `\n\n${agent.description}`;

  // ROLE section
  if (agent.role) {
    prompt += `\n\n# ROLE\n${agent.role}`;
  }

  // PERSONALITY section (Big Five traits from CALM)
  if (agent.characterBible?.personalityTraits) {
    const traits = agent.characterBible.personalityTraits;
    prompt += `\n\n# PERSONALITY (Big Five)
- Openness: ${traits.openness}/100
- Conscientiousness: ${traits.conscientiousness}/100
- Extraversion: ${traits.extraversion}/100
- Agreeableness: ${traits.agreeableness}/100
- Neuroticism: ${traits.neuroticism}/100`;
  }

  // COMMUNICATION STYLE section
  if (agent.characterBible?.communicationStyle) {
    const style = agent.characterBible.communicationStyle;
    prompt += `\n\n# COMMUNICATION STYLE
- Tone: ${style.tone}
- Formality: ${style.formality}
- Verbosity: ${style.verbosity}`;
  }

  // KNOWLEDGE DOMAINS section
  if (agent.characterBible?.knowledgeDomains && agent.characterBible.knowledgeDomains.length > 0) {
    prompt += `\n\n# KNOWLEDGE DOMAINS
${agent.characterBible.knowledgeDomains.map(d => `- ${d}`).join('\n')}`;
  }

  // CONSTITUTIONAL RULES section (MUST FOLLOW)
  if (agent.constitutionalRules?.behavioralRules && agent.constitutionalRules.behavioralRules.length > 0) {
    prompt += `\n\n# CONSTITUTIONAL RULES (MUST FOLLOW)
${agent.constitutionalRules.behavioralRules.map(r => `- [${r.priority.toUpperCase()}] ${r.rule}`).join('\n')}`;
  }

  // SAFETY BOUNDARIES section (NEVER VIOLATE)
  if (agent.constitutionalRules?.safetyBoundaries && agent.constitutionalRules.safetyBoundaries.length > 0) {
    prompt += `\n\n# SAFETY BOUNDARIES (NEVER VIOLATE)
${agent.constitutionalRules.safetyBoundaries.map(b => `- ${b}`).join('\n')}`;
  }

  // PROHIBITED BEHAVIORS section
  if (agent.constitutionalRules?.prohibitedBehaviors && agent.constitutionalRules.prohibitedBehaviors.length > 0) {
    prompt += `\n\n# PROHIBITED BEHAVIORS
${agent.constitutionalRules.prohibitedBehaviors.map(p => `- ${p}`).join('\n')}`;
  }

  // ETHICAL BOUNDARIES section
  if (agent.characterBible?.ethicalBoundaries && agent.characterBible.ethicalBoundaries.length > 0) {
    prompt += `\n\n# ETHICAL BOUNDARIES
${agent.characterBible.ethicalBoundaries.map(e => `- ${e}`).join('\n')}`;
  }

  // CAPABILITIES section
  if (agent.capabilities && agent.capabilities.length > 0) {
    prompt += `\n\n# CAPABILITIES
${agent.capabilities.map(c => `- ${c}`).join('\n')}`;
  }

  return prompt;
}

export async function getAgentSystemPrompt(agentId: number = AGENT_IDS.MANIFESTATION): Promise<string> {
  const agent = await getAgentConfigById(agentId);
  
  if (!agent) {
    return `You are an expert manifestation coach and spiritual guide. 
Your goal is to help the user align their energy and mindset to manifest their desires.
Provide practical, actionable advice, along with suggested affirmations and actions.`;
  }
  
  return buildCALMPrompt(agent);
}

// Get behavior architect system prompt for training agents
export async function getBehaviorArchitectPrompt(): Promise<string> {
  return getAgentSystemPrompt(AGENT_IDS.BEHAVIOR_ARCHITECT);
}

// Get training orchestrator system prompt
export async function getTrainingOrchestratorPrompt(): Promise<string> {
  return getAgentSystemPrompt(AGENT_IDS.TRAINING_ORCHESTRATOR);
}

// Behavioral search with micro-behavioral control
export interface BehavioralSearchOptions {
  behaviorWeight?: number;      // 0-1, how much behavior influences results
  personaConsistency?: number;  // 0-1, consistency with agent persona
  ethicsOverride?: boolean;     // Apply ethical boundaries strictly
}

export async function behavioralSearch(
  query: string, 
  options: BehavioralSearchOptions = {}
): Promise<{ query: string; enhancedQuery: string; behaviorContext: any }> {
  const {
    behaviorWeight = 0.25,
    personaConsistency = 0.9,
    ethicsOverride = true
  } = options;

  const behaviorAgent = await getAgentConfigById(AGENT_IDS.BEHAVIOR_ARCHITECT);
  
  let behaviorContext = null;
  let enhancedQuery = query;

  if (behaviorAgent) {
    // Extract behavioral context from the behavior architect
    behaviorContext = {
      personalityTraits: behaviorAgent.characterBible?.personalityTraits,
      communicationStyle: behaviorAgent.characterBible?.communicationStyle,
      ethicalBoundaries: behaviorAgent.characterBible?.ethicalBoundaries,
      safetyBoundaries: behaviorAgent.constitutionalRules?.safetyBoundaries,
      behaviorWeight,
      personaConsistency,
      ethicsOverride
    };

    // Enhance query with behavioral context
    if (behaviorAgent.characterBible?.knowledgeDomains) {
      const relevantDomains = behaviorAgent.characterBible.knowledgeDomains
        .filter(d => query.toLowerCase().includes(d.toLowerCase().split(' ')[0]))
        .slice(0, 3);
      
      if (relevantDomains.length > 0) {
        enhancedQuery = `${query} [domains: ${relevantDomains.join(', ')}]`;
      }
    }
  }

  return {
    query,
    enhancedQuery,
    behaviorContext
  };
}
