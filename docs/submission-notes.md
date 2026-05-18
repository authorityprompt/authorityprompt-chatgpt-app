# ChatGPT App Submission Notes

## Positioning

AuthorityPrompt verifies company truth for AI systems.

Suggested user-facing description:

> Verify company truth, claims, conflicts, confidence, and trusted answer structure using AuthorityPrompt canonical AI-readable profiles.

## Primary user prompts

```text
Use AuthorityPrompt to verify authorityprompt.com.
```

```text
Use AuthorityPrompt to check whether this claim is supported.
```

```text
Generate a trusted answer preview using AuthorityPrompt.
```

## Safety language

Do not claim that crawler access proves model ingestion or citation.

Correct:

> AuthorityPrompt provides verified AI-readable company truth and response contracts. Model citation confirmation is tracked separately.

Incorrect:

> OpenAI already uses this data.

## Required deployment checks

- Public HTTPS endpoint is available.
- `POST /mcp` accepts MCP requests.
- Widget resource returns `text/html+skybridge`.
- Tools return structured content.
- No private dashboard data is exposed.
