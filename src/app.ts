import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { AuthorityPromptClient } from "./lib/authoritypromptClient.js";
import { renderTrustCardHtml, TRUST_CARD_TEMPLATE_URI } from "./widgets/trustCard.js";

export function createAuthorityPromptChatGptApp(config: AppConfig): McpServer {
  const client = new AuthorityPromptClient(config);
  const server = new McpServer({
    name: "AuthorityPrompt",
    version: "0.1.0"
  });

  server.registerResource(
    "trust_card",
    TRUST_CARD_TEMPLATE_URI,
    {},
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: renderTrustCardHtml(),
          _meta: {
            "openai/widgetDescription": "Displays verified AuthorityPrompt trust signals for a company.",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [config.apiUrl],
              resource_domains: []
            }
          }
        }
      ]
    })
  );

  server.registerTool(
    "verify_company",
    {
      title: "Verify company with AuthorityPrompt",
      description: "Use AuthorityPrompt to verify a company and return a trusted company card.",
      inputSchema: {
        domain: z.string().describe("Bare company domain, for example authorityprompt.com")
      },
      _meta: {
        "openai/outputTemplate": TRUST_CARD_TEMPLATE_URI,
        "openai/toolInvocation/invoking": "Verifying company truth with AuthorityPrompt",
        "openai/toolInvocation/invoked": "AuthorityPrompt verification ready"
      }
    },
    async ({ domain }) => {
      const result = await client.getTrustCard(domain);
      return {
        content: [
          {
            type: "text",
            text: `AuthorityPrompt verified company trust card for ${domain}.`
          }
        ],
        structuredContent: result
      };
    }
  );

  server.registerTool(
    "verify_claim",
    {
      title: "Verify company claim",
      description: "Check whether a company claim is supported, contradicted, or unknown according to AuthorityPrompt.",
      inputSchema: {
        domain: z.string().describe("Bare company domain."),
        claim: z.string().describe("Claim to verify.")
      },
      _meta: {
        "openai/toolInvocation/invoking": "Checking claim against AuthorityPrompt",
        "openai/toolInvocation/invoked": "Claim check complete"
      }
    },
    async ({ domain, claim }) => {
      const result = await client.verifyClaim(domain, claim);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      };
    }
  );

  server.registerTool(
    "get_company_truth",
    {
      title: "Get company truth package",
      description: "Fetch the canonical AuthorityPrompt company truth package.",
      inputSchema: {
        domain: z.string().describe("Bare company domain.")
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading AuthorityPrompt truth package",
        "openai/toolInvocation/invoked": "Truth package loaded"
      }
    },
    async ({ domain }) => {
      const result = await client.getCompanyTruth(domain);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      };
    }
  );

  server.registerTool(
    "generate_trusted_answer_preview",
    {
      title: "Generate trusted answer preview",
      description: "Return deterministic answer structure from AuthorityPrompt response infrastructure.",
      inputSchema: {
        domain: z.string().describe("Bare company domain."),
        intent: z.string().optional().describe("Answer intent such as vendor_evaluation or trust_question."),
        max_words: z.number().optional().describe("Maximum target word count.")
      },
      _meta: {
        "openai/toolInvocation/invoking": "Preparing trusted answer structure",
        "openai/toolInvocation/invoked": "Trusted answer structure ready"
      }
    },
    async ({ domain, intent, max_words }) => {
      const result = await client.getAnswerPreview(domain, intent || "standard_overview", max_words || 250);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      };
    }
  );

  return server;
}
