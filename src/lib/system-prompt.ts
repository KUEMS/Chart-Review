import fs from "fs";
import path from "path";

let cachedPrompt: string | null = null;

export function buildSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt;

  const templatePath = path.join(process.cwd(), "docs", "SYSTEM_PROMPT.md");
  const template = fs.readFileSync(templatePath, "utf-8");

  // Extract content between the ``` code fences in the markdown
  const match = template.match(/```[\r\n]+([\s\S]*?)```/);
  if (!match) {
    throw new Error("Could not parse system prompt template from SYSTEM_PROMPT.md");
  }

  let prompt = match[1];

  // Load and inject approved abbreviations
  const abbrPath = path.join(
    process.cwd(),
    "reference",
    "approved_abbreviations.json"
  );
  const abbreviations = JSON.parse(fs.readFileSync(abbrPath, "utf-8"));
  const abbrList = abbreviations.approved.join(", ");
  prompt = prompt.replace("{{APPROVED_ABBREVIATIONS}}", abbrList);

  cachedPrompt = prompt;
  return prompt;
}
