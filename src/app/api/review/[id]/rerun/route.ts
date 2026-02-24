import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewChart } from "@/lib/anthropic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Delete existing findings
  await prisma.finding.deleteMany({ where: { reviewId: id } });

  // Mark as processing
  await prisma.review.update({
    where: { id },
    data: { status: "processing" },
  });

  try {
    const { parsed, rawResponse } = await reviewChart(
      review.pdfText,
      review.grammarLevel
    );

    const updated = await prisma.review.update({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    await prisma.review.update({
      where: { id },
      data: {
        status: "error",
        rawResponse:
          error instanceof Error ? error.message : "Unknown API error",
      },
    });

    return NextResponse.json(
      { error: "Re-run failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 502 }
    );
  }
}
