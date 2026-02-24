import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractPdfText } from "@/lib/pdf-parser";
import { reviewChart } from "@/lib/anthropic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const grammarLevel = parseInt(
      (formData.get("grammarLevel") as string) || "2",
      10
    );
    const chartId = (formData.get("chartId") as string) || null;
    const providerName = (formData.get("providerName") as string) || null;

    if (!file || !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Please upload a valid PDF file" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    if (grammarLevel < 1 || grammarLevel > 3) {
      return NextResponse.json(
        { error: "Grammar level must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Extract PDF text
    const buffer = Buffer.from(await file.arrayBuffer());
    let pdfText: string;
    try {
      const result = await extractPdfText(buffer);
      pdfText = result.text;
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Failed to extract text from PDF",
        },
        { status: 422 }
      );
    }

    // Create review record as processing
    const review = await prisma.review.create({
      data: {
        chartId,
        providerName,
        grammarLevel,
        status: "processing",
        pdfFilename: file.name,
        pdfText,
        reviewerId: userId,
      },
    });

    // Call Claude API
    try {
      const { parsed, rawResponse } = await reviewChart(pdfText, grammarLevel);

      // Save findings
      const updatedReview = await prisma.review.update({
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
        include: { findings: true },
      });

      return NextResponse.json(updatedReview);
    } catch (apiError) {
      // Mark review as error but keep the PDF text for retry
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: "error",
          rawResponse:
            apiError instanceof Error ? apiError.message : "Unknown API error",
        },
      });

      return NextResponse.json(
        {
          error: "Review processing failed",
          reviewId: review.id,
          details:
            apiError instanceof Error ? apiError.message : "Unknown error",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
