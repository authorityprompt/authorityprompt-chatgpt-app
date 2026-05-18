import { fetch } from "undici";
import type { AppConfig } from "../config.js";
import { validateDomain } from "../config.js";
import { TTLCache } from "./cache.js";

type JsonPayload = Record<string, unknown> | unknown[];

export class AuthorityPromptClient {
  private readonly cache: TTLCache<JsonPayload | string>;

  constructor(private readonly config: AppConfig) {
    this.cache = new TTLCache<JsonPayload | string>(config.cacheTtlSeconds * 1000);
  }

  async getCompanyTruth(domain: string): Promise<Record<string, unknown>> {
    const safeDomain = validateDomain(domain);
    const [profile, facts, sources, conflicts, confidence, provenance, answerBlocks, instructions] = await Promise.all([
      this.getJson(safeDomain, "manifest.json"),
      this.getJson(safeDomain, "facts.json"),
      this.getJson(safeDomain, "sources.json"),
      this.getJson(safeDomain, "conflicts.json"),
      this.getJson(safeDomain, "confidence.json"),
      this.getJson(safeDomain, "provenance.json"),
      this.getJson(safeDomain, "answer-blocks.json"),
      this.getText(safeDomain, "llm-instructions.txt")
    ]);
    return {
      domain: safeDomain,
      profile,
      facts,
      sources,
      conflicts,
      confidence,
      provenance,
      answer_blocks: answerBlocks,
      llm_instructions: instructions
    };
  }

  async verifyClaim(domain: string, claim: string): Promise<Record<string, unknown>> {
    const safeDomain = validateDomain(domain);
    const response = await this.fetchWithTimeout(`${this.config.apiUrl}/mcp/call`, {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify({
        tool: "verify_claim",
        arguments: { domain: safeDomain, claim }
      })
    });
    if (response.ok) return response.json() as Promise<Record<string, unknown>>;
    return this.localFallbackVerify(safeDomain, claim, response.status);
  }

  async getTrustCard(domain: string): Promise<Record<string, unknown>> {
    const safeDomain = validateDomain(domain);
    const [profile, confidence, conflicts, quality] = await Promise.all([
      this.getJson(safeDomain, "manifest.json"),
      this.getJson(safeDomain, "confidence.json"),
      this.getJson(safeDomain, "conflicts.json"),
      this.getJson(safeDomain, "response-quality.json").catch(() => null)
    ]);
    return {
      domain: safeDomain,
      profile_url: `${this.config.apiUrl}/company/${safeDomain}`,
      profile,
      confidence,
      conflicts,
      response_quality: quality
    };
  }

  async getAnswerPreview(domain: string, intent = "standard_overview", maxWords = 250): Promise<Record<string, unknown>> {
    const safeDomain = validateDomain(domain);
    const response = await this.fetchWithTimeout(`${this.config.apiUrl}/mcp/call`, {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify({
        tool: "generate_recommended_answer",
        arguments: { domain: safeDomain, intent, max_words: maxWords }
      })
    });
    if (response.ok) return response.json() as Promise<Record<string, unknown>>;
    return {
      tool: "generate_recommended_answer",
      status: "ok",
      result: {
        domain: safeDomain,
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
        warnings: [`Hosted /mcp/call returned ${response.status}; local fallback used.`],
        must_not_include: ["unverified pricing", "unverified funding", "unsupported customer claims"]
      }
    };
  }

  private async localFallbackVerify(domain: string, claim: string, statusCode: number): Promise<Record<string, unknown>> {
    const facts = await this.getJson(domain, "facts.json").catch(() => null);
    const factText = JSON.stringify(facts || "").toLowerCase();
    const normalizedClaim = claim.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const words = normalizedClaim.split(" ").filter((word) => word.length > 3);
    const overlap = words.filter((word) => factText.includes(word)).length;
    return {
      tool: "verify_claim",
      status: "ok",
      result: {
        claim,
        verdict: overlap >= 4 ? "partially_supported" : "unknown",
        confidence: overlap >= 4 ? 0.55 : 0,
        verifier: "chatgpt_app_local_fallback",
        note: `Hosted /mcp/call returned ${statusCode}; public facts fallback used.`
      }
    };
  }

  private async getJson(domain: string, path: string): Promise<JsonPayload> {
    return this.getArtifact(domain, path, false) as Promise<JsonPayload>;
  }

  private async getText(domain: string, path: string): Promise<string> {
    return this.getArtifact(domain, path, true) as Promise<string>;
  }

  private async getArtifact(domain: string, path: string, text: boolean): Promise<JsonPayload | string> {
    const key = `${domain}:${path}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const response = await this.fetchWithTimeout(`${this.config.apiUrl}/company/${domain}/${path}`, {
      method: "GET",
      headers: this.headers()
    });
    if (!response.ok) throw new Error(`AuthorityPrompt API returned ${response.status} for ${path}`);
    const payload = text ? await response.text() : await response.json() as JsonPayload;
    this.cache.set(key, payload);
    return payload;
  }

  private headers(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "AuthorityPrompt-ChatGPT-App/0.1.0",
      "X-AP-Client": "chatgpt-app",
      "X-AP-MCP-Version": "0.1.0"
    };
    if (contentType) headers["Content-Type"] = contentType;
    return headers;
  }

  private async fetchWithTimeout(url: string, init: Parameters<typeof fetch>[1]): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal }) as unknown as Response;
    } finally {
      clearTimeout(timer);
    }
  }
}
