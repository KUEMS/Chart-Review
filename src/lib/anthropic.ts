import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./system-prompt";
import { parseReviewResponse } from "./review-parser";
import type { ReviewResponse } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function reviewChart(
  pdfText: string,
  grammarLevel: number
): Promise<{ parsed: ReviewResponse; rawResponse: string }> {
  const systemPrompt = buildSystemPrompt();

  const userMessage = `Review the following EMSCharts PCR export. Grammar level: ${grammarLevel}.

Respond ONLY with valid JSON matching the schema defined in your instructions.

CHART CONTENT:
---
${pdfText}
---`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  const rawResponse = textBlock.text;
  const parsed = parseReviewResponse(rawResponse);

  return { parsed, rawResponse };
}
