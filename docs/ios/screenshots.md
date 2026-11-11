# Screenshot plan

App Store Connect needs iPhone screenshots only (the app is iPhone-only, `TARGETED_DEVICE_FAMILY = 1`;
on iPad it runs in iPhone compatibility mode and no iPad screenshots are required).

| Display | Device to capture on (Simulator) | Portrait size (px) | Required |
|---|---|---|---|
| 6.9" | iPhone 16 Pro Max / 17 Pro Max | 1320 × 2868 | Yes (primary; ASC scales it down for smaller iPhones) |
| 6.5" | iPhone 11 Pro Max / XS Max | 1242 × 2688 (or 1284 × 2778 on 12–14 Pro Max) | Provide if ASC asks; recommended |

Use 3 to 10 screenshots per size, PNG or JPEG, no alpha, status bar visible, no device frames required.
Capture from the real build with the demo account and sample data that contains nothing personal.

## Shot list (in order)

1. **Dashboard** — streak card and today's quick actions. Caption idea: "Build your daily manifestation habit."
2. **Affirmations** — a few saved affirmations, the Generate button, and the Share action visible.
3. **AI coach chat** — a short, positive exchange with the "Report" control visible under the reply.
4. **Vision board** — a board with several images.
5. **Journal** — an entry with a mood chip.
6. **Rituals** — morning ritual with completion check and streak.
7. **Settings → Reminders** — on-device reminder time, with the wellness disclaimer visible.
8. (Optional) **Sign in** screen with Sign in with Apple.

Rules: show only what the app really does (2.3.3); do not show the Training/admin screens; do not imply
medical treatment in captions; keep the AI consent screen out of the marketing set (it can be shown in
the App Preview video if you make one).

Capture commands on a Mac:
`xcrun simctl io booted screenshot shot-01.png` (Simulator set to the device in the table).
