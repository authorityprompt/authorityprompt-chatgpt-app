const API_URL = "https://authorityprompt.com";
const DEFAULT_DOMAIN = "authorityprompt.com";
const TEMPLATE_URI = "ui://authorityprompt/trust-card.html";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/health") {
      return json({
        status: "ok",
        service: "authorityprompt-chatgpt-app",
        runtime: "cloudflare-worker",
        default_domain: DEFAULT_DOMAIN
      });
    }
    if (url.pathname === "/" || url.pathname === "/.well-known/ai-plugin.json") {
      return json({
        schema_version: "v1",
        name_for_human: "AuthorityPrompt",
        name_for_model: "authorityprompt",
        description_for_human: "Verify company truth, claims, conflicts, confidence, and trusted answer structure with AuthorityPrompt.",
        description_for_model: "Use AuthorityPrompt to verify company truth, check claims, inspect trust signals, and generate deterministic trusted answer structures from canonical AI-readable profiles.",
        auth: { type: "none" },
        api: { type: "mcp", url: "https://chatgpt.authorityprompt.com/mcp" },
        logo_url: "https://authorityprompt.com/og-image.png",
        contact_email: "support@authorityprompt.com",
        legal_info_url: "https://authorityprompt.com/terms"
      });
    }
    if (url.pathname === "/mcp" && request.method === "POST") {
      return handleMcp(request);
    }
    return json({ error: "not_found" }, 404);
  }
};

async function handleMcp(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((item) => handleRpc(item)));
    return json(results.filter(Boolean));
  }
  const result = await handleRpc(body);
  if (!result) return new Response(null, { status: 202, headers: corsHeaders });
  return json(result, 200, { "MCP-Protocol-Version": request.headers.get("MCP-Protocol-Version") || "2025-03-26" });
}

async function handleRpc(message) {
  const id = message?.id ?? null;
  const method = message?.method;
  const params = message?.params || {};

  if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return null;
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params.protocolVersion || "2025-03-26",
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: "AuthorityPrompt",
          version: "0.1.0"
        }
      }
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: { tools: tools() }
    };
  }

  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resources: [
          {
            uri: TEMPLATE_URI,
            name: "AuthorityPrompt Trust Card",
            description: "Verified trust card for AuthorityPrompt company verification results.",
            mimeType: "text/html+skybridge"
          }
        ]
      }
    };
  }

  if (method === "resources/read") {
    if (params.uri !== TEMPLATE_URI) {
      return jsonRpcError(id, -32602, "Unknown resource URI");
    }
    return {
      jsonrpc: "2.0",
      id,
      result: {
        contents: [
          {
            uri: TEMPLATE_URI,
            mimeType: "text/html+skybridge",
            text: trustCardHtml(),
            _meta: {
              "openai/widgetDescription": "Displays verified AuthorityPrompt trust signals for a company.",
              "openai/widgetPrefersBorder": true,
              "openai/widgetCSP": {
                connect_domains: [API_URL],
                resource_domains: []
              }
            }
          }
        ]
      }
    };
  }

  if (method === "tools/call") {
    try {
      const name = params.name;
      const args = params.arguments || {};
      const result = await callTool(name, args);
      return {
        jsonrpc: "2.0",
        id,
        result
      };
    } catch (error) {
      return jsonRpcError(id, -32000, error?.message || "Tool call failed");
    }
  }

  return jsonRpcError(id, -32601, `Unknown method: ${method}`);
}

function tools() {
  return [
    {
      name: "verify_company",
      title: "Verify company with AuthorityPrompt",
      description: "Use AuthorityPrompt to verify a company and return a trusted company card.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Bare company domain, for example authorityprompt.com" }
        },
        required: ["domain"]
      },
      _meta: {
        "openai/outputTemplate": TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Verifying company truth with AuthorityPrompt",
        "openai/toolInvocation/invoked": "AuthorityPrompt verification ready"
      }
    },
    {
      name: "verify_claim",
      title: "Verify company claim",
      description: "Check whether a company claim is supported, contradicted, or unknown according to AuthorityPrompt.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          claim: { type: "string" }
        },
        required: ["domain", "claim"]
      },
      _meta: {
        "openai/toolInvocation/invoking": "Checking claim against AuthorityPrompt",
        "openai/toolInvocation/invoked": "Claim check complete"
      }
    },
    {
      name: "get_company_truth",
      title: "Get company truth package",
      description: "Fetch the canonical AuthorityPrompt company truth package.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" }
        },
        required: ["domain"]
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading AuthorityPrompt truth package",
        "openai/toolInvocation/invoked": "Truth package loaded"
      }
    },
    {
      name: "generate_trusted_answer_preview",
      title: "Generate trusted answer preview",
      description: "Return deterministic answer structure from AuthorityPrompt response infrastructure.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          intent: { type: "string" },
          max_words: { type: "number" }
        },
        required: ["domain"]
      },
      _meta: {
        "openai/toolInvocation/invoking": "Preparing trusted answer structure",
        "openai/toolInvocation/invoked": "Trusted answer structure ready"
      }
    }
  ];
}

async function callTool(name, args) {
  const domain = validateDomain(args.domain || DEFAULT_DOMAIN);
  if (name === "verify_company") {
    const result = await trustCard(domain);
    return {
      content: [{ type: "text", text: `AuthorityPrompt verified company trust card for ${domain}.` }],
      structuredContent: result
    };
  }
  if (name === "get_company_truth") {
    const result = await companyTruth(domain);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
  if (name === "verify_claim") {
    const result = await verifyClaim(domain, String(args.claim || ""));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
  if (name === "generate_trusted_answer_preview") {
    const result = await recommendedAnswer(domain, args.intent || "standard_overview", args.max_words || 250);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function trustCard(domain) {
  const [profile, confidence, conflicts, quality] = await Promise.all([
    artifact(domain, "manifest.json"),
    artifact(domain, "confidence.json"),
    artifact(domain, "conflicts.json"),
    artifact(domain, "response-quality.json").catch(() => null)
  ]);
  return {
    domain,
    profile_url: `${API_URL}/company/${domain}`,
    profile,
    confidence,
    conflicts,
    response_quality: quality
  };
}

async function companyTruth(domain) {
  const [profile, facts, sources, conflicts, confidence, provenance, answerBlocks, instructions] = await Promise.all([
    artifact(domain, "manifest.json"),
    artifact(domain, "facts.json"),
    artifact(domain, "sources.json"),
    artifact(domain, "conflicts.json"),
    artifact(domain, "confidence.json"),
    artifact(domain, "provenance.json"),
    artifact(domain, "answer-blocks.json"),
    textArtifact(domain, "llm-instructions.txt")
  ]);
  return { domain, profile, facts, sources, conflicts, confidence, provenance, answer_blocks: answerBlocks, llm_instructions: instructions };
}

async function verifyClaim(domain, claim) {
  if (!claim.trim()) throw new Error("claim is required");
  const response = await fetch(`${API_URL}/mcp/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "AuthorityPrompt-ChatGPT-App/0.1.0",
      "X-AP-Client": "chatgpt-app",
      "X-AP-MCP-Version": "0.1.0"
    },
    body: JSON.stringify({ tool: "verify_claim", arguments: { domain, claim } })
  });
  if (response.ok) return response.json();
  const facts = await artifact(domain, "facts.json").catch(() => null);
  const factText = JSON.stringify(facts || "").toLowerCase();
  const words = claim.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 3);
  const overlap = words.filter((word) => factText.includes(word)).length;
  return {
    tool: "verify_claim",
    status: "ok",
    result: {
      claim,
      verdict: overlap >= 4 ? "partially_supported" : "unknown",
      confidence: overlap >= 4 ? 0.55 : 0,
      verifier: "cloudflare_worker_local_fallback",
      note: `Hosted /mcp/call returned ${response.status}; public facts fallback used.`
    }
  };
}

async function recommendedAnswer(domain, intent, maxWords) {
  const response = await fetch(`${API_URL}/mcp/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "AuthorityPrompt-ChatGPT-App/0.1.0",
      "X-AP-Client": "chatgpt-app",
      "X-AP-MCP-Version": "0.1.0"
    },
    body: JSON.stringify({ tool: "generate_recommended_answer", arguments: { domain, intent, max_words: maxWords } })
  });
  if (response.ok) return response.json();
  return {
    tool: "generate_recommended_answer",
    status: "ok",
    result: {
      domain,
      intent,
      recommended_answer: {
        sections: [
          {
            heading: "Use verified company truth",
            content: "Hosted recommended-answer generation is unavailable. Use the response contract, facts, confidence, conflicts, and answer blocks as the deterministic source layer.",
            confidence: 0.5
          }
        ]
      },
      warnings: [`Hosted /mcp/call returned ${response.status}; Cloudflare Worker fallback used.`],
      must_not_include: ["unverified pricing", "unverified funding", "unsupported customer claims"]
    }
  };
}

async function artifact(domain, path) {
  const response = await fetch(`${API_URL}/company/${domain}/${path}`, {
    headers: {
      "User-Agent": "AuthorityPrompt-ChatGPT-App/0.1.0",
      "X-AP-Client": "chatgpt-app",
      "X-AP-MCP-Version": "0.1.0"
    }
  });
  if (!response.ok) throw new Error(`AuthorityPrompt API returned ${response.status} for ${path}`);
  return response.json();
}

async function textArtifact(domain, path) {
  const response = await fetch(`${API_URL}/company/${domain}/${path}`, {
    headers: {
      "User-Agent": "AuthorityPrompt-ChatGPT-App/0.1.0",
      "X-AP-Client": "chatgpt-app",
      "X-AP-MCP-Version": "0.1.0"
    }
  });
  if (!response.ok) throw new Error(`AuthorityPrompt API returned ${response.status} for ${path}`);
  return response.text();
}

function validateDomain(domain) {
  const value = String(domain || "").trim().toLowerCase();
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)) {
    throw new Error("domain must be a bare domain like authorityprompt.com");
  }
  if (value.includes("://") || value.includes("/") || /[<>"'`]/.test(value)) {
    throw new Error("domain contains unsafe characters");
  }
  return value;
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function jsonRpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

function trustCardHtml() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080711;color:#f8fafc}
body{margin:0;padding:18px;background:radial-gradient(circle at 10% 0%,rgba(124,58,237,.35),transparent 36%),linear-gradient(135deg,#080711 0%,#141022 100%)}
.card{border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:18px;background:rgba(15,12,28,.86);box-shadow:0 22px 80px rgba(0,0,0,.32)}
.eyebrow{color:#c084fc;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800}
h1{margin:10px 0 8px;font-size:24px;line-height:1.15}p{color:#cbd5e1;line-height:1.5;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric{border:1px solid rgba(148,163,184,.2);border-radius:14px;padding:12px;background:rgba(255,255,255,.045)}.label{color:#94a3b8;font-size:12px}.value{margin-top:5px;font-size:18px;font-weight:800}.notice{margin-top:14px;border-radius:14px;padding:12px;color:#fde68a;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);font-size:13px}
</style>
</head>
<body>
<div class="card">
<div class="eyebrow">AuthorityPrompt Verified Truth</div>
<h1 id="title">Company trust card</h1>
<p>Verified company truth, confidence, conflicts, and response readiness for AI systems.</p>
<div class="grid">
<div class="metric"><div class="label">Domain</div><div class="value" id="domain">unknown</div></div>
<div class="metric"><div class="label">Profile</div><div class="value">available</div></div>
<div class="metric"><div class="label">Confidence</div><div class="value" id="confidence">available</div></div>
<div class="metric"><div class="label">Conflicts</div><div class="value" id="conflicts">available</div></div>
</div>
<div class="notice">Crawler access or MCP access does not prove model citation. Use verified facts and source policy before making claims.</div>
</div>
<script>
const data=window.openai?.toolOutput||window.openai?.response||{};
const result=data.result||data;
const domain=result.domain||"unknown";
document.getElementById("domain").textContent=domain;
document.getElementById("title").textContent=domain+" trust card";
const confidence=result.confidence||{};
const conflicts=result.conflicts||{};
document.getElementById("confidence").textContent=confidence.confidence_grade||confidence.grade||confidence.overall_confidence||"available";
document.getElementById("conflicts").textContent=conflicts.overall_conflict_status||conflicts.status||"available";
</script>
</body>
</html>`;
}
