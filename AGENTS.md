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
- Keep the requested single-scroll marketing experience at the index route with semantic hash anchors; its public sections intentionally share one page.
- Isolate marketing, diagnostic, product-preview, agents, pricing, comparison and shared modules under src/features to prepare independent SaaS evolution.
- Store agent and plan definitions in typed configuration; new agents and checkout destinations must not require rewriting presentation logic.
- Keep diagnostic questions, weights, score classification and recommendations separate from UI; scores measure operational maturity with normalized category averages, while volume acts as workload context and preference answers guide recommendations.
- Diagnostic results and optional report downloads are browser-local with no persistence or delivery service; this keeps the requested phase free of backend connections.
- Express brand presentation through semantic CSS tokens and shared Button variants for consistent theming.
- Render brand applications through the shared raster-asset Brand component; compact applications and local browser icons isolate the intact supplied symbol, while full applications retain the original artwork on a contrast surface, preventing logo reconstruction or distortion.
