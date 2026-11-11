# What Joshua needs to provide

Everything below is a placeholder in the repo today. **Never commit any of these values** — the repo is
public. Put secrets in the hosting provider's secret store, Xcode Cloud environment variables, or GitHub
Actions secrets.

## Apple Developer enrollment — individual (decided)

You are enrolling as an **individual**, so the seller name on the App Store will be **Joshua Barone**
(your legal name). Enroll yourself at developer.apple.com ($99/year); no one else should create the account.

> Individual vs organization: an **organization** enrollment needs a legal entity and a **D-U-N-S number**,
> and the App Store shows the **organization's legal name** as the seller. An **individual** enrollment
> needs no D-U-N-S number and shows **your personal name**. You can later migrate an individual account to
> an organization through Apple Support if you form a company.

## Apple values (after enrollment)

| Input | Placeholder now | Where it goes |
|---|---|---|
| Team ID (10 chars) | none committed | Xcode → Signing & Capabilities, `TEAM_ID` (fastlane), `APPLE_TEAM_ID` (server) |
| Bundle ID | `com.joshuabarone.manifestation` (suggested) | Register the App ID with **Sign in with Apple**. If you pick another, set `CAP_APP_ID`, `APP_IDENTIFIER`, `APPLE_BUNDLE_ID`, `VITE_APPLE_BUNDLE_ID` and change it in Xcode |
| App Store Connect app record | not created | Create it yourself; name "Manifest" (or your choice), SKU of your choice, primary language English |
| SIWA Services ID (web only, optional) | none | Only if you want Sign in with Apple on the website: `APPLE_SERVICES_ID` (server), `VITE_APPLE_SERVICES_ID` (web build), plus the web domain + return URL in the Apple portal |
| SIWA key (.p8) + Key ID | none | Server env `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (PEM contents; `\n` escapes are accepted). Needed to revoke Apple tokens on account deletion |
| App Store Connect API key | none | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` (fastlane / GitHub secrets). Role: App Manager |

## Backend (hosted API, HTTPS)

| Env var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres. Run `npm run db:push` once to add the new columns/tables (`is_admin`, `apple_sub`, `refresh_tokens`, `ai_reports`, SMS consent fields, `journal_entries.client_id`) |
| `SESSION_SECRET` | Yes | Web cookie sessions |
| `JWT_SECRET` | Yes | ≥ 32 random characters; signs iOS access tokens (falls back to `SESSION_SECRET` if unset — set its own value) |
| `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` | Yes | Existing OpenAI settings |
| `OPENAI_MODERATION_API_KEY`, `OPENAI_MODERATION_BASE_URL` | If the AI proxy above has no `/moderations` endpoint | A direct OpenAI key for moderation |
| `MODERATION_FAIL_MODE` | Optional | `closed` (default: block AI when moderation is down) or `open` |
| `APPLE_BUNDLE_ID` | Yes (for SIWA) | Accepted identity-token audience |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Recommended | Enables Apple token revocation on account deletion |
| `APPLE_SERVICES_ID` | Optional | Web Sign in with Apple |
| `WEB_ORIGIN`, `CORS_ORIGINS` | Yes if the web app is on another origin | `capacitor://localhost` is always allowed |
| `AGENTFORGE_BASE_URL` | Recommended | Your AgentForge API base. If unset, the old picard.replit.dev URL is used, and if that is down the app falls back to its built-in prompt |
| `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET` (or `TWILIO_AUTH_TOKEN`), `TWILIO_FROM_NUMBER` | For SMS | Replit's Twilio connector still works as a fallback on Replit |
| `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL` | For STOP handling | Set the Twilio number's "A message comes in" webhook to `https://<api-host>/api/sms/inbound`; `TWILIO_WEBHOOK_URL` must equal that URL for signature checks |
| `REPL_ID` | Web only | Keeps Replit Auth on the website; without it Replit login redirects to `/auth` |

## iOS build (Xcode Cloud env vars or fastlane)

| Env var | Notes |
|---|---|
| `VITE_API_BASE_URL` | Required, e.g. `https://api.yourdomain` (the build script refuses to run without it) |
| `VITE_PRIVACY_POLICY_URL`, `VITE_SUPPORT_URL` | Public URLs of the approved drafts |
| `VITE_APPLE_BUNDLE_ID` | Same as the bundle ID |
| `VITE_APPLE_SERVICES_ID` | Only for web SIWA |

## Content and accounts

1. **Approve and publish** `privacy-policy-draft.md` and `support-page-draft.md` (fill the contact email,
   hosting provider, retention periods). Controller: Joshua Barone, individual.
2. **Contact email** for the policy, support page and App Review.
3. **Demo account** for App Review: create it on the production API with sample data and AI consent given;
   enter the credentials only in App Store Connect.
4. **Admin access**: set yourself as admin with SQL — `UPDATE users SET is_admin = true WHERE email = '<you>';`
   (never the demo account).
5. **Screenshots** per `screenshots.md`, captured on a Mac.
6. **Age rating** and **App Privacy** questionnaires in App Store Connect (`privacy-nutrition-label.md`).
7. A **Mac with Xcode 16+** (or Xcode Cloud) to build, sign and test on a device. Not possible from here.

## Known limits to decide on

- Fonts load from Google Fonts; offline, the app falls back to system fonts. Bundle them later if you want.
- There is no self-service password reset (unchanged from the web app).
- After sign-out, an already-issued access token stays valid until it expires (at most 15 minutes); the
  refresh token is revoked at once. Deleted accounts are rejected immediately.
