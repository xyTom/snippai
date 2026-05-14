import { describe, expect, it } from "vitest";
import { parseAutoResponse } from "./auto-response";

describe("parseAutoResponse", () => {
  it("normalizes fenced JSON candidates", () => {
    const parsed = parseAutoResponse(`\`\`\`json
{
  "primaryAction": "Text",
  "candidates": [
    {
      "rank": 2,
      "action": "Code",
      "confidence": 0.7,
      "reason": "code-like",
      "result": "console.log('x')"
    },
    {
      "rank": 1,
      "action": "Text",
      "confidence": 1.2,
      "reason": "visible text",
      "result": "hello"
    }
  ]
}
\`\`\``);

    expect(parsed?.primaryAction).toBe("Text");
    expect(parsed?.candidates.map((candidate) => candidate.action)).toEqual([
      "Text",
      "Code",
    ]);
    expect(parsed?.candidates[0].confidence).toBe(1);
  });

  it("returns null for malformed or empty candidates", () => {
    expect(parseAutoResponse("plain text")).toBeNull();
    expect(parseAutoResponse({ candidates: [{ action: "Unknown" }] })).toBeNull();
  });
});
