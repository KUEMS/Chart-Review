import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const batchJob = await prisma.batchJob.findUnique({
    where: { id },
  });

  if (!batchJob) {
    return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { batchJobId: id },
    select: {
      id: true,
      pdfFilename: true,
      status: true,
      criticalCount: true,
      flagCount: true,
      suggestionCount: true,
    },
  });

  return NextResponse.json({ ...batchJob, reviews });
}
