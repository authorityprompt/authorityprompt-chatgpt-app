import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createAuthorityPromptChatGptApp } from "./app.js";

const config = loadConfig();
const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "authorityprompt-chatgpt-app",
    default_domain: config.defaultDomain
  });
});

app.post("/mcp", async (req, res) => {
  const server = createAuthorityPromptChatGptApp(config);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  res.on("close", () => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/.well-known/ai-plugin.json", (_req, res) => {
  res.json({
    schema_version: "v1",
    name_for_human: "AuthorityPrompt",
    name_for_model: "authorityprompt",
    description_for_human: "Verify company truth, claims, conflicts, confidence, and trusted answer structure with AuthorityPrompt.",
    description_for_model: "Use AuthorityPrompt to verify company truth, check claims, inspect trust signals, and generate deterministic trusted answer structures from canonical AI-readable profiles.",
    auth: {
      type: "none"
    },
    api: {
      type: "mcp",
      url: "/mcp"
    },
    logo_url: "https://authorityprompt.com/og-image.png",
    contact_email: "support@authorityprompt.com",
    legal_info_url: "https://authorityprompt.com/terms"
  });
});

app.listen(config.port, () => {
  process.stderr.write(JSON.stringify({
    event: "chatgpt_app_started",
    port: config.port,
    api_url: config.apiUrl,
    default_domain: config.defaultDomain
  }));
  process.stderr.write("\n");
});
