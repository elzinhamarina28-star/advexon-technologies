<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Meter agent requests through owner-bound atomic database reservations before provider calls; only server completion can store replies or release failed usage, preventing duplicate counting and quota bypass.
- The PWA uses network-only navigation and API access with only a static offline notice cached; private account data must never enter service-worker caches.
- Kiwify sales webhooks use shared server-only processing at the requested route and a public-prefix alias; authenticate before service access and transact order-scoped deduplication, verified-email association and subscription transitions in a service-only database function, so retries cannot grant access twice or override terminal events.
- Normalize authentication provider errors and form validation through a shared client-safe module, with generic account-existence responses and accessible custom validation, to avoid leaking technical errors or browser-language messages.
- Resolve effective entitlements through an authenticated database function: service-managed internal test accounts override only their own test plan, never real subscriptions; test plan changes bind to auth.uid() so normal users cannot self-enroll or change another account.
- Enforce paid operational access with restrictive owner-compatible database policies and authenticated agent handlers, so browser-only controls cannot unlock paid features.
- Public /previa uses a dedicated operational preview with shared presentation primitives and browser-local Diagnostic; it never mounts live agent chats or authenticated data pages. The marketing Dashboard stays untouched to preserve the frozen landing.
- Operational preview records are isolated fixtures; authenticated views share only presentation primitives, deriving all indicators and records from the existing user queries.
- Keep the requested single-scroll marketing experience at the index route with semantic hash anchors; its public sections intentionally share one page.
- Isolate marketing, diagnostic, product-preview, agents, pricing, comparison and shared modules under src/features to prepare independent SaaS evolution.
- Store agent and plan definitions in typed configuration; new agents and checkout destinations must not require rewriting presentation logic.
- Keep diagnostic questions, weights, score classification and recommendations separate from UI; scores measure operational maturity with normalized category averages, while volume acts as workload context and preference answers guide recommendations.
- Public diagnostic results stay browser-local; authenticated diagnostic views read and save owner-scoped database answers and use per-user draft storage, never a shared anonymous draft as another account's result.
- Express brand presentation through semantic CSS tokens and shared Button variants for consistent theming.
- Render all brand applications through shared Brand asset pointers; compact applications and browser icons use the same emblem, while full applications use the complete logo. Keep provisional recreation replaceable through these pointers without changing presentation or data identifiers.
- Athena playground lives at /athena; model calls go through a server function to the Gemini API (GEMINI_API_KEY) so the provider key stays server-side, and chat history is sessionStorage-only.
- The client dashboard (/painel) derives its score only from the browser-local diagnostic session and shows labeled demo data otherwise; no persistence until auth/database exist.

- Build executive diagnostic analysis in a browser-safe module separate from score and UI; preserve score arithmetic and preview rendering, and distinguish missing evidence from scored unknown options.
