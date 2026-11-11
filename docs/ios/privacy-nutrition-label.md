# App Privacy ("nutrition label") answers — for App Store Connect

Enter these in App Store Connect → App Privacy. They match the code on `ios-capacitor` and
`ios/App/App/PrivacyInfo.xcprivacy`. Re-check if features change.

**Do you or your third-party partners collect data from this app?** Yes.
**Tracking:** No data is used to track users (no ads, no data brokers, no cross-app linking). `NSPrivacyTracking = false`.

| ASC category | ASC data type | Collected | Linked to user | Used for tracking | Purpose | Source in the app |
|---|---|---|---|---|---|---|
| Contact Info | Name | Yes | Yes | No | App Functionality | Registration, Sign in with Apple |
| Contact Info | Email Address | Yes | Yes | No | App Functionality | Registration, Sign in with Apple (may be a relay address) |
| Contact Info | Phone Number | Yes (optional) | Yes | No | App Functionality | SMS reminders opt-in |
| Health & Fitness | Health | Yes | Yes | No | App Functionality | Mood selected on journal entries / affirmation generation |
| User Content | Other User Content | Yes | Yes | No | App Functionality | Goals, affirmations, journal text, vision boards, AI chat, rituals, AI reports |
| User Content | Photos or Videos | No | — | — | — | Vision boards store image URLs or AI-generated images, not photos from the device |
| Identifiers | User ID | Yes | Yes | No | App Functionality | Account ID, Apple user identifier |
| Usage Data | Product Interaction | Yes | Yes | No | App Functionality | Streaks, ritual completions, reminder history (not analytics) |
| Diagnostics | — | No | — | — | — | No crash/analytics SDKs |
| Location, Financial, Contacts, Browsing/Search History, Sensitive Info, Purchases | — | No | — | — | — | — |

Notes for the owner:
- "Health" is the closest Apple type for self-reported mood. If you prefer, you may treat mood as part of
  "Other User Content"; the conservative choice (declare Health) is used here and in the privacy manifest.
- Third-party processors (OpenAI, Twilio) are covered by these same rows; Apple asks what is collected,
  including by partners.
- Server IP logs used only for security are generally not "collected" for the label if not linked or retained
  beyond what is needed; disclose them in the privacy policy (done in the draft).
