export const TRUST_CARD_TEMPLATE_URI = "ui://authorityprompt/trust-card.html";

export function renderTrustCardHtml(): string {
  return String.raw`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #080711;
        color: #f8fafc;
      }
      body {
        margin: 0;
        padding: 18px;
        background:
          radial-gradient(circle at 10% 0%, rgba(124, 58, 237, 0.35), transparent 36%),
          linear-gradient(135deg, #080711 0%, #141022 100%);
      }
      .card {
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 20px;
        padding: 18px;
        background: rgba(15, 12, 28, 0.86);
        box-shadow: 0 22px 80px rgba(0, 0, 0, 0.32);
      }
      .eyebrow {
        color: #c084fc;
        font-size: 12px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-weight: 800;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 24px;
        line-height: 1.15;
      }
      p {
        color: #cbd5e1;
        line-height: 1.5;
        margin: 0 0 14px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .metric {
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 14px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.045);
      }
      .label {
        color: #94a3b8;
        font-size: 12px;
      }
      .value {
        margin-top: 5px;
        font-size: 18px;
        font-weight: 800;
      }
      .notice {
        margin-top: 14px;
        border-radius: 14px;
        padding: 12px;
        color: #fde68a;
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.25);
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="eyebrow">AuthorityPrompt Verified Truth</div>
      <h1 id="title">Company trust card</h1>
      <p id="summary">Verified company truth, confidence, conflicts, and response readiness for AI systems.</p>
      <div class="grid">
        <div class="metric">
          <div class="label">Domain</div>
          <div class="value" id="domain">unknown</div>
        </div>
        <div class="metric">
          <div class="label">Profile</div>
          <div class="value" id="profile">available</div>
        </div>
        <div class="metric">
          <div class="label">Confidence</div>
          <div class="value" id="confidence">check data</div>
        </div>
        <div class="metric">
          <div class="label">Conflicts</div>
          <div class="value" id="conflicts">check data</div>
        </div>
      </div>
      <div class="notice">Crawler access or MCP access does not prove model citation. Use verified facts and source policy before making claims.</div>
    </div>
    <script>
      const data = window.openai?.toolOutput || window.openai?.response || {};
      const result = data.result || data;
      const domain = result.domain || "unknown";
      document.getElementById("domain").textContent = domain;
      document.getElementById("title").textContent = domain + " trust card";
      const confidence = result.confidence || {};
      const conflicts = result.conflicts || {};
      document.getElementById("confidence").textContent =
        confidence.confidence_grade || confidence.grade || confidence.overall_confidence || "available";
      document.getElementById("conflicts").textContent =
        conflicts.overall_conflict_status || conflicts.status || "available";
    </script>
  </body>
</html>`;
}
