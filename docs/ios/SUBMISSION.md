# App Store submission checklist (Manifest, iOS)

Status: code-complete on branch `ios-capacitor`; **not yet built in Xcode** (this work was done without macOS).
Nothing is submitted to App Store Connect. Items marked **OWNER** need Joshua (see `OWNER-INPUTS.md`).

## Build facts

| Item | Value | Where |
|---|---|---|
| Shell | Capacitor 7, Swift Package Manager, iOS 14+ | `capacitor.config.ts`, `ios/App` |
| Web assets | Bundled locally from `dist/public` (no `server.url`) | `capacitor.config.ts` `webDir` |
| API | `VITE_API_BASE_URL` (HTTPS) baked in at build time | `client/src/lib/platform.ts` |
| Bundle ID | `com.joshuabarone.manifestation` (suggested; configurable via `CAP_APP_ID`, `APP_IDENTIFIER`) | `capacitor.config.ts`, pbxproj, Fastfile |
| Version / build | 1.0.0 (1) | pbxproj `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` |
| Devices | iPhone only, portrait | pbxproj `TARGETED_DEVICE_FAMILY = 1`, Info.plist |
| Team ID | **OWNER** placeholder (not committed) | Xcode / `TEAM_ID` env |
| Entitlements | Sign in with Apple | `ios/App/App/App.entitlements` |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` | in the app target's resources |
| Encryption | `ITSAppUsesNonExemptEncryption = false` (HTTPS + OS crypto only) | Info.plist |
| Icon / splash | From `attached_assets/generated_images/manifest_app_icon_moon.png` | `Assets.xcassets` |

## Guideline map

| Guideline | Risk | How it is addressed | Evidence |
|---|---|---|---|
| 2.1 App completeness | Reviewer can't sign in, or the API is unreachable | Demo account in review notes; API hosted over HTTPS; no placeholder content | `review-notes.md`, **OWNER** |
| 2.3 Accurate metadata | Screenshots must show the real app | Screenshot plan from the real build | `screenshots.md` |
| 2.5.1 Public APIs | — | Only Capacitor/official plugins | `ios/App/CapApp-SPM/Package.swift` |
| 2.5.2 No downloaded code | Remote web content | Web bundle ships inside the app; no `server.url`; service worker disabled on native | `capacitor.config.ts`, `client/index.html` |
| 4.2 Minimum functionality | "Just a website" | Local notifications for affirmation reminders scheduled on device; haptics on save/complete; offline read cache (affirmations, goals, journal, rituals) + queued journal writes; native Share sheet; native status bar, safe areas, splash; Sign in with Apple | `client/src/lib/native/*`, `components/native/ReminderSync.tsx` |
| 4.8 Login services | Third-party login (Replit) requires an equivalent privacy-focused option | Sign in with Apple offered next to email/password; Replit Auth hidden on iOS (web keeps it) | `client/src/pages/AuthPage.tsx`, `server/auth/apple.ts` |
| 5.1.1(v) Account deletion | Must delete in-app | Settings → Account → Delete account (type DELETE) → `DELETE /api/account` hard-deletes all rows in one transaction, then revokes the Apple token when Apple credentials are configured | `server/account.ts`, `tests/account-deletion.test.ts` |
| 5.1.1 Data collection / privacy policy | Policy URL required in app and in ASC | Links in Settings (`VITE_PRIVACY_POLICY_URL`, `VITE_SUPPORT_URL`); drafts provided | `privacy-policy-draft.md`, `support-page-draft.md`, **OWNER** |
| 5.1.2 Data use and sharing (third-party AI) | Content sent to OpenAI without consent | One-time consent screen before any AI feature, naming OpenAI; withdrawable in Settings; server enforces it (403 `AI_CONSENT_REQUIRED`) | `components/compliance/AiConsentDialog.tsx`, `server/ai-safety.ts` |
| 1.2 User-generated / AI content | Objectionable AI output | OpenAI moderation on inputs and outputs (fail-closed by default); "Report this response" on every AI output, stored in `ai_reports`, reviewed by admins | `server/ai-safety.ts`, `ReportResponseButton.tsx`, `AiReportsPanel.tsx` |
| 1.4.1 Physical harm (health) | Wellness app giving medical-sounding advice | Wellness disclaimer ("not medical or mental-health treatment") in onboarding and Settings; crisis resources (988, Crisis Text Line, findahelpline.com) when self-harm is detected, before the model is called | `WellnessDisclaimer.tsx`, `CrisisDialog.tsx`, `tests/safety-and-sms.test.ts` |
| 5.1.1 Admin/debug surfaces | Developer tools visible to consumers | Training dashboard and AgentForge agent/training/behavioral-search routes gated to `users.is_admin` (default false) on server (404) and client (hidden) | `server/auth/admin.ts`, `tests/admin-gate.test.ts` |
| 5.1.1 / SMS (TCPA, CTIA) | Texts without consent | Explicit opt-in checkbox with stored consent text and timestamp; STOP/START/HELP webhook; scheduler only texts consented, non-opted-out numbers | `server/sms.ts`, `server/scheduler.ts` |
| 5.1.1 Permissions | Missing purpose strings | Notification permission asked only when the user enables reminders; `NSPhotoLibraryAddUsageDescription` for the web view's "Save Image" | Info.plist |
| Privacy manifest (2024+) | Required-reason APIs | `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1) for Preferences; tracking false; collected data types listed | `PrivacyInfo.xcprivacy` |
| App Privacy label | Must match the app | See `privacy-nutrition-label.md` | **OWNER** enters in ASC |
| 3.1 Payments | — | No purchases or subscriptions in the app | — |

## Security changes made while porting (worth knowing for review and the policy)

- `/api/auth/user` no longer returns `passwordHash`; Apple refresh tokens are never sent to clients.
- The Replit template routes `/api/conversations*` and `/api/generate-image` were unauthenticated; they now require an admin.
- Ownership checks added to goals, vision boards, chat conversations and ritual completion (previously any signed-in user could act on another user's row by id).
- Server request logging no longer prints JSON response bodies (they contained user content).

## Before you press "Submit for Review" (OWNER)

1. Finish Apple Developer enrollment (individual) and register the App ID with Sign in with Apple.
2. Host the API over HTTPS with the env vars in `OWNER-INPUTS.md`, run `npm run db:push`, and create the demo account.
3. Build on a Mac (or Xcode Cloud) and test on a real iPhone: sign in (email + Apple), reminders, offline mode, share, delete account.
4. Publish the privacy policy and support page; set their URLs in the app build and in App Store Connect.
5. Fill the App Privacy questionnaire from `privacy-nutrition-label.md`; age rating questionnaire (expect 12+ because of AI chat and wellness topics; answer "Medical/Treatment Information: Infrequent/Mild" honestly).
6. Upload screenshots per `screenshots.md`; paste `review-notes.md` into App Review Information.
7. Upload with `bundle exec fastlane beta` (TestFlight) first. The release lane uploads but never submits; you submit by hand.

Not verified here: Xcode build, code signing, simulator/device run, Apple's binary validation. These need a Mac.

## Building on a Mac

```sh
npm ci
VITE_API_BASE_URL=https://<your-api-host> npm run build:web
npx cap sync ios
npx cap open ios          # Xcode: pick your Team, then Product → Archive
```

- Xcode Cloud: `ios/App/ci_scripts/ci_post_clone.sh` runs `npm ci`, the web build and `cap sync`. Set
  `VITE_API_BASE_URL` (and the other `VITE_*` values) as Xcode Cloud environment variables.
- fastlane (from `ios/App`): `bundle install`, then `bundle exec fastlane beta` (TestFlight) or
  `bundle exec fastlane release` (uploads; never submits for review). Reads `ASC_KEY_ID`, `ASC_ISSUER_ID`,
  `ASC_KEY_CONTENT`, `TEAM_ID`, `APP_IDENTIFIER`.
- GitHub Actions: `.github/workflows/ios.yml` is `workflow_dispatch` only (never runs on push/PR).
- Icons/splash were generated from the existing artwork; to regenerate, edit `resources/icon.png` /
  `resources/splash.png` and run `npm run cap:assets`.
