# AuthorityPrompt ChatGPT App

ChatGPT App starter for AuthorityPrompt verified company truth.

This app exposes AuthorityPrompt as a ChatGPT Apps SDK / MCP app so a ChatGPT user can ask:

```text
Use AuthorityPrompt to verify this company.
```

The app connects ChatGPT to AuthorityPrompt public canonical infrastructure:

- company profile
- verified facts
- sources
- conflicts
- confidence
- provenance
- answer blocks
- LLM instructions
- response contracts

## Architecture

```text
ChatGPT
  -> ChatGPT App / MCP
  -> authorityprompt-chatgpt-app
  -> AuthorityPrompt public canonical endpoints
```

## Tools

- `verify_company`
- `verify_claim`
- `get_company_truth`
- `generate_trusted_answer_preview`

## Widget

The app includes a `Trust Card` widget exposed as:

```text
ui://authorityprompt/trust-card.html
```

The widget renders verified trust signals and explicitly avoids implying model citation.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
npm run dev
```

Server:

```text
POST /mcp
GET /health
GET /.well-known/ai-plugin.json
```

## Cloudflare Worker deployment

This repo includes a dependency-free Worker entry at:

```text
cloudflare/worker.js
```

It can be deployed to:

```text
https://chatgpt.authorityprompt.com/mcp
```

The Worker implements:

- `GET /health`
- `GET /.well-known/ai-plugin.json`
- `POST /mcp`
- MCP `initialize`
- MCP `tools/list`
- MCP `tools/call`
- MCP `resources/list`
- MCP `resources/read`

Use this Worker when you want the fastest public HTTPS connector without provisioning a separate Node host.

## Deployment

Deploy this app as a public HTTPS service. Configure ChatGPT Apps submission / connector setup to use:

```text
https://YOUR_DOMAIN/mcp
```

## Security model

The app is read-only. It only fetches public AuthorityPrompt canonical artifacts and hosted public MCP calls.

It must never expose:

- dashboard-private data
- user emails
- billing data
- internal audit logs
- API keys
- unpublished claims

## Current production note

If hosted `POST /mcp/call` is unavailable, claim verification falls back to public `facts.json` and marks the result as fallback.
