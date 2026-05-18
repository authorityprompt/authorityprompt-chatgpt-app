import { describe, expect, it } from "vitest";
import { loadConfig, validateDomain } from "./config.js";

describe("config", () => {
  it("loads defaults", () => {
    const config = loadConfig({});
    expect(config.apiUrl).toBe("https://authorityprompt.com");
    expect(config.defaultDomain).toBe("authorityprompt.com");
  });

  it("validates bare domains", () => {
    expect(validateDomain("AuthorityPrompt.com")).toBe("authorityprompt.com");
    expect(() => validateDomain("https://authorityprompt.com")).toThrow();
    expect(() => validateDomain("authorityprompt.com/path")).toThrow();
  });
});
