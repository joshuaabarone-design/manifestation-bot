# Manifestation Bot App

## Overview
A manifestation-focused wellness app that helps users set and achieve their goals through AI-powered affirmations, journaling, vision boards, and personalized advice.

## Project State
- Full-stack app with React frontend and Express backend
- Dual authentication: Replit Auth OR email/password login
- Uses OpenAI AI Integrations for AI features (no user API key needed)
- PostgreSQL database for data persistence
- PWA-enabled for mobile installation

## Key Features
- **Dashboard**: Overview of goals, streak tracking, recent affirmations, journal entries
- **Goals**: Create and track manifestation goals with progress tracking, milestones, belief levels
- **Affirmations**: Generate and save AI-powered affirmations
- **Journal**: Document your manifestation journey with mood tracking
- **Vision Boards**: Create boards with AI-generated images
- **Manifestation Chat**: Get personalized advice from AI coach with chat history persistence
- **Daily Rituals**: Guided morning/evening rituals and 33x3 manifestation method
- **Streak Tracking**: Track daily streaks for affirmations, journaling, meditation
- **Training Dashboard**: Evaluate and improve the AI coach with training metrics and recommendations
- **Settings**: Configure daily affirmation reminders (in-app)

## User Preferences
- Dark mystical theme with purples, golds, and deep blues
- Mobile-first responsive design with iPhone support
- PWA installability ("Add to Home Screen")

## Project Architecture
```
client/
  src/
    pages/        - React pages (Dashboard, Goals, Affirmations, etc.)
    components/   - Reusable components (Layout, Sidebar, MobileNav)
    hooks/        - Custom hooks (use-auth, use-toast)
    lib/          - Utilities (queryClient, utils)
  public/
    manifest.json - PWA manifest
    sw.js         - Service worker
server/
  routes.ts       - API endpoints
  storage.ts      - Database operations
  db.ts           - Database connection
shared/
  schema.ts       - Drizzle database schema
  routes.ts       - API contract definitions
```

## Recent Changes
- Added goal progress tracking: milestones, progress percentage (0-100%), belief level (0-100 stored, displayed as 1-10), evidence notes
- Chat history persistence: conversations and messages stored in database with pagination support
- Message pagination: `GET /api/chat/conversations/:id/messages?limit=50&offset=0` for improved chat performance
- Streak tracking: tracks affirmation, journal, meditation streaks with longest streak records
- Daily rituals page: guided morning/evening rituals and 33x3 manifestation method
- Dashboard streak card showing all streak types with totals
- Added email/password authentication for users without Replit accounts
- In-app reminder system (user declined SendGrid/Twilio integrations)

## AgentForge Integration (CALM Framework)
- The AI coach loads its personality and capabilities from AgentForge object storage
- Base URL: `https://2c3035d7-d662-4049-945d-8792c12b7c65-00-2422uhh2w3n9i.picard.replit.dev/api/agents`
- Agent config is cached for 5 minutes to reduce API calls

### Registered Agents
| Agent | ID | App Link ID | Purpose |
|-------|-----|-------------|---------|
| Manifestation Agent | 22 | - | Main manifestation coach |
| CALM Behavior Architect | 23 | 16 | Behavioral AI framework |
| Training Orchestrator | 26 | 17 | Agent training workflows |

### API Endpoints
- `GET /api/agents` - List all registered agents with status
- `GET /api/agents/:id` - Get specific agent with full CALM config
- `POST /api/agents/refresh-all` - Refresh all agents from AgentForge
- `POST /api/agent-config/refresh` - Refresh specific agent (body: { agentId })
- `POST /api/behavioral-search` - Behavioral search with micro-behavioral control

### CALM Behavioral AI Implementation
The system prompt is built using the full CALM framework:
- **Identity**: Agent name and core identity from characterBible
- **Personality**: Big Five traits (openness, conscientiousness, extraversion, agreeableness, neuroticism)
- **Communication Style**: Tone, formality, and verbosity settings
- **Constitutional Rules**: Behavioral rules with priority levels (critical, important, etc.)
- **Safety Boundaries**: Hard limits the agent must never violate
- **Prohibited Behaviors**: Explicit list of forbidden actions
- **Ethical Boundaries**: Moral guidelines from character bible
- **Capabilities**: What the agent can do

### Behavioral Search
```javascript
// Use behavioral search with micro-behavioral control
const result = await fetch('/api/behavioral-search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'manifest abundance mindset',
    options: {
      behaviorWeight: 0.25,      // 0-1, how much behavior influences results
      personaConsistency: 0.9,   // 0-1, consistency with agent persona
      ethicsOverride: true       // Apply ethical boundaries strictly
    }
  })
});
```

### Agent Training System
The background agents (Behavior Architect + Training Orchestrator) train the Manifestation Agent to statistically acceptable levels:

**Training Endpoints:**
- `POST /api/training/test` - Run single training test with custom prompt
- `POST /api/training/suite` - Run full training suite (5 test prompts)
- `POST /api/training/recommendations` - Get improvement recommendations from Training Orchestrator

**Training Metrics (Thresholds):**
- Personality Drift: 85%+ consistency with Big Five traits
- Factual Accuracy: 90%+ accuracy target
- Response Consistency: 85%+ consistency across prompts
- Behavioral Compliance: 95%+ adherence to constitutional rules

**Usage:**
```javascript
// Run training suite
const { results, summary } = await fetch('/api/training/suite', {
  method: 'POST',
  body: JSON.stringify({ agentId: 22 })
}).then(r => r.json());

// Get recommendations if below threshold
if (summary.averageScore < 0.85) {
  const { recommendations } = await fetch('/api/training/recommendations', {
    method: 'POST',
    body: JSON.stringify({ results })
  }).then(r => r.json());
}
```

See `server/agent-training.ts` for the full implementation.

## Notes for Future Development
- **Email/SMS Reminders**: User declined SendGrid and Twilio integrations. To add external notification delivery later, either:
  1. Prompt user to complete the integration setup
  2. Ask user to provide their own API keys (SENDGRID_API_KEY or TWILIO credentials)
- The current reminder system is in-app only - it shows affirmations when users open the app around their scheduled time
