# Feature inventory (iOS port, K45)

Written before any iOS changes (statuses filled in at the end of the port), from `main` at `e6b600f`. Every item is checked off at the end of the port
only after confirming it still exists and works the same way (or is intentionally gated, with the reason).
Legend: `[x]` kept and verified in code · `[A]` kept, gated to admins (`users.is_admin`) · `[W]` kept, web only.

## Pages (client/src/pages, routes in App.tsx)

| Status | Route | Page | Notes |
|---|---|---|---|
| [x] | `/` (signed out) | Landing | Marketing + sign-in entry |
| [x] | `/` (signed in) | Dashboard | Streak card, quick actions, recent goals/affirmations |
| [x] | `/auth` | AuthPage | Email/password login + register, Replit sign-in button |
| [x] | `/goals` | Goals | CRUD, milestones, progress, belief level, evidence notes |
| [x] | `/affirmations` | Affirmations | List, save, AI generate, copy |
| [x] | `/journal` | Journal | List + create with mood + manifestation focus |
| [x] | `/vision-board` | VisionBoard | List + create boards |
| [x] | `/vision-board/:id` | VisionBoardDetail | Images, add by URL, AI image generation |
| [x] | `/chat` | ManifestationChat | AI advice (AgentForge persona), conversation history, save to affirmations/journal |
| [x] | `/rituals` | Rituals | Morning/evening/33x3 rituals, completion, streaks |
| [x] | `/settings` | Settings | Reminder enable/time/timezone/delivery method (app/SMS), phone number |
| [A] | `/training` | Training | AgentForge agent list, training suite, recommendations |
| [x] | `*` | not-found | 404 |
| [W] | — | InstallPrompt | PWA "Add to Home Screen" prompt (web); hidden in the iOS app, where it makes no sense |

## API routes (54 handlers)

### server/index.ts
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/health` |
| [x] | GET | `/_health` |

### Auth (server/replit_integrations/auth)
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/auth/user` |
| [x] | POST | `/api/auth/register` |
| [x] | POST | `/api/auth/login` |
| [x] | POST | `/api/auth/logout` |
| [W] | GET | `/api/login` (Replit OIDC) |
| [W] | GET | `/api/callback` (Replit OIDC) |
| [W] | GET | `/api/logout` (Replit OIDC) |

### Goals / affirmations / journal
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/goals` |
| [x] | POST | `/api/goals` |
| [x] | PATCH | `/api/goals/:id` |
| [x] | DELETE | `/api/goals/:id` |
| [x] | GET | `/api/affirmations` |
| [x] | POST | `/api/affirmations` |
| [x] | POST | `/api/affirmations/generate` (AI) |
| [x] | GET | `/api/journal` |
| [x] | POST | `/api/journal` |

### Vision boards
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/vision-boards` |
| [x] | GET | `/api/vision-boards/:id` |
| [x] | POST | `/api/vision-boards` |
| [x] | POST | `/api/vision-boards/:id/images` |
| [x] | POST | `/api/vision-boards/generate-image` (AI) |

### AI advice + AgentForge
| Status | Method | Path |
|---|---|---|
| [x] | POST | `/api/manifestation/advice` (AI, AgentForge persona) |
| [x] | GET | `/api/agent-config` |
| [A] | POST | `/api/agent-config/refresh` |
| [A] | GET | `/api/agents` |
| [A] | GET | `/api/agents/:id` |
| [A] | POST | `/api/agents/refresh-all` |
| [A] | POST | `/api/behavioral-search` |
| [A] | POST | `/api/training/test` |
| [A] | POST | `/api/training/suite` |
| [A] | POST | `/api/training/recommendations` |

### Reminders
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/reminders/settings` |
| [x] | PUT | `/api/reminders/settings` |
| [x] | POST | `/api/reminders/send-sms` |
| [x] | — | Background SMS scheduler (server/scheduler.ts) |

### Chat history
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/chat/conversations` |
| [x] | GET | `/api/chat/conversations/:id` |
| [x] | POST | `/api/chat/conversations` |
| [x] | POST | `/api/chat/conversations/:id/messages` |
| [x] | GET | `/api/chat/conversations/:id/messages` (paginated) |
| [x] | DELETE | `/api/chat/conversations/:id` |

### Streaks + rituals
| Status | Method | Path |
|---|---|---|
| [x] | GET | `/api/streaks` |
| [x] | POST | `/api/streaks/:type` |
| [x] | GET | `/api/rituals` |
| [x] | POST | `/api/rituals` |
| [x] | POST | `/api/rituals/:id/complete` |
| [x] | GET | `/api/rituals/:id/completions` |

### Replit integration templates (not called by the client)
| Status | Method | Path |
|---|---|---|
| [A] | GET | `/api/conversations` |
| [A] | GET | `/api/conversations/:id` |
| [A] | POST | `/api/conversations` |
| [A] | DELETE | `/api/conversations/:id` |
| [A] | POST | `/api/conversations/:id/messages` (streaming AI) |
| [A] | POST | `/api/generate-image` (AI) |


## Verification (end of port)

- **All 54 API handlers still exist.** `tests/route-inventory.test.ts` parses this file and asserts every
  method + path above is still registered by the real server (52 in `registerRoutes`, plus the 2 health checks
  in `server/index.ts`). It passes.
- **All 14 pages/components still exist** in `client/src/App.tsx` / `client/src/pages`. Nothing was removed.
- `[A]` items: kept, but only for `users.is_admin = true` (server answers 404 to others; the client hides the
  links and the `/training` route). The Replit template routes were previously **unauthenticated**.
  `GET /api/agent-config` (the AgentForge persona the chat uses) stays available to every signed-in user, and the
  AgentForge agent config still drives `/api/manifestation/advice`.
- `[W]` items: Replit Auth (`/api/login`, `/api/callback`, `/api/logout`) and the PWA install prompt stay on the
  website and are hidden in the iOS app (Guideline 4.8 / not applicable on iOS).
- Behavior changes, by design: AI routes need one-time consent and pass moderation; SMS needs explicit consent;
  users can only act on their own rows (IDOR fix).

## Added for iOS

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/refresh` | Rotate the iOS refresh token (reuse revokes the family) |
| POST | `/api/auth/apple` | Sign in with Apple (identity token verified against Apple JWKS + nonce) |
| DELETE | `/api/account` | In-app account deletion (all rows + Apple token revocation) |
| GET / POST | `/api/ai/consent` | One-time AI data-sharing consent |
| POST | `/api/ai/reports` | "Report this response" |
| GET | `/api/admin/ai-reports` | Admin moderation queue (Training page) |
| PATCH | `/api/admin/ai-reports/:id` | Mark a report reviewed |
| POST | `/api/sms/inbound` | Twilio STOP/START/HELP webhook |
