import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf-parser";
import { reviewChart } from "@/lib/anthropic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_FILES = 50;
const DELAY_BETWEEN_REQUESTS_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const grammarLevel = parseInt(
      (formData.get("grammarLevel") as string) || "2",
      10
    );

    if (!files.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_FILES} files per batch` },
        { status: 400 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Create batch job
    const batchJob = await prisma.batchJob.create({
      data: {
        totalFiles: files.length,
        grammarLevel,
        reviewerId: userId,
      },
    });

    // Process files sequentially (not parallel, to avoid rate limits)
    const results: { filename: string; reviewId?: string; error?: string }[] = [];

    for (const file of files) {
      if (!file.name.endsWith(".pdf")) {
        results.push({ filename: file.name, error: "Not a PDF file" });
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: { failedFiles: { increment: 1 } },
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({ filename: file.name, error: "File exceeds 10MB limit" });
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: { failedFiles: { increment: 1 } },
        });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { text: pdfText } = await extractPdfText(buffer);

        const review = await prisma.review.create({
          data: {
            grammarLevel,
            status: "processing",
            pdfFilename: file.name,
            pdfText,
            reviewerId: userId,
            batchJobId: batchJob.id,
          },
        });

        const { parsed, rawResponse } = await reviewChart(
          pdfText,
          grammarLevel
        );

        await prisma.review.update({
          where: { id: review.id },
          data: {
            status: "complete",
            rawResponse,
            overallAssessment: parsed.overallAssessment,
            criticalCount: parsed.summary.bySeverity.critical,
            flagCount: parsed.summary.bySeverity.flag,
            suggestionCount: parsed.summary.bySeverity.suggestion,
            findings: {
              create: parsed.findings.map((f) => ({
                severity: f.severity,
                flagType: f.flagType,
                reviewCategory: f.reviewCategory,
                recommendedAction: f.recommendedAction,
                assignTo: f.assignTo,
                flagComment: f.flagComment,
                ruleCitation: f.ruleCitation,
                recommendedCorrection: f.recommendedCorrection,
                providerQuestion: f.providerQuestion,
                questionStatus: f.providerQuestion ? "pending" : null,
              })),
            },
          },
        });

        results.push({ filename: file.name, reviewId: review.id });
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: { completedFiles: { increment: 1 } },
        });
      } catch (e) {
        results.push({
          filename: file.name,
          error: e instanceof Error ? e.message : "Processing failed",
        });
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: { failedFiles: { increment: 1 } },
        });
      }

      // Rate limiting delay between API calls
      await delay(DELAY_BETWEEN_REQUESTS_MS);
    }

    // Mark batch as complete
    await prisma.batchJob.update({
      where: { id: batchJob.id },
      data: { status: "complete" },
    });

    return NextResponse.json({ batchId: batchJob.id, results });
  } catch (error) {
    console.error("Batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
