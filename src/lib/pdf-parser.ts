import type { PdfExtractionResult } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function extractPdfText(
  buffer: Buffer
): Promise<PdfExtractionResult> {
  const data = await pdfParse(buffer);

  if (!data.text || data.text.trim().length < 100) {
    throw new Error(
      "Could not extract text from this PDF. Ensure it is a text-based PDF export, not a scanned image."
    );
  }

  return {
    text: data.text,
    pageCount: data.numpages,
  };
}
